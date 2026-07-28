/**
 * Centralizes asset key -> {path, version} so cache-busting is a version
 * bump, not filename churn — see docs/3d-asset-pipeline.md. Empty this
 * sprint: no real GLB/texture/HDR asset exists in the repo yet. The
 * mechanism is real and tested; populating it is a Sprint 2.2+ non-event —
 * one call per real asset, whenever one is actually commissioned.
 */
export interface AssetManifestEntry {
  path: string;
  version: string;
}

const manifest = new Map<string, AssetManifestEntry>();

export function registerAsset(key: string, entry: AssetManifestEntry): void {
  manifest.set(key, entry);
}

export function resolveAsset(key: string): AssetManifestEntry {
  const entry = manifest.get(key);
  if (!entry) {
    throw new Error(`Asset "${key}" is not registered in the manifest.`);
  }
  return entry;
}

/** The versioned URL a loader actually requests — a query-string cache-buster derived from the manifest version, not the filename. */
export function resolveAssetUrl(key: string): string {
  const entry = resolveAsset(key);
  return `${entry.path}?v=${entry.version}`;
}
