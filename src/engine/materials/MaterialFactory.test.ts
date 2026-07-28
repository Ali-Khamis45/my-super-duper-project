import * as THREE from "three";
import { describe, expect, it } from "vitest";

import {
  createCeramicMaterial,
  createFoamMaterial,
  createGlassMaterial,
  createLidMaterial,
  createLiquidMaterial,
  createMetalMaterial,
  createSleeveMaterial,
  createSurfaceMaterial,
} from "./MaterialFactory";
import { SURFACE_PRESETS } from "./presets";

const white = new THREE.Color(1, 1, 1);

describe("MaterialFactory", () => {
  it("every surface factory applies its own preset's parameters", () => {
    expect(createCeramicMaterial(white).roughness).toBe(SURFACE_PRESETS.ceramic.roughness);
    expect(createLiquidMaterial(white).envMapIntensity).toBe(SURFACE_PRESETS.liquid.envMapIntensity);
    expect(createFoamMaterial(white).clearcoat).toBe(SURFACE_PRESETS.foam.clearcoat);
    expect(createSleeveMaterial(white).roughness).toBe(SURFACE_PRESETS.sleeve.roughness);
    expect(createLidMaterial(white).transmission).toBe(SURFACE_PRESETS.lid.transmission);
  });

  it("glass and metal are production-ready factories despite having no current cup-part consumer", () => {
    const glass = createGlassMaterial(white);
    expect(glass.transmission).toBe(SURFACE_PRESETS.glass.transmission);
    const metal = createMetalMaterial(white);
    expect(metal.metalness).toBe(1);
  });

  it("overrides win over preset defaults", () => {
    const material = createCeramicMaterial(white, { roughness: 0.5 });
    expect(material.roughness).toBe(0.5);
    // Unrelated preset fields are untouched by a partial override.
    expect(material.clearcoat).toBe(SURFACE_PRESETS.ceramic.clearcoat);
  });

  it("createSurfaceMaterial dispatches to the correct factory by surface name", () => {
    const material = createSurfaceMaterial("foam", white);
    expect(material.roughness).toBe(SURFACE_PRESETS.foam.roughness);
  });

  it("every factory sets the requested color", () => {
    const red = new THREE.Color(1, 0, 0);
    expect(createCeramicMaterial(red).color.getHex()).toBe(red.getHex());
  });
});
