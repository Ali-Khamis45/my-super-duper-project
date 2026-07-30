import { AlertTriangleIcon } from "lucide-react";

import { Button } from "@/components/ui/button";

interface MenuErrorStateProps {
  onRetry: () => void;
}

/** A real, distinct state from `MenuEmptyState` — "no results for your search" and "the API call failed" are different problems with different fixes, and conflating them (showing the empty state on a network error) would tell someone to try a different search when the actual fix is retrying the request. */
export function MenuErrorState({ onRetry }: MenuErrorStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 py-20 text-center">
      <AlertTriangleIcon className="text-muted-foreground size-8" aria-hidden="true" />
      <p className="font-display text-lg">The menu couldn&apos;t be loaded.</p>
      <p className="text-muted-foreground max-w-sm text-sm text-balance">Something went wrong reaching the kitchen. Give it another try.</p>
      <Button variant="outline" onClick={onRetry}>
        Try again
      </Button>
    </div>
  );
}
