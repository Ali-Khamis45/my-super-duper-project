"use client";

import { motion } from "framer-motion";
import { forwardRef } from "react";

import { fadeUp } from "@/engine/motion/presets";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

import type { ChapterDefinition } from "../types";

interface ChapterSectionProps {
  chapter: ChapterDefinition;
  children?: React.ReactNode;
}

/**
 * One chapter's DOM content — a real `<section>` landmark (`aria-label`
 * from the chapter's own title, so a screen reader's landmark list reads
 * as a real table of contents for the story), tall enough (`min-h-svh`)
 * that `useScrollTimeline`'s `ScrollTrigger` has real scroll distance to
 * scrub through. `StoryExperience` owns the ref (for both the GSAP
 * timeline and the reduced-motion `IntersectionObserver` path) — this
 * component is a plain, dumb wrapper, not where chapter-active logic
 * lives, so there's exactly one place that decides "which chapter is
 * active," not two.
 */
export const ChapterSection = forwardRef<HTMLElement, ChapterSectionProps>(function ChapterSection({ chapter, children }, ref) {
  const reducedMotion = usePrefersReducedMotion();

  return (
    <section
      ref={ref}
      id={`chapter-${chapter.id}`}
      aria-label={chapter.title}
      className="flex min-h-svh flex-col items-start justify-center gap-4 px-6 py-24 md:px-16 lg:w-1/2 lg:px-24"
    >
      <motion.div
        initial={reducedMotion ? false : "hidden"}
        whileInView={reducedMotion ? undefined : "visible"}
        viewport={{ once: true, amount: 0.5 }}
        variants={fadeUp}
        className="max-w-lg"
      >
        <h2 className="text-foreground text-3xl font-semibold text-balance md:text-4xl">{chapter.title}</h2>
        <p className="text-muted-foreground mt-4 text-lg text-pretty">{chapter.copy}</p>
        {children}
      </motion.div>
    </section>
  );
});
