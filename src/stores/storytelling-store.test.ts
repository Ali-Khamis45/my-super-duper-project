import { beforeEach, describe, expect, it, vi } from "vitest";

import { appEvents } from "@/engine/events";
import { FIRST_CHAPTER } from "@/features/storytelling/data/chapters";

import { useStorytellingStore } from "./storytelling-store";

function resetStore() {
  useStorytellingStore.setState({ activeChapterId: FIRST_CHAPTER.id, chapterProgress: 0, skipped: false });
}

describe("useStorytellingStore", () => {
  beforeEach(() => {
    resetStore();
  });

  it("starts on the first chapter with zero progress and not skipped", () => {
    const state = useStorytellingStore.getState();
    expect(state.activeChapterId).toBe(FIRST_CHAPTER.id);
    expect(state.chapterProgress).toBe(0);
    expect(state.skipped).toBe(false);
  });

  it("setActiveChapter switches the chapter, resets progress, and emits chapter:entered", () => {
    const handler = vi.fn();
    const unsub = appEvents.on("chapter:entered", handler);

    useStorytellingStore.getState().setChapterProgress(0.8);
    useStorytellingStore.getState().setActiveChapter("crafting");

    expect(useStorytellingStore.getState().activeChapterId).toBe("crafting");
    expect(useStorytellingStore.getState().chapterProgress).toBe(0);
    expect(handler).toHaveBeenCalledWith(expect.objectContaining({ chapterId: "crafting" }));
    unsub();
  });

  it("setActiveChapter with the already-active chapter is a no-op — no event, no progress reset", () => {
    const handler = vi.fn();
    const unsub = appEvents.on("chapter:entered", handler);

    useStorytellingStore.getState().setChapterProgress(0.6);
    useStorytellingStore.getState().setActiveChapter(FIRST_CHAPTER.id);

    expect(useStorytellingStore.getState().chapterProgress).toBe(0.6);
    expect(handler).not.toHaveBeenCalled();
    unsub();
  });

  it("setChapterProgress clamps to [0,1]", () => {
    useStorytellingStore.getState().setChapterProgress(1.5);
    expect(useStorytellingStore.getState().chapterProgress).toBe(1);
    useStorytellingStore.getState().setChapterProgress(-0.5);
    expect(useStorytellingStore.getState().chapterProgress).toBe(0);
  });

  it("skip() sets skipped and emits story:skipped with the chapter it was skipped from", () => {
    const handler = vi.fn();
    const unsub = appEvents.on("story:skipped", handler);

    useStorytellingStore.getState().setActiveChapter("origins");
    useStorytellingStore.getState().skip();

    expect(useStorytellingStore.getState().skipped).toBe(true);
    expect(handler).toHaveBeenCalledWith(expect.objectContaining({ fromChapterId: "origins" }));
    unsub();
  });
});
