import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

const glassSurfaceVariants = cva(
  "border-border/60 bg-background/70 backdrop-blur-xl backdrop-saturate-150",
  {
    variants: {
      elevation: {
        sm: "shadow-[var(--shadow-glass-sm)]",
        md: "shadow-[var(--shadow-glass-md)]",
        lg: "shadow-[var(--shadow-glass-lg)]",
      },
    },
    defaultVariants: {
      elevation: "md",
    },
  },
);

interface GlassSurfaceProps
  extends ComponentProps<"div">,
    VariantProps<typeof glassSurfaceVariants> {}

/** Reusable frosted/blur panel — the base for the Navbar and glass cards. */
export function GlassSurface({ className, elevation, ...props }: GlassSurfaceProps) {
  return (
    <div className={cn(glassSurfaceVariants({ elevation }), "rounded-lg border", className)} {...props} />
  );
}
