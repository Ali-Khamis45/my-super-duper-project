import { beforeEach, describe, expect, it, vi } from "vitest";

import { appEvents } from "@/engine/events";

import { clearShaderDiagnostics, getShaderDiagnostics, recordShaderCompiled, recordShaderFailed, recordShaderPending } from "./diagnostics";

describe("shader diagnostics", () => {
  beforeEach(() => {
    clearShaderDiagnostics();
  });

  it("recordShaderPending sets the pending state", () => {
    recordShaderPending("steam", 1);
    expect(getShaderDiagnostics().get("steam")).toEqual({ state: "pending", version: 1 });
  });

  it("recordShaderCompiled sets compiled state and emits shader:compiled", () => {
    const listener = vi.fn();
    const unsub = appEvents.on("shader:compiled", listener);

    recordShaderCompiled("steam", 1, 12.5);

    expect(getShaderDiagnostics().get("steam")).toEqual({ state: "compiled", version: 1, compileTimeMs: 12.5 });
    expect(listener).toHaveBeenCalledWith({ name: "shader:compiled", shader: "steam" });
    unsub();
  });

  it("recordShaderFailed sets failed state with the error and emits shader:failed", () => {
    const listener = vi.fn();
    const unsub = appEvents.on("shader:failed", listener);

    recordShaderFailed("glow", 1, "compile error");

    expect(getShaderDiagnostics().get("glow")).toEqual({ state: "failed", version: 1, error: "compile error" });
    expect(listener).toHaveBeenCalledWith({ name: "shader:failed", shader: "glow", error: "compile error" });
    unsub();
  });

  it("clearShaderDiagnostics empties the map", () => {
    recordShaderPending("steam", 1);
    clearShaderDiagnostics();
    expect(getShaderDiagnostics().size).toBe(0);
  });
});
