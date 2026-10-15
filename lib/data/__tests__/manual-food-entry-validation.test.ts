import { validateManualFoodEntry, type ManualFoodEntryInput } from "../manual-food-entry-validation";

const validInput: ManualFoodEntryInput = {
  name: "Paneer",
  calories: "265",
  protein: "18.3",
  carbs: "1.2",
  fat: "20.8",
  fiber: "",
  quantity: "150",
};

describe("manual food entry validation", () => {
  it("accepts valid values and treats blank optional fiber as null", () => {
    expect(validateManualFoodEntry(validInput)).toEqual({
      valid: true,
      values: { calories: 265, protein: 18.3, carbs: 1.2, fat: 20.8, fiber: null, quantity: 150 },
    });
  });

  it.each([
    ["empty name", { name: " " }],
    ["empty calories", { calories: "" }],
    ["non-finite calories", { calories: "Infinity" }],
    ["zero calories", { calories: "0" }],
    ["negative protein", { protein: "-1" }],
    ["negative carbs", { carbs: "-1" }],
    ["negative fat", { fat: "-1" }],
    ["negative fiber", { fiber: "-1" }],
    ["invalid fiber", { fiber: "NaN" }],
    ["zero quantity", { quantity: "0" }],
    ["infinite quantity", { quantity: "Infinity" }],
  ])("rejects %s", (_label, overrides) => {
    const result = validateManualFoodEntry({ ...validInput, ...overrides } as ManualFoodEntryInput);
    expect(result.valid).toBe(false);
  });

  it("allows zero-valued macros and fiber", () => {
    expect(validateManualFoodEntry({ ...validInput, protein: "0", carbs: "0", fat: "0", fiber: "0" })).toMatchObject({
      valid: true,
      values: { protein: 0, carbs: 0, fat: 0, fiber: 0 },
    });
  });
});
