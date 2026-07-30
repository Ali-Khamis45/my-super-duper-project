import { Skeleton } from "@/components/ui/skeleton";

/** The menu's first real async data dependency (Sprint 5.2) — the static catalog it replaces never had a loading state to design, since a bundled array never has latency. Card-shaped, not a spinner, so the grid's final layout never jumps once real data lands. */
export function MenuLoadingState() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true" aria-label="Loading menu">
      {Array.from({ length: 6 }, (_, index) => (
        <div key={index} className="border-border flex flex-col gap-3 rounded-xl border p-4">
          <Skeleton className="h-32 w-full rounded-lg" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-1/3" />
        </div>
      ))}
    </div>
  );
}
