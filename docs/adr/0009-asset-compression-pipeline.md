# ADR-0009 — Draco as the default geometry compressor, Meshopt reserved for high-object-count scenes, KTX2 for every real texture

**Status**: Accepted

## Context

Real GLB assets (once they exist — see [3d-asset-pipeline.md](../3d-asset-pipeline.md)) need a compression strategy decided before the first asset ships, not discovered ad hoc per file. Three relevant, non-overlapping technologies exist: Draco and Meshopt both compress geometry (different trade-offs), KTX2/Basis Universal compresses textures (a separate concern from either).

## Decision

Draco is the default for geometry — best compression ratio, decode cost paid once at load, correct choice for a small number of detailed hero assets (the cup, and likely any other single showcased product model). Meshopt is reserved, not used by default — faster to decode but a worse compression ratio than Draco, the right trade-off only once a scene has *many* small assets simultaneously (the Milestone 5 ingredient system is the named candidate), where aggregate decode time across many objects matters more than any single object's file size. KTX2/Basis Universal is used for every real texture asset, no exceptions, once real textures exist — GPU-native decode straight to VRAM, no CPU-side decompress-then-upload step, and a meaningfully smaller both-on-disk-and-in-VRAM footprint than any uncompressed format. Both geometry decoders are configured once in the Asset Manager's shared `GLTFLoader` (see [03_3D_ENGINE.md](../03_3D_ENGINE.md)) — an asset's export-time compression choice doesn't require any loader reconfiguration to support.

## Consequences

Gains: a concrete, pre-decided answer for "how do I export this asset" the first time a real GLB is ever added, instead of an ad hoc choice per file; texture VRAM budget ([14_PERFORMANCE_STRATEGY.md](../14_PERFORMANCE_STRATEGY.md)) is only achievable with KTX2, not an optional nice-to-have. Costs: three compression technologies is more surface area to understand than one — accepted because they solve genuinely different problems (two different geometry trade-offs, plus a wholly separate texture concern) and forcing one technology to cover all three would mean a real, measurable regression in at least one case (e.g., Draco-compressing a scene with dozens of small assets, paying its higher per-asset decode cost dozens of times over).
