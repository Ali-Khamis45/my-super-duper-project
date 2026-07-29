import { describe, expect, it } from "vitest";

import { blendExplodedOffsets } from "./blendExplodedOffsets";

describe("blendExplodedOffsets", () => {
  it("returns exactly [0,0,0] for every field at explodeAmount 0 — the pre-3.7 default every existing caller still gets", () => {
    const result = blendExplodedOffsets(0);
    expect(result.lidPosition).toEqual([0, 0, 0]);
    expect(result.lidRotation).toEqual([0, 0, 0]);
    expect(result.sleevePosition).toEqual([0, 0, 0]);
  });

  it("returns the full exploded offsets at explodeAmount 1", () => {
    const result = blendExplodedOffsets(1);
    expect(result.lidPosition).toEqual([0.15, 0.95, 0.1]);
    expect(result.lidRotation).toEqual([0.35, 0.9, 0.15]);
    expect(result.sleevePosition).toEqual([-0.1, -0.75, -0.05]);
  });

  it("linearly scales toward the exploded target at a fractional amount", () => {
    const result = blendExplodedOffsets(0.5);
    expect(result.lidPosition[1]).toBeCloseTo(0.475);
    expect(result.sleevePosition[1]).toBeCloseTo(-0.375);
  });

  it("clamps out-of-range input rather than overshooting the exploded target", () => {
    const result = blendExplodedOffsets(1.5);
    expect(result.lidPosition).toEqual(blendExplodedOffsets(1).lidPosition);
    const negative = blendExplodedOffsets(-0.5);
    expect(negative.lidPosition).toEqual([0, 0, 0]);
  });
});
