import { describe, expect, it } from "vitest";

import { drinks, resolveDrink } from "./drinks";

describe("resolveDrink", () => {
  it("finds a drink by id", () => {
    expect(resolveDrink("classic-espresso")?.name).toBe("Classic Espresso");
  });

  it("returns undefined for an unknown id", () => {
    expect(resolveDrink("not-a-real-drink")).toBeUndefined();
  });

  it("every catalog drink resolves by its own id (no id typos)", () => {
    for (const drink of drinks) {
      expect(resolveDrink(drink.id)).toBe(drink);
    }
  });
});
