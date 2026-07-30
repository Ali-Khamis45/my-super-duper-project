import { DevPanel } from "@/engine/devpanel/DevPanel";
import { EngineHealthPanel } from "@/engine/devpanel/EngineHealthPanel";
import { OnboardingLauncher } from "@/features/onboarding/components/OnboardingLauncher";

import { HeroCopy } from "./HeroCopy";
import { HeroCupViewport } from "./HeroCupViewport";

/**
 * Full-bleed — the Navbar intentionally floats (glass, fixed) over this,
 * not the other way around. See docs/05_UI_GUIDELINES.md.
 */
export function Hero() {
  return (
    <section id="main-content" className="relative min-h-screen w-full overflow-hidden">
      <HeroCupViewport />
      <HeroCopy />
      <OnboardingLauncher />
      <DevPanel />
      <EngineHealthPanel />
    </section>
  );
}
