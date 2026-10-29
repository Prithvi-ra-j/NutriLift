import {
  ChatRequestSchema,
  FoodParseSchema,
  parseJsonLoose,
} from "../schemas";
import { AI_SAFETY_RESPONSE, containsEatingSafetyRisk } from "../riskPhrases";
import { clampTargets } from "../guardrails";
import { COACH_SAFETY_RULES, coachPrompt } from "../prompts/coach";

describe("AI output validation", () => {
  it("accepts fenced JSON followed by explanatory prose", () => {
    expect(parseJsonLoose('```json\n{"ok":true}\n```\nDone.')).toEqual({ ok: true });
  });

  it("rejects truncated JSON for the one-time repair path", () => {
    expect(() => parseJsonLoose('{"items":[{"name":"oats"')).toThrow(SyntaxError);
  });

  it("accepts a valid food response and marks implausible macros for review", () => {
    const result = FoodParseSchema.parse({
      items: [{
        name: "Oats",
        calories: 900,
        protein_g: 10,
        carbs_g: 40,
        fat_g: 5,
        confidence: "low",
      }],
    });
    const item = result.items.at(0);
    if (!item) throw new Error("Expected one parsed food item.");
    expect(item.needs_review).toBe(true);
    expect(item.quantity).toBe("1 serving");
  });

  it("rejects food responses outside the allowlisted schema", () => {
    expect(FoodParseSchema.safeParse({
      items: [{
        name: "Oats",
        calories: 3001,
        protein_g: 10,
        carbs_g: 40,
        fat_g: 5,
        confidence: "high",
      }],
    }).success).toBe(false);
  });

  it("rejects unsupported chat request fields", () => {
    const valid = { messages: [{ role: "user", content: "Hello" }] };
    for (const field of ["n", "tools", "max_completion_tokens", "reasoning_effort"]) {
      expect(ChatRequestSchema.safeParse({ ...valid, [field]: 1 }).success).toBe(false);
    }
  });
});

describe("AI safety controls", () => {
  it.each([
    "I have been restricting food all week.",
    "I purge after meals.",
    "I binged and feel out of control.",
    "I feel ashamed about eating.",
    "I hate myself.",
    "I don't deserve to eat.",
    "My body is disgusting.",
    "I am worthless.",
    "I should punish myself for eating.",
  ])("flags eating-safety risk: %s", (text) => {
    expect(containsEatingSafetyRisk(text)).toBe(true);
  });

  it.each([
    "I want a balanced breakfast before training.",
    "Can you suggest a simple meal with protein?",
    "I hate how long food prep takes.",
  ])("does not flag ordinary food questions: %s", (text) => {
    expect(containsEatingSafetyRisk(text)).toBe(false);
  });

  it("uses the supportive fixed message for a risk response", () => {
    expect(AI_SAFETY_RESPONSE).toContain("https://findahelpline.com");
  });

  it("includes the required safety block in the coach prompt", () => {
    expect(coachPrompt.build({ data: {}, minimumCalories: 1500 })).toContain(COACH_SAFETY_RULES);
    expect(COACH_SAFETY_RULES).toContain("give no numbers");
    expect(COACH_SAFETY_RULES).toContain("never recommend a daily intake below MIN_CALORIE_FLOOR");
  });

  it("enforces the calorie floor and a maximum weekly change of 10 percent", () => {
    expect(clampTargets(
      { calories: 900, protein_g: 300, carbs_g: 0, fat_g: 0 },
      { calories: 1_600, protein_g: 100, carbs_g: 150, fat_g: 60 },
    )).toEqual({
      calories: 1_500,
      protein_g: 110,
      carbs_g: 135,
      fat_g: 54,
    });
  });
});
