import { buildOFFUserAgent, validateAndNormalizeOFF } from "../barcodeScanner";

describe("Open Food Facts normalization", () => {
  it("includes the configured contact in the required User-Agent", () => {
    expect(buildOFFUserAgent(" support@example.com ")).toBe(
      "NutriLift/1.0.0 (support@example.com)",
    );
    expect(() => buildOFFUserAgent(" ")).toThrow(
      "Set EXPO_PUBLIC_OFF_CONTACT_EMAIL",
    );
  });

  it("preserves zero-valued macros and converts sodium grams to milligrams", () => {
    const food = validateAndNormalizeOFF(
      {
        code: "0000000000000",
        product_name: "Water",
        nutriments: {
          "energy-kcal_100g": "0",
          proteins_100g: "0",
          carbohydrates_100g: "0",
          fat_100g: "0",
          fiber_100g: "0",
          sugars_100g: "0",
          sodium_100g: "0.012",
        },
      },
      "0000000000000",
    );

    expect(food.per100g).toMatchObject({
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      fiber: 0,
      sugar: 0,
      sodium: 12,
    });
    expect(food.dataQuality).toBe("consistent");
    expect(food.warnings).toEqual([]);
  });
});
