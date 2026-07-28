import { useSyncExternalStore } from "react";

let lastScrollY = 0;
let direction: "up" | "down" = "up";

function subscribe(callback: () => void) {
  window.addEventListener("scroll", callback, { passive: true });
  return () => window.removeEventListener("scroll", callback);
}

/** Idempotent for a given scrollY — required by useSyncExternalStore. */
function getSnapshot(): "up" | "down" {
  const currentY = window.scrollY;
  if (currentY < 64) {
    direction = "up";
  } else if (currentY > lastScrollY) {
    direction = "down";
  } else if (currentY < lastScrollY) {
    direction = "up";
  }
  lastScrollY = currentY;
  return direction;
}

function getServerSnapshot(): "up" | "down" {
  return "up";
}

/** "down" once scrolled past the top and moving down; "up" otherwise. Drives the Navbar's hide/show. */
export function useScrollDirection() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
