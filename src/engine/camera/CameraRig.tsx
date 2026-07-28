import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import type { RefObject } from "react";
import * as THREE from "three";

import { appEvents } from "@/engine/events";

import { dampVector3 } from "./CameraController";
import { resolveCameraPreset, type CameraPresetName } from "./presets";

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
}

/** How close (scene units / degrees) counts as "arrived" for emitting camera:transition-complete. */
const TRANSITION_SETTLE_EPSILON = 0.01;

export function CameraRig({
  preset,
  parallaxSource,
  parallaxStrength = 0.3,
  enabled = true,
  transitionDamping = 6,
}: CameraRigProps) {
  const { camera } = useThree();
  const config = resolveCameraPreset(preset);
  const target = useRef(new THREE.Vector3(...config.position));
  const lookAtTarget = useRef(new THREE.Vector3(...config.lookAt));
  const presetBasePosition = useRef(new THREE.Vector3(...config.position));
  const hasMounted = useRef(false);
  const previousPreset = useRef<CameraPresetName | null>(null);
  const isTransitioning = useRef(false);

  useEffect(() => {
    lookAtTarget.current.set(...config.lookAt);
    presetBasePosition.current.set(...config.position);

    if (!hasMounted.current) {
      // First mount only: snap instantly rather than flying in from Three's
      // default camera state — CupCanvas already seeds the Canvas's initial
      // camera position/fov to match, so this is a no-op in the hero's case
      // and a real guard for any future scene that doesn't pre-seed it.
      camera.position.set(...config.position);
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
        camera.position.set(...config.position);
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
  }, [camera, config, preset, enabled]);

  useFrame((_state, delta) => {
    if (!enabled) return;

    const pointer = parallaxSource?.current;
    const offsetX = pointer ? pointer.x * parallaxStrength : 0;
    const offsetY = pointer ? pointer.y * parallaxStrength : 0;
    target.current.set(config.position[0] + offsetX, config.position[1] + offsetY, config.position[2]);
    dampVector3(camera.position, target.current, transitionDamping, delta);
    camera.lookAt(lookAtTarget.current);

    if (camera instanceof THREE.PerspectiveCamera) {
      camera.fov = THREE.MathUtils.damp(camera.fov, config.fov, transitionDamping, delta);
      camera.updateProjectionMatrix();
    }

    if (isTransitioning.current) {
      // Settled distance is measured against the preset's own base position,
      // not `target.current` — that includes the continuous parallax
      // offset, which would never let a moving pointer count as "arrived".
      const settled = camera.position.distanceTo(presetBasePosition.current) < TRANSITION_SETTLE_EPSILON;
      if (settled) {
        isTransitioning.current = false;
        appEvents.emit({ name: "camera:transition-complete", preset });
      }
    }
  });

  return null;
}
