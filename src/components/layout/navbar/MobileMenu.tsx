"use client";

import { Menu } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { track } from "@/engine/analytics/tracking";
import { useUIStore } from "@/stores/ui-store";

import { NavLinks } from "./NavLinks";

/** Sheet-based mobile nav — Base UI provides the focus trap and Escape-to-close. */
export function MobileMenu() {
  const navOpen = useUIStore((state) => state.navOpen);
  const setNavOpen = useUIStore((state) => state.setNavOpen);

  return (
    <Sheet
      open={navOpen}
      onOpenChange={(open) => {
        setNavOpen(open);
        if (open) track({ name: "nav_opened", payload: { via: "mobile-menu" } });
      }}
    >
      <SheetTrigger
        render={
          <Button variant="ghost" size="icon" aria-label="Open menu" className="sm:hidden">
            <Menu className="size-5" aria-hidden="true" />
          </Button>
        }
      />
      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle>Coffeshop</SheetTitle>
        </SheetHeader>
        <NavLinks className="flex-col items-start gap-1 px-4" onNavigate={() => setNavOpen(false)} />
      </SheetContent>
    </Sheet>
  );
}
