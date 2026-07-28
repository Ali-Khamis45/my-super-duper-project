import * as THREE from "three";

import { brandAccent, cream, espresso, oklchToCssRgba } from "@/design-system/tokens/colors";
import { createSyncCache } from "@/engine/materials/createSyncCache";

// A `loadTexture(url)` wrapper around THREE.TextureLoader (color-space +
// anisotropy defaults) lived here in an earlier draft but had zero
// consumers — everything this milestone generates textures at runtime
// (below), no image asset is ever loaded from a URL yet. Re-add it
// alongside the first real asset that needs it (see
// docs/3d-asset-pipeline.md), not before — see docs/06_CODING_STANDARDS.md's
// "no half-finished code" rule.

/**
 * A soft radial-gradient alpha sprite, generated at runtime — used by
 * billboarded effects (steam, glow) that need a soft round falloff without
 * shipping an image asset.
 */
export function createRadialGradientTexture(size = 128): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");
  if (!context) return new THREE.CanvasTexture(canvas);

  const gradient = context.createRadialGradient(
    size / 2,
    size / 2,
    0,
    size / 2,
    size / 2,
    size / 2,
  );
  gradient.addColorStop(0, "rgba(255,255,255,0.9)");
  gradient.addColorStop(0.5, "rgba(255,255,255,0.35)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, size, size);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * A generated placeholder brand mark — a monogram badge — for the logo
 * decal. Swapped for a real logo asset per docs/3d-asset-pipeline.md
 * without touching the part that consumes it (ProceduralLogo).
 */
export function createLogoTexture(size = 256): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");
  if (!context) return new THREE.CanvasTexture(canvas);

  const center = size / 2;
  context.clearRect(0, 0, size, size);

  context.beginPath();
  context.arc(center, center, size * 0.46, 0, Math.PI * 2);
  context.fillStyle = oklchToCssRgba(espresso[900], 0.92);
  context.fill();

  context.beginPath();
  context.arc(center, center, size * 0.46, 0, Math.PI * 2);
  context.lineWidth = size * 0.02;
  context.strokeStyle = oklchToCssRgba(brandAccent[500], 0.9);
  context.stroke();

  context.fillStyle = oklchToCssRgba(cream[50], 0.95);
  context.font = `italic 700 ${size * 0.42}px Georgia, "Times New Roman", serif`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText("C", center, center + size * 0.02);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * Logo Decal Pipeline (Sprint 2.3): caches the generated logo texture by
 * size, so a second `ProceduralLogo` mount (a future multi-product gallery)
 * reuses the already-rendered canvas texture instead of re-running the
 * canvas draw calls. A true projected `<Decal>` remains deferred — see
 * docs/3d-asset-pipeline.md's "Known simplifications" — this only avoids
 * redundant *generation* of the current flat-plane badge's texture.
 */
const logoTextureCache = createSyncCache<THREE.CanvasTexture>({ maxEntries: 4 });

export function getOrCreateLogoTexture(size = 256): THREE.CanvasTexture {
  return logoTextureCache.getOrCreate(`logo-${size}`, () => createLogoTexture(size));
}
