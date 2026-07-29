import Link from "next/link";

import { Button } from "@/components/ui/button";

import type { ChapterCta } from "../types";

/**
 * The story's one real conversion moment (`data/chapters.ts`'s Finale
 * chapter is the only one with `ctas`) — "Hero-to-menu transition," the
 * brief's own phrase, resolved here as this real, working handoff rather
 * than a route-to-route animated transition between two separate pages.
 * `nativeButton={false}` on every `Button render={<Link .../>}` — this
 * project's established Base UI convention (`DrinkDetailDialog.tsx` /
 * Sprint 3.6's cart components) — omitting it produces a real console
 * warning and the wrong accessible role.
 */
export function FinaleCtas({ ctas }: { ctas: ChapterCta[] }) {
  return (
    <div className="mt-6 flex flex-wrap gap-3">
      {ctas.map((cta) => (
        <Button key={cta.href} nativeButton={false} render={<Link href={cta.href} />}>
          {cta.label}
        </Button>
      ))}
    </div>
  );
}
