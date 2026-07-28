"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { useMagnetic } from "@/engine/motion/gestures";
import { fadeUp, pop, stagger } from "@/engine/motion/presets";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

export function HeroCopy() {
  const reducedMotion = usePrefersReducedMotion();
  const magnetic = useMagnetic(0.4);

  return (
    <motion.div
      initial={reducedMotion ? false : "hidden"}
      animate={reducedMotion ? undefined : "visible"}
      variants={stagger}
      className="pointer-events-none absolute inset-x-0 top-0 flex flex-col items-center px-6 pt-36 text-center sm:pt-44"
    >
      <motion.p
        variants={fadeUp}
        className="text-brand-accent-600 dark:text-brand-accent-400 text-sm font-medium tracking-[0.2em] uppercase"
      >
        Coffeshop
      </motion.p>
      <motion.h1
        variants={fadeUp}
        className="font-display text-hero mt-4 max-w-3xl leading-(--text-hero--line-height)"
      >
        Crafted for the senses.
      </motion.h1>
      <motion.p variants={fadeUp} className="text-muted-foreground mt-6 max-w-md text-lg text-balance">
        Drag the cup. Watch the light change. This is what a coffee order should feel like.
      </motion.p>
      <motion.div variants={fadeUp} className="pointer-events-auto mt-8">
        <motion.div
          style={magnetic.style}
          onPointerMove={magnetic.onPointerMove}
          onPointerLeave={magnetic.onPointerLeave}
          initial="rest"
          whileTap="pressed"
          variants={pop}
          className="inline-block"
        >
          <Button size="lg" nativeButton={false} render={<Link href="/menu" />}>
            Order Now
            <ArrowRight className="size-4" aria-hidden="true" />
          </Button>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
