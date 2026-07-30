import type { OnboardingStep } from "../types";

/**
 * Sprint 3.9, Task 1 — the 8 steps from the brief, in order. Every
 * spotlighted step targets a real element already on `/` (the hero cup, its
 * new Sprint 3.9 zoom controls, the Navbar links, the new Sprint 3.9 AI
 * Barista button, the cart icon) — "progressive disclosure" here means
 * revealing what each part of the *current* page leads to, not forcing a
 * first-time visitor through a multi-page guided navigation before they've
 * even decided to stay. See `README.md`'s "Why one page" section.
 */
export const ONBOARDING_STEPS: readonly OnboardingStep[] = [
  {
    id: "welcome",
    title: "Welcome to Coffeshop",
    description: "A quick, 8-step look at what's here — feel free to skip anytime.",
    placement: "center",
  },
  {
    id: "rotate",
    title: "Rotate the cup",
    description: "Click and drag the cup — or use the Left/Right arrow keys — to see it from every angle.",
    targetSelector: '[data-onboarding="cup-canvas"]',
    placement: "right",
  },
  {
    id: "zoom",
    title: "Zoom and inspect",
    description: "Scroll, pinch, or use these controls to get a closer look — or reset to the original view anytime.",
    targetSelector: '[data-onboarding="zoom-controls"]',
    placement: "top",
  },
  {
    id: "menu",
    title: "Browse the menu",
    description: "Every drink we make, with real tasting notes — filterable by category.",
    targetSelector: '[data-onboarding="nav-menu"]',
    placement: "bottom",
  },
  {
    id: "customize",
    title: "Customize your drink",
    description: "Pick a cup color, size, and every ingredient — watched live in 3D as you build it.",
    targetSelector: '[data-onboarding="nav-customize"]',
    placement: "bottom",
  },
  {
    id: "ai-barista",
    title: "Meet your AI barista",
    description: "Tell it what you're in the mood for — it'll recommend something real from the menu and explain why.",
    targetSelector: '[data-onboarding="ai-barista-button"]',
    placement: "left",
  },
  {
    id: "checkout",
    title: "A smooth checkout",
    description: "Add your custom drink to the cart, and check out in just a couple of steps.",
    targetSelector: '[data-onboarding="cart-icon"]',
    placement: "bottom",
  },
  {
    id: "story",
    title: "Explore our story",
    description: "A cinematic, scroll-driven look at where the beans come from and how it's all crafted.",
    targetSelector: '[data-onboarding="nav-story"]',
    placement: "bottom",
  },
] as const satisfies readonly OnboardingStep[];
