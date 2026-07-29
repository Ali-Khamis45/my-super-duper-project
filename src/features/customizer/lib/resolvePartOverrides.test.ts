import { describe, expect, it } from "vitest";

import { DEFAULT_SELECTION } from "@/stores/customizer-store";

import { resolveCupColor } from "../data/colors";
import { resolveMaterialPreset } from "../data/materials";
import { resolvePartOverrides } from "./resolvePartOverrides";

describe("resolvePartOverrides", () => {
  it("maps the default selection to visible cup/sleeve/lid/logo with the default color and glossy finish", () => {
    const { partOverrides, cupScale } = resolvePartOverrides(DEFAULT_SELECTION);
    expect(cupScale).toBe(1);
    const glossy = resolveMaterialPreset("glossy");
    expect(partOverrides.cup?.materialOverrides?.color).toBe(resolveCupColor(DEFAULT_SELECTION.color).hex);
    expect(partOverrides.cup?.materialOverrides).toMatchObject({
      roughness: glossy.roughness,
      metalness: glossy.metalness,
      clearcoat: glossy.clearcoat,
    });
    expect(partOverrides.sleeve?.visible).toBe(true);
    expect(partOverrides.lid?.visible).toBe(true);
    expect(partOverrides.logo?.visible).toBe(true);
  });

  it("hides the sleeve when the sleeve variant is 'none'", () => {
    const { partOverrides } = resolvePartOverrides({ ...DEFAULT_SELECTION, sleeve: "none" });
    expect(partOverrides.sleeve).toEqual({ visible: false });
  });

  it("hides the lid when the lid variant is 'none'", () => {
    const { partOverrides } = resolvePartOverrides({ ...DEFAULT_SELECTION, lid: "none" });
    expect(partOverrides.lid).toEqual({ visible: false });
  });

  it("hides the logo when the logo variant is 'none'", () => {
    const { partOverrides } = resolvePartOverrides({ ...DEFAULT_SELECTION, logo: "none" });
    expect(partOverrides.logo).toEqual({ visible: false });
  });

  it("applies the chosen material finish uniformly to cup, sleeve, and lid", () => {
    const { partOverrides } = resolvePartOverrides({ ...DEFAULT_SELECTION, material: "metallic" });
    const preset = resolveMaterialPreset("metallic");
    const finish = { roughness: preset.roughness, metalness: preset.metalness, clearcoat: preset.clearcoat };
    expect(partOverrides.cup?.materialOverrides).toMatchObject(finish);
    expect(partOverrides.sleeve?.materialOverrides).toMatchObject(finish);
    expect(partOverrides.lid?.materialOverrides).toMatchObject(finish);
  });

  it("maps each size id to a distinct, real scale factor", () => {
    const small = resolvePartOverrides({ ...DEFAULT_SELECTION, size: "small" }).cupScale;
    const medium = resolvePartOverrides({ ...DEFAULT_SELECTION, size: "medium" }).cupScale;
    const large = resolvePartOverrides({ ...DEFAULT_SELECTION, size: "large" }).cupScale;
    expect(small).toBeLessThan(medium);
    expect(medium).toBeLessThan(large);
  });
});
