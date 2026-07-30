export type OnboardingPlacement = "top" | "bottom" | "left" | "right" | "center";

export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  /**
   * A `data-onboarding="<value>"` attribute value on a real, already-visible
   * element on `/` — never a synthetic mock-up. `undefined` for the one
   * step (Welcome) with nothing to spotlight yet.
   */
  targetSelector?: string;
  placement: OnboardingPlacement;
}
