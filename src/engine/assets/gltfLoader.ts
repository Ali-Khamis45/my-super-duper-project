import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";

/**
 * Shared, singleton GLTFLoader — constructed once, configured with both
 * geometry decoders per docs/adr/0009-asset-compression-pipeline.md (Draco
 * default, Meshopt reserved for a future high-object-count scene; the
 * loader supports either without per-asset reconfiguration). KTX2Loader
 * attaches lazily via the texture pipeline once a WebGLRenderer exists —
 * not available at module-load time, per the same ADR.
 */
let sharedLoader: GLTFLoader | null = null;

export function getGLTFLoader(): GLTFLoader {
  if (sharedLoader) return sharedLoader;

  const dracoLoader = new DRACOLoader();
  // Self-hosted, not CDN-loaded — see ADR-0009.
  dracoLoader.setDecoderPath("/draco/");

  const loader = new GLTFLoader();
  loader.setDRACOLoader(dracoLoader);
  loader.setMeshoptDecoder(MeshoptDecoder);

  sharedLoader = loader;
  return loader;
}
