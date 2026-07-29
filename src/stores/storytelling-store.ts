import { create } from "zustand";

import { appEvents } from "@/engine/events";
import { FIRST_CHAPTER } from "@/features/storytelling/data/chapters";
import type { ChapterId } from "@/features/storytelling/types";

/**
 * Sprint 3.7's "Narrative State" — which chapter is active, that chapter's
 * own local 0-1 progress, and whether the user skipped the story. Not
 * persisted (no `persist` middleware): unlike `customizer-store.ts`/
 * `concierge-store.ts`'s session-scoped state, a scroll position has no
 * meaning to restore across a reload — the same "Persistence: None"
 * precedent `docs/18_ENGINEERING_CONTRACTS.md` already set for the
 * sibling `scrollProgress` bridge store.
 *
 * Deliberately a Zustand store, not a second bridge store: `activeChapterId`
 * changes discretely (a handful of times per page visit, once per chapter
 * boundary crossing), the exact shape a normal React-subscribed store
 * already handles well — unlike `scrollProgress`'s continuous, every-frame
 * writes, which is what actually motivates a bridge store's no-re-render
 * `getValue()` escape hatch.
 */
interface StorytellingStoreState {
  activeChapterId: ChapterId;
  chapterProgress: number;
  skipped: boolean;
  setActiveChapter: (chapterId: ChapterId) => void;
  setChapterProgress: (progress: number) => void;
  skip: () => void;
}

export const useStorytellingStore = create<StorytellingStoreState>()((set, get) => ({
  activeChapterId: FIRST_CHAPTER.id,
  chapterProgress: 0,
  skipped: false,

  setActiveChapter: (chapterId) => {
    if (get().activeChapterId === chapterId) return;
    set({ activeChapterId: chapterId, chapterProgress: 0 });
    appEvents.emit({ name: "chapter:entered", chapterId });
  },

  setChapterProgress: (progress) => {
    set({ chapterProgress: Math.min(1, Math.max(0, progress)) });
  },

  skip: () => {
    appEvents.emit({ name: "story:skipped", fromChapterId: get().activeChapterId });
    set({ skipped: true });
  },
}));
