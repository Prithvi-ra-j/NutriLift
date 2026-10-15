import { parseFoodFromText } from "../../groq/parseFood";
import { parseFoodLocally } from "../../data/local-food-parser";
import { parseFoodInput } from "../parsers";

jest.mock("../../groq/parseFood", () => ({
  parseFoodFromText: jest.fn(),
}));

jest.mock("../../data/local-food-parser", () => ({
  parseFoodLocally: jest.fn(),
}));

const localResult = {
  items: [{
    name: "Whole egg",
    quantity: "2 eggs",
    quantity_g: 100,
    calories: 143,
    protein_g: 12.6,
    carbs_g: 0.7,
    fat_g: 9.5,
    fiber_g: 0,
    confidence: "high" as const,
  }],
  meal_suggestion: "breakfast" as const,
  parse_notes: "Local estimate",
  unresolved_items: [] as string[],
  source: "local" as const,
};

const aiResult = {
  items: [{
    name: "Homemade biryani",
    quantity: "1 plate",
    quantity_g: 300,
    calories: 550,
    protein_g: 22,
    carbs_g: 70,
    fat_g: 18,
    fiber_g: 4,
    confidence: "low" as const,
  }],
  meal_suggestion: null,
  parse_notes: "Recipe varies",
  source: "ai" as const,
};

const mockedLocalParser = jest.mocked(parseFoodLocally);
const mockedAiParser = jest.mocked(parseFoodFromText);

describe("parseFoodInput", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns fully resolved catalogue results without calling AI", async () => {
    mockedLocalParser.mockReturnValue(localResult);

    await expect(parseFoodInput("2 eggs for breakfast")).resolves.toMatchObject({ ...localResult, locale: "en-IN" });

    expect(mockedAiParser).not.toHaveBeenCalled();
  });

  it("accepts the full contextual input contract and applies the requested meal type", async () => {
    mockedLocalParser.mockReturnValue(localResult);
    const result = await parseFoodInput({
      rawText: "2 eggs",
      locale: "en-IN",
      localDate: "2026-10-15",
      mealType: "dinner",
    });
    expect(result.local_date).toBe("2026-10-15");
    expect(result.locale).toBe("en-IN");
    expect(result.meal_suggestion).toBe("dinner");
  });

  it("rejects an invalid local calendar date before parsing", async () => {
    await expect(parseFoodInput({ rawText: "2 eggs", locale: "en-IN", localDate: "2026-02-30" })).rejects.toThrow();
    expect(mockedLocalParser).not.toHaveBeenCalled();
  });

  it("uses AI for unresolved items and preserves local meal context", async () => {
    mockedLocalParser.mockReturnValue({
      ...localResult,
      unresolved_items: ["homemade biryani"],
    });
    mockedAiParser.mockResolvedValue(aiResult);

    const result = await parseFoodInput("2 eggs and homemade biryani for breakfast");

    expect(mockedAiParser).toHaveBeenCalledWith("2 eggs and homemade biryani for breakfast", { locale: "en-IN" });
    expect(result.items).toEqual(aiResult.items);
    expect(result.meal_suggestion).toBe("breakfast");
    expect(result.parse_notes).toContain("Recipe varies");
    expect(result.parse_notes).toContain("homemade biryani");
  });

  it("keeps local matches when AI fallback fails", async () => {
    mockedLocalParser.mockReturnValue({
      ...localResult,
      unresolved_items: ["homemade biryani"],
    });
    mockedAiParser.mockRejectedValue(new Error("provider unavailable"));

    const result = await parseFoodInput("2 eggs and homemade biryani");

    expect(result.items).toEqual(localResult.items);
    expect(result.parse_notes).toContain("AI fallback unavailable");
    expect(result.parse_notes).toContain("homemade biryani");
  });

  it("surfaces a useful error when neither local parsing nor AI can resolve input", async () => {
    mockedLocalParser.mockReturnValue({
      ...localResult,
      items: [],
      meal_suggestion: null,
      parse_notes: "No catalogue matches found.",
      unresolved_items: ["unknown recipe"],
    });
    mockedAiParser.mockRejectedValue(new Error("provider unavailable"));

    await expect(parseFoodInput("unknown recipe")).rejects.toThrow(
      "Food parsing failed: provider unavailable",
    );
  });
});
