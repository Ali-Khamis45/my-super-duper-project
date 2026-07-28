import { useSyncExternalStore } from "react";

let cachedResult: boolean | null = null;

function probeWebGL(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") ?? canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

function subscribe() {
  return () => {};
}

function getSnapshot() {
  cachedResult ??= probeWebGL();
  return cachedResult;
}

function getServerSnapshot() {
  return false;
}

/** WebGL support doesn't change mid-session, so this is a one-time probe, cached and never re-checked. */
export function useWebGLSupport() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
