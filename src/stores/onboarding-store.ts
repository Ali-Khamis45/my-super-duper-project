import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { appEvents } from "@/engine/events";
import { ONBOARDING_STEPS } from "@/features/onboarding/data/steps";

interface OnboardingStoreState {
  /** The one field actually persisted — "remembered" across visits, not just this session, so `localStorage` (matching `cart-store.ts`'s own precedent for state that should survive a closed browser), not the `sessionStorage` every other Sprint 3.x feature store uses. */
  hasCompletedOnboarding: boolean;
  /** `zustand/persist`'s own rehydration is asynchronous even for synchronous storage — without this, a returning visitor's `hasCompletedOnboarding: true` wouldn't be applied yet on the very first client render, and `OnboardingLauncher` could briefly auto-start the tour for someone who already finished it. Set once, by `onRehydrateStorage` below. */
  hasHydrated: boolean;
  isActive: boolean;
  stepIndex: number;
  start: () => void;
  next: () => void;
  previous: () => void;
  goToStep: (index: number) => void;
  skip: () => void;
  complete: () => void;
  markHydrated: () => void;
}

const LAST_STEP_INDEX = ONBOARDING_STEPS.length - 1;

export const useOnboardingStore = create<OnboardingStoreState>()(
  persist(
    (set, get) => ({
      hasCompletedOnboarding: false,
      hasHydrated: false,
      isActive: false,
      stepIndex: 0,

      start: () => {
        set({ isActive: true, stepIndex: 0 });
        appEvents.emit({ name: "onboarding:started" });
      },

      next: () => {
        const { stepIndex } = get();
        if (stepIndex >= LAST_STEP_INDEX) return;
        set({ stepIndex: stepIndex + 1 });
      },

      previous: () => {
        const { stepIndex } = get();
        if (stepIndex <= 0) return;
        set({ stepIndex: stepIndex - 1 });
      },

      goToStep: (index) => {
        if (index < 0 || index > LAST_STEP_INDEX) return;
        set({ stepIndex: index });
      },

      skip: () => {
        const step = ONBOARDING_STEPS[get().stepIndex];
        set({ isActive: false, hasCompletedOnboarding: true });
        if (step) appEvents.emit({ name: "onboarding:skipped", stepId: step.id, index: get().stepIndex });
      },

      complete: () => {
        set({ isActive: false, hasCompletedOnboarding: true });
        appEvents.emit({ name: "onboarding:completed" });
      },

      markHydrated: () => set({ hasHydrated: true }),
    }),
    {
      name: "coffeshop-onboarding",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ hasCompletedOnboarding: state.hasCompletedOnboarding }),
      onRehydrateStorage: () => (state) => {
        state?.markHydrated();
      },
    },
  ),
);
