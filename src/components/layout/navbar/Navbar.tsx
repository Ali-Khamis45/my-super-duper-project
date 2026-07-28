"use client";

import { motion } from "framer-motion";
import { Coffee } from "lucide-react";
import Link from "next/link";

import { GlassSurface } from "@/design-system/primitives/GlassSurface";
import { ThemeToggle } from "@/design-system/theme/ThemeToggle";
import { durations } from "@/engine/motion/durations";
import { easings } from "@/engine/motion/easings";
import { fadeIn } from "@/engine/motion/presets";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

import { MobileMenu } from "./MobileMenu";
import { NavLinks } from "./NavLinks";
import { useScrollDirection } from "./useScrollDirection";

export function Navbar() {
  const direction = useScrollDirection();
  const reducedMotion = usePrefersReducedMotion();

  return (
    <motion.header
      initial={reducedMotion ? false : "hidden"}
      animate={reducedMotion ? undefined : "visible"}
      variants={fadeIn}
      className="fixed inset-x-0 top-0 z-40"
    >
      <motion.div
        animate={{ y: !reducedMotion && direction === "down" ? "-100%" : "0%" }}
        transition={{ duration: durations.base, ease: easings.premium }}
      >
        <div className="mx-auto max-w-6xl px-4 py-3 sm:px-6">
          <GlassSurface elevation="sm" className="px-4 py-2.5">
            <nav aria-label="Primary" className="flex w-full items-center justify-between gap-4">
              <Link href="/" className="font-display flex shrink-0 items-center gap-2 text-lg">
                <Coffee className="text-brand-accent-500 size-5" aria-hidden="true" />
                Coffeshop
              </Link>
              <NavLinks className="hidden sm:flex" />
              <div className="flex shrink-0 items-center gap-1">
                <ThemeToggle />
                <MobileMenu />
              </div>
            </nav>
          </GlassSurface>
        </div>
      </motion.div>
    </motion.header>
  );
}
