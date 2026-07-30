import { describe, expect, it } from "vitest";

import type { CategoryDto, ProductSummaryDto } from "@/lib/catalog-types";

import { categoryDtoToDrinkCategory, productSummaryToDrink, slugify } from "./mapProductToDrink";

describe("slugify", () => {
  it("lowercases and hyphenates spaces", () => {
    expect(slugify("Classic Espresso")).toBe("classic-espresso");
  });

  it("reproduces every one of the 14 real seeded product names exactly — the load-bearing guarantee cart/customizer/concierge string-matching depends on", () => {
    const names = [
      "Classic Espresso",
      "Cappuccino",
      "Flat White",
      "Caramel Macchiato",
      "Mocha",
      "Original Cold Brew",
      "Nitro Cold Brew",
      "Iced Vanilla Latte",
      "Pumpkin Spice Latte",
      "Peppermint Mocha",
      "Honey Lavender Latte",
      "Matcha Latte",
      "Chai Latte",
      "Jasmine Green Tea",
    ];
    const expectedIds = [
      "classic-espresso",
      "cappuccino",
      "flat-white",
      "caramel-macchiato",
      "mocha",
      "original-cold-brew",
      "nitro-cold-brew",
      "iced-vanilla-latte",
      "pumpkin-spice-latte",
      "peppermint-mocha",
      "honey-lavender-latte",
      "matcha-latte",
      "chai-latte",
      "jasmine-green-tea",
    ];

    expect(names.map(slugify)).toEqual(expectedIds);
  });
});

function makeProductSummaryDto(overrides: Partial<ProductSummaryDto> = {}): ProductSummaryDto {
  return {
    id: "11111111-1111-1111-1111-111111111111",
    sku: "ESP-CLASSIC-001",
    name: "Classic Espresso",
    category: "espresso",
    price: 3.5,
    compareAtPrice: null,
    tagline: "A tagline.",
    description: "A description.",
    tags: ["classic", "strong"],
    status: "published",
    isAvailable: true,
    season: "allyear",
    temperature: "hot",
    ...overrides,
  };
}

describe("productSummaryToDrink", () => {
  it("derives id from the name, keeps the real productId separately", () => {
    const drink = productSummaryToDrink(makeProductSummaryDto());

    expect(drink.id).toBe("classic-espresso");
    expect(drink.productId).toBe("11111111-1111-1111-1111-111111111111");
  });

  it("maps every other field straight through", () => {
    const drink = productSummaryToDrink(makeProductSummaryDto());

    expect(drink).toMatchObject({
      name: "Classic Espresso",
      category: "espresso",
      price: 3.5,
      tagline: "A tagline.",
      description: "A description.",
      tags: ["classic", "strong"],
    });
  });

  it("throws on an unknown category code rather than silently mislabeling a drink", () => {
    expect(() => productSummaryToDrink(makeProductSummaryDto({ category: "brunch" }))).toThrow(/Unknown category code/);
  });
});

describe("categoryDtoToDrinkCategory", () => {
  it("attaches the local icon for a known category code", () => {
    const dto: CategoryDto = { id: "22222222-2222-2222-2222-222222222222", code: "espresso", name: "Espresso", sortOrder: 0 };

    const category = categoryDtoToDrinkCategory(dto);

    expect(category.id).toBe("espresso");
    expect(category.label).toBe("Espresso");
    expect(category.icon).toBeDefined();
  });
});
