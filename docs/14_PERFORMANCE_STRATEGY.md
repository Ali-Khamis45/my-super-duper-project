# 14 — Performance Strategy

Concrete performance budgets and the adaptive-quality mechanism that enforces them. [03_3D_ENGINE.md](03_3D_ENGINE.md) names the Performance Manager; this doc is its actual numbers and reasoning. The budget table below was target design through Sprint 2.4; the adaptive quality tiers and stepping algorithm are real, implemented, and verified as of Sprint 2.5 — see [reviews/sprint-2.5-review.md](reviews/sprint-2.5-review.md).

## Budget table

| Budget | Target | Reasoning |
|---|---|---|
| Desktop frame rate | 60 FPS sustained | The stated product-vision bar; a beautiful interaction that drops frames is a broken interaction, not a design nuance |
| Mobile frame rate floor | 30 FPS, protected by adaptive quality | Below 30 FPS reads as broken, not just "less smooth"; the adaptive-quality mechanism exists specifically to never let a session sustain below this |
| GPU memory (textures + geometry, in flight) | < 256 MB | Conservative for budget/mid-range mobile GPUs sharing system memory with the OS and other tabs — some mobile browsers force WebGL context loss well before 512MB |
| Texture memory, hero scene | < 64 MB | An uncompressed 2048×2048 RGBA8 texture alone is ~16.8 MB; ORM-packing (3 maps → 1 texture) and KTX2 compression (typically 4–8× smaller in VRAM than uncompressed) are what make a handful of 2K textures fit comfortably under this — see [3d-asset-pipeline.md](3d-asset-pipeline.md) |
| Geometry, hero object | < 50,000 triangles | Generous headroom for a real GLB cup replacement; the current procedural cup is already far below this (a handful of primitives, low triangle count) |
| Geometry, secondary/decorative object | < 500 triangles each | Ingredient-system-scale objects (Milestone 5) — kept low specifically because there may be many of them simultaneously, and instancing (below) optimizes per-instance cost, not raw vertex count |
| Draw calls per scene | < 100 | Mobile GPU bottlenecks are frequently CPU-side draw-call submission overhead, not raw fragment/vertex throughput — this ceiling matters more than triangle count on the low end. Milestone 1's hero scene sits around 10–15; plenty of headroom before instancing becomes mandatory rather than optional |

## Adaptive quality tiers — implemented, Sprint 2.5

Five tiers (extended from the original 3 — `ultra` and `minimal` added — a sanctioned [17_ZERO_REWRITE_POLICY.md](17_ZERO_REWRITE_POLICY.md) exception since Sprint 2.5's brief named all 5 explicitly), resolved by `engine/performance/qualityPolicy.ts`'s `resolveQualityPolicy(tier)`, stepped by `engine/performance/adaptiveQuality.ts`'s `evaluateAdaptiveQuality(fps)`:

| Tier | DPR cap | Shadow map | Bloom | Environment res. | Max particles |
|---|---|---|---|---|---|
| Ultra | `[1, 2]` | 2048² | Enabled, 110% intensity | 100% | 512 |
| High (default) | `[1, 2]` | 2048² | Enabled, full intensity | 100% | 256 |
| Medium | `[1, 1.5]` | 1024² | Enabled, 75% intensity | 75% | 128 |
| Low | `[1, 1]` | 512² | Enabled, 50% intensity | 50% | 48 |
| Minimal | `[1, 1]` | 256² | **Disabled** — the one exception to "scale, don't disable" below | 50% | 0 |

**"Never disable a feature if it can instead scale"** (this sprint's explicit constraint): every parameter above is a continuous scale across all 5 tiers, with exactly one deliberate exception — `bloomEnabled` only goes `false` at the single most extreme tier (`minimal`). Every other step, in either direction, reads as a graceful fade, not a pop, reinforced by `useSmoothedValue.ts` damping bloom intensity toward its new target (this sprint's Creative Budget item) rather than snapping.

**Trigger — asymmetric hysteresis, not a single symmetric threshold**: stepping *down* is fast (FPS below 45 for 3 consecutive ~500ms samples, ~1.5s) to protect the user quickly. Stepping *up* requires a much longer sustained recovery (10 consecutive samples at/above 55 FPS, ~5s) before it's trusted. This is a deliberate, documented evolution of the original "never auto-step-up mid-session" rule below, not a silent reversal of it — real thrashing avoidance came from asymmetry, not from forbidding recovery outright. Verified in a real headless-Chrome session under 25x CPU throttling: the tier stepped `ultra → high → medium → low → minimal`, one tier at a time, matching `QUALITY_TIER_ORDER`; removing the throttle produced exactly one recovery step in the following 8s window, consistent with the 10-sample/~5s upgrade cadence. See [reviews/sprint-2.5-review.md](reviews/sprint-2.5-review.md) for the full trace.

**A real distinction that matters**: the *visible* dev panel overlay is correctly dev-only (`NODE_ENV !== "production"`, per Milestone 1's stabilization fix). The *underlying FPS sampling* that adaptive quality reads from is not the same thing and must run in production — a session on a struggling device is exactly the session adaptive quality exists to protect, and that's always a production session. `engine/performance/PerformanceSampler.tsx` is that separate, always-mounted instance — Sprint 2.1 built the `tier`/`sampleFrame` foundation but nothing fed it outside the dev-only collector; this sprint closed that gap for real.

**GPU/memory signals, same sprint**: `gpuBudget.ts` compares each sample against the draw-call/triangle budgets above and emits `gpu:budget-warning` on a transition into over-budget; `memoryPressure.ts` derives `memory:pressure` from `resource:evicted` rate plus the `performance:degraded` signal (no reliable cross-browser memory-measurement API exists, the same documented limitation as Sprint 2.2's count-based cache caps).

## LOD strategy — deliberately minimal for this product

Traditional distance-based LOD (swapping high/low-poly meshes as the camera moves away from an object) is the standard answer for open scenes with many objects at varying distances. This product is the opposite shape: one hero object, camera almost always close to it, one primary view at a time (see [ADR-0006](adr/0006-scene-management-strategy.md)'s per-route-scene decision). Building a full LOD system for that shape would be solving a problem this product doesn't have. Instead:

- **DPR capping** (already in the adaptive-quality tiers above) is the more relevant lever for this project — it reduces per-pixel cost uniformly, which matters more than swapping geometry detail when there's only ever one or two objects in frame.
- Geometry LOD is documented, not built, and only worth revisiting if a future scene (a populated customizer view, a multi-product comparison) genuinely has many simultaneously-visible complex objects at varying camera distances — not speculative work done ahead of that need.

## Asset streaming

Full detail in [3d-asset-pipeline.md](3d-asset-pipeline.md)'s "Lazy loading & streaming" section — the performance-relevant summary: only the current narrative beat's or currently-visible option's assets load eagerly; everything else is prefetched in the background or loaded on demand, never the full asset budget of a future feature loaded upfront.

## Suspense boundary granularity

Each async 3D resource sits behind the *smallest reasonable* Suspense boundary, not one giant boundary around an entire scene. Concretely: the hero cup's above-the-fold parts (once real GLB assets exist) share one boundary and preload eagerly together, since they're meant to appear as one composed object — but a lower-priority decorative element in a future scene (a background ingredient, a secondary product) gets its *own* boundary, so a slow-loading background asset never delays the primary hero object from appearing. Getting this wrong (one boundary for everything) means the slowest asset in a scene silently controls when the whole scene's first paint happens.

## Related

[03_3D_ENGINE.md](03_3D_ENGINE.md) · [3d-asset-pipeline.md](3d-asset-pipeline.md) · [13_SHADER_ARCHITECTURE.md](13_SHADER_ARCHITECTURE.md) · [19_EVENT_CATALOG.md](19_EVENT_CATALOG.md) · [reviews/sprint-2.5-review.md](reviews/sprint-2.5-review.md)
