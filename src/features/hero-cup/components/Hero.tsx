import { DevPanel } from "@/engine/devpanel/DevPanel";

import { CupCanvasLoader } from "./CupCanvasLoader";
import { HeroCopy } from "./HeroCopy";

/**
 * Full-bleed — the Navbar intentionally floats (glass, fixed) over this,
 * not the other way around. See docs/05_UI_GUIDELINES.md.
 */
export function Hero() {
  return (
    <section id="main-content" className="relative min-h-screen w-full overflow-hidden">
      <div className="hero-canvas-wrapper absolute inset-0">
        <CupCanvasLoader />
      </div>
      <HeroCopy />
      <DevPanel />
    </section>
  );
}
