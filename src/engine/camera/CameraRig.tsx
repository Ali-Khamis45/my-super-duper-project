import { useFrame, useThree } from "@react-three/fiber";
import { useCallback, useEffect, useRef } from "react";
import type { RefObject } from "react";
import * as THREE from "three";

import { appEvents } from "@/engine/events";
import type { BridgeStore } from "@/engine/state/createBridgeStore";

import { dampVector3 } from "./CameraController";
import { CAMERA_ZOOM_MAX, CAMERA_ZOOM_MIN, resolveCameraPreset, type CameraPresetName } from "./presets";

interface CameraRigProps {
  preset: CameraPresetName;
  /**
   * A ref (not a snapshot prop) to the normalized [-1, 1] pointer position —
   * read imperatively inside useFrame each frame. A plain object prop would
   * go stale: the source (useMouseParallax) deliberately mutates a ref
   * instead of calling setState, so this component never re-renders to
   * deliver a fresh value any other way.
   */
  parallaxSource?: RefObject<{ x: number; y: number }>;
  parallaxStrength?: number;
  /** When false (reduced motion), the camera snaps to the preset once and never drifts. */
  enabled?: boolean;
  /** Damping factor for preset-to-preset transitions — higher settles faster. */
  transitionDamping?: number;
  /**
   * Sprint 3.9 — an optional continuous distance multiplier (1 = the
   * preset's own authored distance; >1 pulls the camera back, <1 moves it
   * closer), read imperatively via `.getValue()` inside useFrame — the same
   * ref-not-prop reasoning `parallaxSource` above already documents: zoom
   * changes on every wheel/pinch tick, far too often to re-render this
   * component for. `undefined` for every route that doesn't pass one (every
   * pre-Sprint-3.9 caller), so zoom is pinned at 1 and camera position/fov
   * behave byte-for-byte as before. Clamped to [CAMERA_ZOOM_MIN, CAMERA_ZOOM_MAX].
   */
  zoomSource?: BridgeStore<number>;
}

/** How close (scene units / degrees) counts as "arrived" for emitting camera:transition-complete. */
const TRANSITION_SETTLE_EPSILON = 0.01;

/** Scales `base`'s offset from `lookAt` by `zoom`, writing into `out` — preserves the preset's authored angle/height ratio at any zoom level, rather than a flat scale-in-place. */
function applyZoom(out: THREE.Vector3, base: THREE.Vector3, lookAt: THREE.Vector3, zoom: number) {
  out.copy(base).sub(lookAt).multiplyScalar(zoom).add(lookAt);
}

export function CameraRig({
  preset,
  parallaxSource,
  parallaxStrength = 0.3,
  enabled = true,
  transitionDamping = 6,
  zoomSource,
}: CameraRigProps) {
  const { camera } = useThree();
  const config = resolveCameraPreset(preset);
  const target = useRef(new THREE.Vector3(...config.position));
  const lookAtTarget = useRef(new THREE.Vector3(...config.lookAt));
  const presetBasePosition = useRef(new THREE.Vector3(...config.position));
  /** `presetBasePosition` scaled by the current zoom — what "arrived" is measured against, and what parallax is applied on top of. */
  const zoomedBasePosition = useRef(new THREE.Vector3(...config.position));
  const hasMounted = useRef(false);
  const previousPreset = useRef<CameraPresetName | null>(null);
  const isTransitioning = useRef(false);

  const readZoom = useCallback(
    () => THREE.MathUtils.clamp(zoomSource?.getValue() ?? 1, CAMERA_ZOOM_MIN, CAMERA_ZOOM_MAX),
    [zoomSource],
  );

  useEffect(() => {
    lookAtTarget.current.set(...config.lookAt);
    presetBasePosition.current.set(...config.position);

    if (!hasMounted.current) {
      // First mount only: snap instantly rather than flying in from Three's
      // default camera state — CupCanvas already seeds the Canvas's initial
      // camera position/fov to match, so this is a no-op in the hero's case
      // and a real guard for any future scene that doesn't pre-seed it.
      // Honors the initial zoom (if any) immediately too, so a route that
      // starts zoomed out (Sprint 3.9's "cup should appear smaller
      // initially") never flashes at zoom=1 for one frame first.
      applyZoom(zoomedBasePosition.current, presetBasePosition.current, lookAtTarget.current, readZoom());
      camera.position.copy(zoomedBasePosition.current);
      if (camera instanceof THREE.PerspectiveCamera) {
        camera.fov = config.fov;
        camera.updateProjectionMatrix();
      }
      camera.lookAt(...config.lookAt);
      hasMounted.current = true;
      previousPreset.current = preset;
      return;
    }

    if (previousPreset.current !== preset) {
      const fromPreset = previousPreset.current;
      previousPreset.current = preset;

      if (!enabled) {
        // Reduced motion: "disable outright", not "downgrade" — a preset
        // change still needs to actually move the camera, just as an
        // instant cut rather than a smooth interpolation. Without this
        // branch, a preset change while `enabled={false}` would silently do
        // nothing: useFrame (below) returns before ever applying it.
        applyZoom(zoomedBasePosition.current, presetBasePosition.current, lookAtTarget.current, readZoom());
        camera.position.copy(zoomedBasePosition.current);
        if (camera instanceof THREE.PerspectiveCamera) {
          camera.fov = config.fov;
          camera.updateProjectionMatrix();
        }
        camera.lookAt(...config.lookAt);
        appEvents.emit({ name: "camera:transition-start", from: fromPreset, to: preset });
        appEvents.emit({ name: "camera:transition-complete", preset });
        return;
      }

      isTransitioning.current = true;
      appEvents.emit({ name: "camera:transition-start", from: fromPreset, to: preset });
    }
  }, [camera, config, preset, enabled, readZoom]);

  useFrame((_state, delta) => {
    if (!enabled) return;

    applyZoom(zoomedBasePosition.current, presetBasePosition.current, lookAtTarget.current, readZoom());

    const pointer = parallaxSource?.current;
    const offsetX = pointer ? pointer.x * parallaxStrength : 0;
    const offsetY = pointer ? pointer.y * parallaxStrength : 0;
    target.current.set(
      zoomedBasePosition.current.x + offsetX,
      zoomedBasePosition.current.y + offsetY,
      zoomedBasePosition.current.z,
    );
    dampVector3(camera.position, target.current, transitionDamping, delta);
    camera.lookAt(lookAtTarget.current);

    if (camera instanceof THREE.PerspectiveCamera) {
      camera.fov = THREE.MathUtils.damp(camera.fov, config.fov, transitionDamping, delta);
      camera.updateProjectionMatrix();
    }

    if (isTransitioning.current) {
      // Settled distance is measured against the zoomed base position, not
      // `target.current` — that includes the continuous parallax offset,
      // which would never let a moving pointer count as "arrived".
      const settled = camera.position.distanceTo(zoomedBasePosition.current) < TRANSITION_SETTLE_EPSILON;
      if (settled) {
        isTransitioning.current = false;
        appEvents.emit({ name: "camera:transition-complete", preset });
      }
    }
  });

  return null;
}
