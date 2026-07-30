import { describe, expect, it } from "vitest";

import { formatCategoryCode } from "./formatCategoryCode";

describe("formatCategoryCode", () => {
  it("title-cases a single-word code", () => {
    expect(formatCategoryCode("espresso")).toBe("Espresso");
  });

  it("title-cases each hyphenated word", () => {
    expect(formatCategoryCode("cold-brew")).toBe("Cold Brew");
  });
});
