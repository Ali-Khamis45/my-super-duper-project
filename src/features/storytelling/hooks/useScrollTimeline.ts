"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useEffect } from "react";
import type { RefObject } from "react";

import { scrollProgress } from "@/engine/state/scrollProgress";
import { useStorytellingStore } from "@/stores/storytelling-store";

import type { ChapterDefinition } from "../types";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

/**
 * Sprint 3.7's "Scene Timeline" + "Chapter Manager", combined into one
 * hook since they're two views of the same GSAP setup, not two separate
 * systems: a page-spanning `ScrollTrigger` publishes the global 0-1
 * position to `engine/state/scrollProgress` (exactly the contract
 * `docs/18_ENGINEERING_CONTRACTS.md` pre-designed), and one `ScrollTrigger`
 * per chapter section drives `stores/storytelling-store.ts`'s narrative
 * state — `onEnter`/`onEnterBack` mark a chapter active and emit the
 * discrete `chapter:entered` event, `onUpdate` publishes that one
 * chapter's own local progress while it's the active one.
 *
 * Never called under reduced motion (see `StoryExperience.tsx`) — no
 * `ScrollTrigger` is registered at all in that path, per this project's
 * "disable outright, don't downgrade" policy; chapters render as plain
 * stacked sections and `scrollProgress`/`activeChapterId` simply stay at
 * their initial values, which is correct there since nothing 3D reacts to
 * them under reduced motion either (`StoryCanvas` snaps to the "hero"
 * preset throughout).
 */
export function useScrollTimeline(
  chapters: readonly ChapterDefinition[],
  containerRef: RefObject<HTMLDivElement | null>,
  sectionRefs: RefObject<Array<HTMLElement | null>>,
  enabled: boolean,
) {
  useEffect(() => {
    if (!enabled) return;
    const container = containerRef.current;
    if (!container) return;

    const triggers: ScrollTrigger[] = [];

    triggers.push(
      ScrollTrigger.create({
        trigger: container,
        start: "top top",
        end: "bottom bottom",
        onUpdate: (self) => scrollProgress.setValue(self.progress),
      }),
    );

    chapters.forEach((chapter, index) => {
      const section = sectionRefs.current[index];
      if (!section) return;

      triggers.push(
        ScrollTrigger.create({
          trigger: section,
          start: "top 65%",
          end: "bottom 35%",
          onEnter: () => useStorytellingStore.getState().setActiveChapter(chapter.id),
          onEnterBack: () => useStorytellingStore.getState().setActiveChapter(chapter.id),
          onUpdate: (self) => {
            if (!self.isActive) return;
            useStorytellingStore.getState().setChapterProgress(self.progress);
          },
        }),
      );
    });

    return () => {
      triggers.forEach((trigger) => trigger.kill());
    };
  }, [chapters, containerRef, sectionRefs, enabled]);
}
