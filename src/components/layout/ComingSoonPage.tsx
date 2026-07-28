import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";

interface ComingSoonPageProps {
  title: string;
  description: string;
  milestone: string;
}

/** Honest placeholder for a route whose feature hasn't landed yet — see docs/08_MILESTONES.md. */
export function ComingSoonPage({ title, description, milestone }: ComingSoonPageProps) {
  return (
    <main
      id="main-content"
      className="flex min-h-[80vh] flex-col items-center justify-center gap-6 px-6 pt-28 text-center"
    >
      <p className="text-brand-accent-600 dark:text-brand-accent-400 text-sm font-medium tracking-wide uppercase">
        {milestone}
      </p>
      <h1 className="font-display text-display leading-(--text-display--line-height)">{title}</h1>
      <p className="text-muted-foreground max-w-md text-balance">{description}</p>
      <Button nativeButton={false} render={<Link href="/" />}>
        <ArrowLeft className="size-4" aria-hidden="true" /> Back home
      </Button>
    </main>
  );
}
