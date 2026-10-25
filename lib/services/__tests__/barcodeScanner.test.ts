import {
  buildOFFUserAgent,
  lookupOpenFoodFacts,
  validateAndNormalizeOFF,
} from "../barcodeScanner";

jest.mock("../../logger", () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe("Open Food Facts normalization", () => {
  const originalContactEmail = process.env.EXPO_PUBLIC_OFF_CONTACT_EMAIL;

  beforeEach(() => {
    process.env.EXPO_PUBLIC_OFF_CONTACT_EMAIL = "support@example.com";
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
    if (originalContactEmail === undefined) {
      delete process.env.EXPO_PUBLIC_OFF_CONTACT_EMAIL;
    } else {
      process.env.EXPO_PUBLIC_OFF_CONTACT_EMAIL = originalContactEmail;
    }
  });

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

  it("checks the HTTP response and sends the contact User-Agent", async () => {
    const fetch = jest.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: false,
      status: 503,
    } as Response);

    await expect(lookupOpenFoodFacts("0000000000000")).rejects.toThrow(
      "Open Food Facts returned HTTP 503.",
    );
    expect(fetch).toHaveBeenCalledWith(
      "https://world.openfoodfacts.org/api/v2/product/0000000000000.json",
      expect.objectContaining({
        headers: { "User-Agent": "NutriLift/1.0.0 (support@example.com)" },
        signal: expect.any(AbortSignal),
      }),
    );
  });

  it("aborts an Open Food Facts request after six seconds", async () => {
    jest.useFakeTimers();
    const fetch = jest.spyOn(globalThis, "fetch").mockImplementation(
      (_input, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            const error = new Error("Request aborted");
            error.name = "AbortError";
            reject(error);
          });
        }),
    );

    const request = lookupOpenFoodFacts("0000000000000");
    const rejection = expect(request).rejects.toMatchObject({ name: "AbortError" });
    await jest.advanceTimersByTimeAsync(6_000);
    await rejection;
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
