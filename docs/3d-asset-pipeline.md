# 3D Asset Pipeline

## Current state: fully procedural, and why

Every cup part — cup, sleeve, coffee, foam, lid, logo, steam, shadow — is generated from Three.js primitives/parametric geometry (`features/hero-cup/geometry/`) rather than loaded from a modeled asset. This isn't a shortcut: each part is architected exactly as a production GLB-backed part would be — implementing `CupPartProps`, resolved through the registry — so swapping to a real asset later touches one registry entry, nothing else. See [ADR-0002](adr/0002-r3f-architecture.md).

Procedural-first was the right call for Milestone 1 because no real asset pipeline existed yet. That's no longer true of the *pipeline* — Sprint 2.2 built and tested the real GLB/texture loading machinery (`engine/assets/`, see [03_3D_ENGINE.md](03_3D_ENGINE.md)'s Current State) — but it's still true of the *assets*: **zero real `.glb`/texture/HDR files exist anywhere in `public/`**, so every cup part is still procedural today. Everything below this line describes what the pipeline actually does (marked "implemented") versus what's still target design pending a real asset to load (marked "target").

## Future asset sourcing

Two paths, chosen per part based on how bespoke it needs to be:

- **Custom-modeled** (Blender, or commissioned) — for anything brand-specific: the cup silhouette, the logo, the lid. Worth the cost once the brand's actual product shape is decided (this milestone's procedural silhouette is a placeholder aesthetic, not a final design).
- **CC0-licensed** (Poly Haven, or a Sketchfab asset explicitly filtered to an allowed license) — acceptable for generic environmental/reference geometry, never for anything brand-identifying.

## GLB workflow

- kebab-case file names: `public/models/<part>/<part>.glb`
- glTF-Binary (`.glb`), not separate `.gltf` + `.bin` + textures — one file, one network request.
- Y-up, real-world meters, targeting the procedural geometry's existing unit space (the cup's authored height is ~1.6 units) so a swapped-in model doesn't require re-tuning every camera preset and material scale that was tuned against the procedural version.
- Draco-compressed geometry (see Compression below).
- Draco decoder assets **are self-hosted at `public/draco/`** (implemented, Sprint 2.2 — copied from `three`'s own bundled decoder, not CDN-loaded) — the loader (`engine/assets/gltfLoader.ts`) already points at this path; a Draco-compressed `.glb` would decode correctly today if one existed.

## Texture workflow

- Textures ORM-packed (occlusion/roughness/metalness in one file) — one texture sample instead of three per pixel at render time, one file instead of three over the network.
- Capped at 2K (2048×2048) — the cup is a hero object viewed at moderate screen coverage, not a full-screen macro shot; 4K textures would be pure waste here.
- **KTX2/Basis Universal** for anything shipped to production, not raw PNG/JPG — GPU-compressed formats decode directly to GPU memory (no CPU-side decompress-then-upload step) and are dramatically smaller both on disk and in VRAM. **Implemented, Sprint 2.2**: `engine/assets/textures.ts` lazily constructs a `KTX2Loader` the first time a `.ktx2` texture is actually requested, transcoder self-hosted at `public/basis/`. Plain PNG/JPG/AVIF route through `THREE.TextureLoader` — no format-specific code needed for AVIF, the browser's own image decoder handles format sniffing the same as any other raster format.
- Canvas-generated runtime textures (the current logo badge, steam gradient) stay exactly as they are — they're procedural, not files, so none of the above applies until they're replaced by real image assets.

## HDR workflow

Every theme uses a drei-hosted preset today (`environmentPreset: "studio" | "night"`, resolved through `engine/environment/presets.ts`'s `resolveEnvironmentPreset` — moved here from the deleted `HDRManager.ts` during Sprint 2.1's Environment/Lighting split) — zero local assets, zero HDR-specific pipeline work yet. When a self-hosted HDR is needed (a bespoke environment mood a drei preset can't provide):

- `.hdr` (Radiance) or pre-converted `.exr`, stored under `public/hdri/<name>.hdr`.
- Pre-filtered/mipmapped at build time where possible rather than at runtime (`PMREMGenerator` runtime cost is real; drei's `<Environment>` already handles this, but a custom loading path should too).
- `EnvironmentPresetDefinition`'s `source: { type: "file"; path }` variant already exists for exactly this case — the seam exists, it's just never been exercised. Swapping a preset for a self-hosted file is a one-line change at the call site, not a new mechanism.
- **No custom HDR loader was built in Sprint 2.2**, a deliberate scope decision, not a gap: drei's `<Environment files={...}>` already lazy-loads HDR files internally — building a second loader through the new Asset Platform (`engine/assets/`) would duplicate a mechanism that already works, not add real capability. What the Asset Platform *does* contribute is `engine/performance/assetQuality.ts`'s tier-aware options (`resolveAssetQualityOptions`), ready for a future self-hosted HDR to consult for resolution/quality once one exists.

## Audio workflow

No audio exists yet — `audio/` is a documented future module ([01_ARCHITECTURE.md](01_ARCHITECTURE.md)'s "Future modules"), arriving with the first milestone that needs a real sound (ingredient-drop, checkout success). When it lands:

- Compressed, web-appropriate formats only — `.mp3` or `.ogg`, never uncompressed `.wav` shipped to production.
- Short one-shot sounds (UI feedback, ingredient drop) preloaded eagerly, since they need to fire with zero perceptible latency on interaction.
- Any looping ambient layer (`Ambient.ts`'s eventual job) streamed, not preloaded — it's not needed before the user has been on the page for a while, and preloading it would compete with more urgent above-the-fold assets.
- Respects a "reduced audio" preference (already noted as an `AudioManager` requirement in `01_ARCHITECTURE.md`) — muted by default is the safer starting posture for an autoplaying experience; explicit opt-in for ambient sound, exactly like reduced-motion's "disable outright, don't downgrade" policy applied to a different sense.

## Compression: Draco vs. Meshopt vs. KTX2 — when to use which

Three different compression concerns, not three names for the same thing:

| Format | Compresses | Trade-off |
|---|---|---|
| **Draco** | Geometry (vertex positions/normals/UVs) | Best compression ratio for complex, high-poly meshes; decode cost is real but happens once at load, off the main thread if configured with a worker. Default choice for any modeled asset. |
| **Meshopt** | Geometry, differently | Faster to decode than Draco, slightly worse compression ratio; better fit for *many small assets* (e.g., a future ingredient system with dozens of small particle/object meshes) where aggregate decode time matters more than any single asset's file size. |
| **KTX2 / Basis Universal** | Textures | The texture-side equivalent of the above two — GPU-native compressed format, decodes straight to VRAM. Always paired with geometry compression, never a substitute for it (they compress different things). |

Default policy: **Draco for the cup and any other single, detailed hero model; Meshopt reserved for a future high-object-count scene (ingredients) if and when profiling shows Draco's per-asset decode overhead adding up; KTX2 for every texture, no exceptions, once real image textures exist.** **Implemented, Sprint 2.2**: both geometry decoders (`DRACOLoader`, `MeshoptDecoder`) are configured once in `engine/assets/gltfLoader.ts`'s shared `GLTFLoader` instance — an asset picks its compression at export time; the loader supports either without per-asset loader setup. Meshopt is configured but not yet exercised by any real asset, matching its documented "reserved" status.

## Versioning & caching

- **Versioning — implemented, Sprint 2.2**: `engine/assets/manifest.ts` maps an asset key to `{ path, version }` (`registerAsset`/`resolveAsset`/`resolveAssetUrl`), empty until a real asset is committed. A version bump (not a filename change) is how cache invalidation happens — `cup-v2.glb` style filename churn means old versions accumulate in `public/models/` forever; `resolveAssetUrl`'s query-string suffix doesn't.
- **Caching, two layers**: (1) HTTP/browser cache, via standard long-lived `Cache-Control` headers on `public/` assets (Next.js's static asset serving already does this correctly by default) plus the version-in-URL busting scheme above so a new version is never served stale. (2) **Implemented, Sprint 2.2**: `engine/assets/createResourceManager.ts`'s in-memory, LRU-capped cache (24 entries for textures, 8 for GLBs) so a second request for the same resolved asset within a session reuses the already-parsed `GLTF`/`THREE.Texture` object, not just the cached HTTP response — parsing/GPU-upload is the expensive part, not the network fetch. (Material-level caching — compiled `THREE.Material` instances, a different layer — is still Sprint 2.3.)

## Lazy loading & streaming

- **Implemented, Sprint 2.2**: `preloadModel(key)`/`preloadTexture(key)` are the fire-and-forget streaming primitives — called eagerly so an asset is in flight before the component that needs it renders, the same principle the current `CupCanvasLoader`'s dynamic import already applies at the JS-bundle level, extended to the asset level. Failures during a preload are logged, not thrown at the call site.
- Everything else loads on demand via `loadModel`/`loadTexture`, inside a `<Suspense>` boundary with a real fallback (never a bare spinner — matching this project's existing `CupStaticFallback` precedent for the JS-bundle boundary) once a real component consumes them.
- **Predictive streaming** (loading only the current narrative beat's or customizer option's assets, prefetching the next likely one) is still target design — no real multi-asset scene exists yet to make the prefetch *ordering* decision meaningful. The primitive (`preload`) is real; the policy of *what* to preload *when* is Milestone 5/6 work.

## Fallback assets

Two distinct fallback scenarios:

1. **The asset doesn't exist yet** (current state, every part) — the registry's `procedural` implementation *is* the fallback, and it's not a degraded one; see the top of this doc. `resolveCupPart` defaults to `"procedural"` until a caller explicitly asks for `"model"`.
2. **The asset exists but fails to load at runtime** (network failure, 404, timeout) — **implemented, Sprint 2.2**: `loadModel`/`loadTexture` never throw to their caller. A failure or timeout resolves to `{ status: "fallback", reason }`; a future `ModelX` component checks this and renders the registry's `procedural` implementation for that same part name instead of an empty gap — the registry already has both implementations sitting right next to each other, so the fallback is a lookup once a real `ModelX` component exists to make it. Verified against mocked loaders (`glb.test.ts`, `textures.test.ts`), not a real network failure, since there's no real asset to fail loading yet.

## The mesh-swap contract

This is the entire point of the registry pattern — `features/hero-cup/registry/cupPartRegistry.ts` (now built on the generalized `engine/registry/createPartRegistry.ts`, see [03_3D_ENGINE.md](03_3D_ENGINE.md)). Today:

```ts
const cupPartRegistry = createPartRegistry<CupPartName, CupPartProps>();
cupPartRegistry.register("cup", "procedural", ProceduralCup);
// ...
```

Adding a real model would be one new `.register()` call and one new file — nothing else in the codebase changes. This would also be the first real caller of Sprint 2.2's `loadModel`, which today has no production consumer:

```ts
// features/hero-cup/parts/model/ModelCup.tsx (not built — no real .glb exists)
export const ModelCup = forwardRef<Group, CupPartProps>(function ModelCup(props, ref) {
  const [gltf, setGltf] = useState<GLTF | null>(null);
  useEffect(() => {
    loadModel("cup").then((result) => {
      if (result.status === "loaded") setGltf(result.gltf);
      // "fallback" needs no handling here — the registry never resolves to
      // ModelCup in the first place unless "model" was explicitly requested;
      // a runtime failure after that point is what this state would surface.
    });
  }, []);
  if (!gltf) return null;
  return <primitive ref={ref} object={gltf.scene} {...props} />;
});

// registry/cupPartRegistry.ts
cupPartRegistry.register("cup", "model", ModelCup);
```

`CupAssembly` never changes — it only ever calls `resolveCupPart(name)`, which defaults to `"procedural"` until a caller explicitly asks for `"model"`.

**Materials come from the engine, not the GLB** (confirmed during the [Architecture Freeze](15_ARCHITECTURE_FREEZE.md)'s "Replacing Procedural Cup with Production GLB Assets" scenario): a production GLB should ship geometry + UVs only. `ModelCup` assigns materials via `MaterialFactory` at runtime — the same factory `ProceduralCup` already uses — rather than using whatever material the GLB export baked in. This keeps color in one source of truth (the OKLCH design tokens) instead of needing a second, GLB-authored palette to stay in sync with the first every time a token changes.

## Known simplifications to revisit when real assets arrive

- **Logo**: currently a flat oriented plane against the cup wall, not a true projected decal (drei's `<Decal>` would require nesting inside `ProceduralCup`'s mesh, coupling two "independent" registry parts). A real, UV-mapped cup mesh removes this constraint — `ModelCup` can expose UVs a real logo texture maps onto directly.
- **Steam**: billboarded planes with a generated radial-gradient texture, not a shader/particle simulation — the explicit Milestone 2 seam, documented in [13_SHADER_ARCHITECTURE.md](13_SHADER_ARCHITECTURE.md).

## Related

[03_3D_ENGINE.md](03_3D_ENGINE.md) · [reviews/sprint-2.2-review.md](reviews/sprint-2.2-review.md) · [15_ARCHITECTURE_FREEZE.md](15_ARCHITECTURE_FREEZE.md) · [13_SHADER_ARCHITECTURE.md](13_SHADER_ARCHITECTURE.md) · [14_PERFORMANCE_STRATEGY.md](14_PERFORMANCE_STRATEGY.md) · [adr/0002-r3f-architecture.md](adr/0002-r3f-architecture.md) · [adr/0009-asset-compression-pipeline.md](adr/0009-asset-compression-pipeline.md) · [features/hero-cup/README.md](../src/features/hero-cup/README.md)
