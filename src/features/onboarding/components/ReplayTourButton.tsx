"use client";

import { HelpCircle } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";

import { Button } from "@/components/ui/button";
import { useOnboardingStore } from "@/stores/onboarding-store";

/**
 * Sprint 3.9, Task 1 — every spotlighted step lives on `/` (see
 * `data/steps.ts`), so replaying from elsewhere navigates there first, then
 * starts once the hero has actually mounted (`OnboardingLauncher`'s own
 * mount-delay reasoning applies here too, hence the short delay instead of
 * starting immediately on navigation).
 */
export function ReplayTourButton() {
  const router = useRouter();
  const pathname = usePathname();
  const start = useOnboardingStore((state) => state.start);

  function handleClick() {
    if (pathname === "/") {
      start();
      return;
    }
    router.push("/");
    window.setTimeout(start, 1200);
  }

  return (
    <Button type="button" variant="ghost" size="icon" aria-label="Replay the onboarding tour" onClick={handleClick}>
      <HelpCircle className="size-4" aria-hidden="true" />
    </Button>
  );
}
