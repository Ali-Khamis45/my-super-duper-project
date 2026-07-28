import { describe, expect, it } from "vitest";

import { createPartRegistry } from "./createPartRegistry";

function Fake() {
  return null;
}
function FakeModel() {
  return null;
}

describe("createPartRegistry", () => {
  it("resolves a registered procedural implementation by default", () => {
    const registry = createPartRegistry<"a", object>();
    registry.register("a", "procedural", Fake);
    expect(registry.resolve("a")).toBe(Fake);
  });

  it("resolves the requested implementation when both are registered", () => {
    const registry = createPartRegistry<"a", object>();
    registry.register("a", "procedural", Fake);
    registry.register("a", "model", FakeModel);
    expect(registry.resolve("a", "model")).toBe(FakeModel);
    expect(registry.resolve("a", "procedural")).toBe(Fake);
  });

  it("falls back to procedural when the requested implementation is unregistered", () => {
    const registry = createPartRegistry<"a", object>();
    registry.register("a", "procedural", Fake);
    expect(registry.resolve("a", "model")).toBe(Fake);
  });

  it("throws a clear error for a completely unregistered name", () => {
    const registry = createPartRegistry<"a", object>();
    expect(() => registry.resolve("a")).toThrow(/No implementation registered/);
  });

  it("keeps two registry instances independent (proves genericity, not a shared singleton)", () => {
    const registryA = createPartRegistry<"x", object>();
    const registryB = createPartRegistry<"x", object>();
    registryA.register("x", "procedural", Fake);
    expect(() => registryB.resolve("x")).toThrow();
  });
});
