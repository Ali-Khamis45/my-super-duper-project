import { describe, expect, it } from "vitest";

import { resolveCameraPreset } from "@/engine/camera/presets";
import { resolveEnvironmentPreset } from "@/engine/environment/presets";
import { resolveLightingPreset } from "@/engine/lighting/presets";

import { FIRST_CHAPTER, resolveChapter, STORY_CHAPTERS } from "./chapters";

describe("STORY_CHAPTERS", () => {
  it("has 7 chapters, exactly as named in the brief, each with a unique id", () => {
    expect(STORY_CHAPTERS).toHaveLength(7);
    expect(new Set(STORY_CHAPTERS.map((chapter) => chapter.id)).size).toBe(7);
  });

  it("starts with FIRST_CHAPTER, matching the storytelling store's initial state", () => {
    expect(STORY_CHAPTERS[0]).toEqual(FIRST_CHAPTER);
    expect(FIRST_CHAPTER.id).toBe("hero");
  });

  it("only the Finale chapter has CTAs — every other chapter is narrative, not a conversion point", () => {
    const withCtas = STORY_CHAPTERS.filter((chapter) => chapter.ctas);
    expect(withCtas).toHaveLength(1);
    expect(withCtas[0]?.id).toBe("finale");
  });

  it("only the Crafting chapter has an assembly moment", () => {
    const assemblyChapters = STORY_CHAPTERS.filter((chapter) => chapter.hasAssemblyMoment);
    expect(assemblyChapters).toHaveLength(1);
    expect(assemblyChapters[0]?.id).toBe("crafting");
  });

  it("every chapter's camera/lighting/environment preset is actually registered, not just typed", () => {
    for (const chapter of STORY_CHAPTERS) {
      expect(() => resolveCameraPreset(chapter.cameraPreset)).not.toThrow();
      expect(() => resolveLightingPreset(chapter.lightingPreset)).not.toThrow();
      expect(() => resolveEnvironmentPreset(chapter.environmentPreset)).not.toThrow();
    }
  });
});

describe("resolveChapter", () => {
  it("resolves a real chapter id", () => {
    expect(resolveChapter("crafting")?.title).toBe("Every piece has a place.");
  });

  it("returns undefined for an unknown id, not a throw", () => {
    expect(resolveChapter("not-a-chapter")).toBeUndefined();
  });
});
