"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useState } from "react";

import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/design-system/theme/ThemeProvider";
import { AuthSessionRestorer } from "@/features/auth/components/AuthSessionRestorer";
import { getQueryClient } from "@/lib/query-client";

// Imported for its module-scope EventBus subscription side effect — see the
// file itself. Activated at the app root, not by whichever feature happens
// to emit an event first: Sprint 2.6's Engine Integration Audit found this
// previously only loaded because `useCupInteractionState.ts` imported it,
// which meant Analytics activation was accidentally coupled to the hero
// cup existing at all, rather than guaranteed for every route.
import "@/engine/analytics/eventBridge";

import { SmoothScrollProvider } from "./SmoothScrollProvider";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => getQueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <AuthSessionRestorer />
          <SmoothScrollProvider>{children}</SmoothScrollProvider>
        </TooltipProvider>
        <ReactQueryDevtools initialIsOpen={false} />
      </ThemeProvider>
    </QueryClientProvider>
  );
}
