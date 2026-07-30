"use client";

import { Coffee } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { appEvents } from "@/engine/events";
import { useAiBaristaStore } from "@/stores/ai-barista-store";

import { AiBaristaChat } from "./AiBaristaChat";
import { AiBaristaSteam } from "./AiBaristaSteam";

/**
 * Sprint 3.9, Task 4 — mounted once, globally (in `app/layout.tsx`,
 * alongside `Navbar`), so the floating AI button is available on every
 * route the way a real chat widget would be. `Sheet` (Base UI Dialog) is
 * reused directly for the chat window itself rather than a hand-rolled
 * `AnimatePresence` overlay — the same primitive `MobileMenu` already uses,
 * giving the "glass chat window" real focus-trap/Escape/backdrop-dismiss
 * behavior for free. Opens via a real `SheetTrigger` (not a plain button
 * calling the store directly, which was tried first and silently broke
 * Base UI's own Escape-to-close handling — `SheetTrigger` wires the
 * trigger into the Dialog's internal state machine in a way a bare
 * `onClick` doesn't fully replicate).
 */
export function AiBaristaLauncher() {
  const isOpen = useAiBaristaStore((state) => state.isOpen);
  const open = useAiBaristaStore((state) => state.open);
  const close = useAiBaristaStore((state) => state.close);

  return (
    <Sheet
      open={isOpen}
      onOpenChange={(nextOpen) => {
        if (nextOpen) {
          open();
          appEvents.emit({ name: "ai-barista:opened" });
        } else {
          close();
          appEvents.emit({ name: "ai-barista:closed" });
        }
      }}
    >
      {!isOpen && (
        <div className="fixed right-5 bottom-5 z-40 sm:right-6 sm:bottom-6">
          <div className="relative">
            <AiBaristaSteam className="-top-6 h-8" />
            <SheetTrigger
              render={
                <Button
                  type="button"
                  size="icon-lg"
                  className="rounded-full shadow-lg"
                  aria-label="Chat with the AI barista"
                  data-onboarding="ai-barista-button"
                >
                  <Coffee className="size-5" aria-hidden="true" />
                </Button>
              }
            />
          </div>
        </div>
      )}
      <SheetContent side="right" showCloseButton className="bg-background/85 border-border/60 backdrop-blur-xl backdrop-saturate-150 sm:max-w-md">
        <AiBaristaChat />
      </SheetContent>
    </Sheet>
  );
}
