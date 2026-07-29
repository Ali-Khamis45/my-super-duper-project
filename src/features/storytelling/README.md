# storytelling

The Cinematic Storytelling Experience at `/story`: a scroll-driven, 7-chapter narrative (Hero → Origins → Crafting → Customization → AI Concierge → Commerce → Finale) built entirely on frozen Engine v1.0 — a discretely-switched camera preset per chapter, a lighting/environment mood per chapter, a real "cup assembles from floating pieces" moment, an ingredient reveal, and two real conversion CTAs at the end. Follows the `hero-cup/README.md` template — Architecture, Flow, Responsibilities, Known simplifications, Future extension.

## Architecture

```
storytelling/
├── components/
│   ├── StoryExperience.tsx   top-level composition, owns section refs + chapter-active detection
│   ├── StoryCanvas.tsx       the 3D layer — chapter state -> CupCanvasLoader props
│   ├── ChapterSection.tsx    one chapter's DOM content — a real <section> landmark
│   ├── ChapterNav.tsx        keyboard-accessible dot rail, jumps to any chapter directly
│   ├── SkipStorytellingLink.tsx  the brief's "Skip storytelling" requirement
│   └── FinaleCtas.tsx        the story's one real conversion moment
├── hooks/useScrollTimeline.ts   GSAP ScrollTrigger orchestration — "Scene Timeline" + "Chapter Manager"
├── data/{chapters,explodedOffsets}.ts   the 7-chapter catalog + the assembly moment's displacement data
├── lib/{blendExplodedOffsets,resolveStoryIngredientLayers}.ts   pure, unit-tested per-chapter math
└── types.ts
```

Narrative state (`activeChapterId`/`chapterProgress`/`skipped`) lives in `stores/storytelling-store.ts` (project-root `stores/`, same convention every other feature store follows) — not persisted, matching `docs/18_ENGINEERING_CONTRACTS.md`'s own "Persistence: None" precedent for the sibling `scrollProgress` bridge store (a scroll position has nothing meaningful to restore across a reload). `engine/state/scrollProgress.ts` is this sprint's first real instantiation of a bridge store `docs/18_ENGINEERING_CONTRACTS.md` designed back in Sprint 2.1 and left unpopulated until now.

## A real, reasoned deviation from what was anticipated — decided, not defaulted into

`docs/03_3D_ENGINE.md`/`docs/22_MANAGER_INTERFACES.md` anticipated this sprint building a `CameraPath` registry and a `CameraRig.path` prop (multi-waypoint, continuously scroll-scrubbed camera interpolation). This sprint's actual brief is explicit instead: *"Add cinematic camera paths. Reuse Camera Manager. Do not modify Camera contracts. Implement through new presets only."* Investigated directly against `CameraRig.tsx`'s real implementation before choosing a design: `CameraRig` only re-resolves its target preset at React render time (`const config = resolveCameraPreset(preset)`), not per-frame — continuously re-registering a computed preset under one name would never actually reach it without also making `CameraRig` re-render every scroll frame, a real performance regression `CameraRig`'s own frame loop is specifically built to avoid. The design that's both technically sound *and* matches the brief's explicit instruction: **each chapter switches to its own real, named, registered camera preset** (`origins`/`exploded`/`product`/`ai`/`checkout`/`finale` — mostly reusing presets that were typed since Milestone 1 but never registered, `origins`/`finale` the only genuinely new names), and `CameraRig`'s own existing damped preset-to-preset interpolation — completely unmodified — provides the "camera glides smoothly" feel at each chapter boundary. Continuous, scroll-scrubbed motion (the Crafting chapter's assembly, the Customization chapter's ingredient orbit, the `uStorytellingProgress` shader boost) is real, but lives entirely in `CupAssembly`'s own per-part damping and the shader uniform block — never in the Camera Manager. Recorded here as **Resolved**, the same category `docs/26_API_STABILITY.md` used for Sprint 3.5's TanStack Query decision, not left as a silently-abandoned anticipation.

## Flow

1. `app/story/page.tsx` renders `StoryExperience` (client — needs GSAP/Zustand from first render), replacing the `ComingSoonPage` placeholder that occupied this route since Milestone 1 (now deleted, zero other callers).
2. `StoryExperience` lays out a sticky 3D column (`position: sticky`, plain CSS — not GSAP pinning, a deliberate scope decision, see Known simplifications) beside a normally-scrolling column of `ChapterSection`s. `useScrollTimeline` registers one page-spanning `ScrollTrigger` (publishes global progress to `scrollProgress`) plus one per-chapter `ScrollTrigger` (`onEnter`/`onEnterBack` call `storytelling-store`'s `setActiveChapter`, emitting the discrete `chapter:entered` event; `onUpdate` publishes that chapter's own local progress while it's active).
3. `StoryCanvas` reads `activeChapterId`/`chapterProgress` and translates them into the exact same optional-prop surface every prior feature already extended `CupCanvasLoader` with (`cameraPreset` since Sprint 3.5, `partOverrides`/`ingredientLayers` since Sprint 3.2/3.3, `lightingPresetOverride`/`environmentPresetOverride` new this sprint) — no new rendering pipeline.
4. The Crafting chapter (`hasAssemblyMoment: true`) drives `blendExplodedOffsets` (chapter entry = fully exploded, chapter exit = fully reassembled) into `CupAssembly`'s newly-wired `lid`/`sleeve` `position`/`rotation` overrides — damped via `useSmoothedVector3` (a new, generalized sibling to `useSmoothedValue`), the same "continuous target, damped follower" split `CameraRig`'s own parallax already uses. The same chapter's local progress publishes to `uStorytellingProgress` (`engine/shaders/common/uniforms.ts`'s first real publisher), boosting steam density and the shared fresnel-rim "highlights"/"glow" coefficient coffee and foam already share.
5. The Customization chapter (`featuredIngredientIds`) drives `resolveStoryIngredientLayers` — a real, computed decaying-radius orbit (not per-ingredient physics) around 3 real ingredients from `features/composer/`'s own catalog, settling near the cup as the chapter's local progress advances. The lid hides for this one chapter (visually confirmed the ingredient reveal sits almost entirely behind a closed lid otherwise).
6. `ChapterNav`'s dot rail and `SkipStorytellingLink` both jump directly to any chapter (`lenis.scrollTo`, falling back to native `scrollIntoView` when Lenis isn't mounted) — real keyboard/click navigation, not just a scroll-position indicator.
7. Reduced motion never forces a single static preset throughout: an `IntersectionObserver` (not GSAP `ScrollTrigger`) still switches `activeChapterId` per chapter — camera/lighting are a discrete *choice*, not "motion" — but every continuous, scroll-scrubbed effect (explode/reassemble, ingredient orbit, `uStorytellingProgress`) lands directly on its end state instead of animating toward it, this project's established "disable outright, don't downgrade" policy.
8. The Finale chapter's `FinaleCtas` are the story's one real conversion moment — "Browse the Menu" / "Start Customizing," real `next/link` navigation.

## Responsibilities

- **This feature owns**: the 7-chapter narrative data and copy, the scroll timeline/chapter-manager orchestration, its own `/story` UI, the exploded-offset and ingredient-orbit math.
- **This feature borrows from `engine/camera/`**: `CameraRig`, unmodified — only registers new named presets through the existing `registerCameraPreset` extension point.
- **This feature borrows from `engine/lighting/`/`engine/environment/`**: the existing registry pattern, extended with two new moods (`golden-hour`/`cafe-ambience`) shared by any future feature that wants them.
- **This feature borrows from `features/hero-cup/`**: the entire rendering pipeline via `CupCanvasLoader`'s now-larger (but still fully optional, backward-compatible) prop surface — `lightingPresetOverride`/`environmentPresetOverride` are this sprint's own additions, threaded through `CupCanvasLoader` → `CupCanvas` → `CupScene` the same way `cameraPreset` was in Sprint 3.5.
- **This feature borrows from `features/composer/`**: the real ingredient catalog (`resolveIngredient`) for the Customization chapter's reveal — never a second, storytelling-only ingredient list.
- **This feature does not own**: the cup's geometry/materials, the customizer's or concierge's own state, or ingredient compatibility rules.

## Known simplifications

- **CSS `position: sticky`, not GSAP pinning**: the sticky 3D column uses plain CSS rather than `ScrollTrigger`'s `pin` option — simpler, more robust, and avoids a real risk category (pin-related layout reflow/`pinSpacing` edge cases) that's hard to visually iterate on reliably in this environment. GSAP `ScrollTrigger` is still real and load-bearing here — it drives chapter detection and progress publishing — just not pinning specifically.
- **A settle-in reveal, not a true liquid fill-level "pouring" animation**: the brief names "Coffee pouring transition" as a Creative Budget item. A true bottom-up fill would need a new vertex-clipping shader uniform on the coffee surface, and this sprint couldn't verify the coffee mesh's own pivot-point authoring (centered vs. base-anchored) confidently enough to ship an unverified effect that might look visually broken. Scoped out; the Crafting chapter's real, verified effects (exploded/reassembled lid+sleeve, steam density boost, coffee/foam highlight boost) carry that chapter's Creative Budget instead.
- **Ingredient orbit is a computed decaying radius, not per-ingredient physics**: "ingredients orbit before settling," the brief's own words, satisfied with a real, deterministic, unit-tested formula (phase-by-index, radius decaying from `ORBIT_RADIUS` toward a real, visible `MIN_SETTLE_FACTOR` floor) rather than a second physics simulation alongside `engine/physics/liquidPhysics.ts` — consistent with that system's own "lightweight, not a physics engine" precedent.
- **Audio was not built.** The brief marks it "OPTIONAL IF TIME ALLOWS" — given the size of the rest of this sprint, no `engine/audio/` module exists yet, matching this project's established "don't build a feature the brief itself marks optional just to check a box" restraint (Sprint 2.2 made the identical call for audio, for a different reason).
- **No dedicated "Origins" bean-sourcing 3D content**: that chapter's "wow" comes from camera/lighting mood (a genuinely new establishing shot + golden-hour warmth) and copy, not new geometry — no bean/farm asset exists in this project, and authoring one wasn't in scope this sprint.

## Future extension

- **A real camera path, if a future sprint's brief asks for continuous scroll-scrubbed camera motion specifically**: `engine/camera/paths.ts`/`CameraRig.path` remain undesigned in code (only in docs) — this sprint deliberately didn't build them (see "A real, reasoned deviation" above). If a future brief explicitly wants per-pixel camera scrubbing (not per-chapter discrete moves), that's the real, motivated first consumer for the originally-anticipated design.
- **A true liquid pouring transition**: once the coffee surface's exact geometry pivot is confirmed, `uFillLevel`-style vertex work (the same additive-uniform pattern Sprint 3.4 already established for tilt/ripple) is the natural next step.
- **Ambient café audio**: `engine/audio/` has been documented (not built) since Milestone 1's architecture docs; this sprint's Crafting/Origins chapters are the most obviously-motivated first real consumer whenever a future sprint picks it up.
