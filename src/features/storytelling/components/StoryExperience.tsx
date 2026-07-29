"use client";

import { useEffect, useRef } from "react";

import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { useStorytellingStore } from "@/stores/storytelling-store";

import { FIRST_CHAPTER, STORY_CHAPTERS } from "../data/chapters";
import { useScrollTimeline } from "../hooks/useScrollTimeline";
import { ChapterNav } from "./ChapterNav";
import { ChapterSection } from "./ChapterSection";
import { FinaleCtas } from "./FinaleCtas";
import { SkipStorytellingLink } from "./SkipStorytellingLink";
import { StoryCanvas } from "./StoryCanvas";

/**
 * `/story`'s top-level composition. Layout: a sticky 3D column (CSS
 * `position: sticky`, not GSAP pinning — see `README.md`'s Architecture
 * section for why) alongside a normally-scrolling column of chapter text,
 * the common "scroll storytelling" split-screen shape, achieved with plain
 * CSS rather than a JS pinning library.
 *
 * Two entirely different mechanisms decide "which chapter is active,"
 * deliberately: `useScrollTimeline`'s GSAP `ScrollTrigger`s under normal
 * motion, a plain `IntersectionObserver` under reduced motion (no GSAP
 * `ScrollTrigger` registered there at all) — both call the exact same
 * `storytelling-store` action, so every downstream consumer
 * (`StoryCanvas`, `ChapterNav`) is unaware which one is driving it.
 */
export function StoryExperience() {
  const reducedMotion = usePrefersReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<Array<HTMLElement | null>>([]);
  const activeChapterId = useStorytellingStore((state) => state.activeChapterId);
  const activeChapter = STORY_CHAPTERS.find((chapter) => chapter.id === activeChapterId) ?? FIRST_CHAPTER;

  useScrollTimeline(STORY_CHAPTERS, containerRef, sectionRefs, !reducedMotion);

  useEffect(() => {
    if (!reducedMotion) return;
    const sections = sectionRefs.current.filter((el): el is HTMLElement => el !== null);
    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const mostVisible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (!mostVisible) return;
        const chapter = STORY_CHAPTERS.find((entry) => `chapter-${entry.id}` === mostVisible.target.id);
        if (chapter) useStorytellingStore.getState().setActiveChapter(chapter.id);
      },
      { threshold: [0.5] },
    );
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [reducedMotion]);

  return (
    <div id="main-content" className="pt-20 lg:pt-24">
      <SkipStorytellingLink />
      <ChapterNav chapters={STORY_CHAPTERS} />
      <div ref={containerRef} className="relative flex flex-col lg:flex-row">
        <div className="sticky top-20 z-10 h-[45vh] w-full lg:top-24 lg:h-[calc(100svh-6rem)] lg:w-1/2">
          <StoryCanvas />
          {/* `aria-label` — Sprint 3.6 already established that multiple
              simultaneous `role="status"` regions (this one, plus the
              global navbar's CartAnnouncer) need a distinguishing name,
              both for real screen-reader clarity and so this isn't
              ambiguous with that one. */}
          <div className="sr-only" role="status" aria-live="polite" aria-label="Story chapter announcements">
            {activeChapter.title}
          </div>
        </div>
        <div className="flex w-full flex-col lg:w-1/2">
          {STORY_CHAPTERS.map((chapter, index) => (
            <ChapterSection
              key={chapter.id}
              chapter={chapter}
              ref={(el) => {
                sectionRefs.current[index] = el;
              }}
            >
              {chapter.ctas && <FinaleCtas ctas={chapter.ctas} />}
            </ChapterSection>
          ))}
        </div>
      </div>
    </div>
  );
}
