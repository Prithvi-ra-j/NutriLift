import { AiError, chat } from "./gateway";
import { applyCoachGuardrails, clampTargets, type NutritionTargets } from "./guardrails";
import { CoachResponseSchema, parseJsonLoose } from "./schemas";

type ConversationMessage = {
  role: "user" | "assistant";
  content: string;
};

export async function generateCoachReply(
  systemPrompt: string,
  history: ConversationMessage[],
  currentTargets: NutritionTargets,
  minimumCalories: number,
): Promise<string> {
  const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
    { role: "system", content: systemPrompt },
    ...history,
  ];
  let previousResponse: string | null = null;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const requestMessages = [...messages];
    if (attempt > 0) {
      requestMessages[0] = {
        role: "system",
        content: `${systemPrompt}\nThe previous response was invalid. Correct its JSON structure and return only the required JSON object.`,
      };
      if (previousResponse) {
        requestMessages.push({ role: "assistant", content: previousResponse.slice(0, 12_000) });
      }
    }
    const response = await chat({
      messages: requestMessages,
      response_format: "json_object",
      temperature: attempt === 0 ? 0.4 : 0,
      max_tokens: 1_000,
    });
    const raw = response.choices[0]?.message.content;
    if (!raw) {
      previousResponse = null;
      continue;
    }

    let candidate: unknown;
    try {
      candidate = parseJsonLoose(raw);
    } catch (error) {
      if (!(error instanceof SyntaxError)) throw error;
      previousResponse = raw;
      continue;
    }
    const parsed = CoachResponseSchema.safeParse(candidate);
    if (!parsed.success) {
      previousResponse = raw;
      continue;
    }

    let result = applyCoachGuardrails(parsed.data.message, minimumCalories);
    if (parsed.data.target_suggestion) {
      const targets = clampTargets(
        parsed.data.target_suggestion,
        currentTargets,
        minimumCalories,
      );
      result += `\n\nSuggested targets (not saved): ${targets.calories} kcal, ${targets.protein_g} g protein, ${targets.carbs_g} g carbs, ${targets.fat_g} g fat.`;
    }
    return result;
  }

  throw new AiError(
    "bad_response",
    "The coach response could not be validated. Please try again.",
  );
}
