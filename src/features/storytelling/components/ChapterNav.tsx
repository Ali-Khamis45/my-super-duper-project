"use client";

import { useLenis } from "lenis/react";

import { useStorytellingStore } from "@/stores/storytelling-store";

import type { ChapterDefinition } from "../types";

interface ChapterNavProps {
  chapters: readonly ChapterDefinition[];
}

/**
 * The "keyboard navigation" requirement's concrete mechanism, and a real
 * table of contents, not just a scroll-position indicator: every dot is a
 * real `<button>`, reachable by Tab, jumping straight to that chapter on
 * Enter/Space/click — a keyboard user (or anyone) can navigate the story
 * without scrolling at all. `aria-current="step"` marks the active one, the
 * value React's own docs recommend for a linear, multi-step flow like this.
 *
 * `useLenis()` returns `undefined` when `SmoothScrollProvider` didn't mount
 * `ReactLenis` (reduced motion) — falls back to native `scrollIntoView`,
 * which is exactly the un-smoothed, instant-jump behavior reduced motion
 * should have anyway.
 */
export function ChapterNav({ chapters }: ChapterNavProps) {
  const activeChapterId = useStorytellingStore((state) => state.activeChapterId);
  const lenis = useLenis();

  const goToChapter = (chapterId: string) => {
    const target = document.getElementById(`chapter-${chapterId}`);
    if (!target) return;
    if (lenis) {
      lenis.scrollTo(target, { offset: 0 });
    } else {
      target.scrollIntoView({ behavior: "auto", block: "start" });
    }
  };

  return (
    <nav aria-label="Story chapters" className="fixed top-1/2 right-4 z-20 hidden -translate-y-1/2 flex-col gap-3 md:right-8 lg:flex">
      {chapters.map((chapter) => {
        const isActive = chapter.id === activeChapterId;
        return (
          <button
            key={chapter.id}
            type="button"
            aria-current={isActive ? "step" : undefined}
            aria-label={chapter.navLabel}
            onClick={() => goToChapter(chapter.id)}
            className={`focus-visible:ring-ring h-2.5 w-2.5 rounded-full border border-current transition-all duration-(--duration-fast) ease-(--ease-premium) focus-visible:ring-2 focus-visible:outline-none ${
              isActive ? "bg-foreground scale-125" : "bg-transparent opacity-50 hover:opacity-80"
            }`}
          />
        );
      })}
    </nav>
  );
}
