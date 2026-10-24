import { AiError, chat } from "./gateway";
import { parseJsonLoose } from "./schemas";
import { z, type ZodType } from "zod";

type StructuredPrompt = {
  id: string;
  version: number;
  build: () => string;
};

export async function requestStructured<S extends ZodType>(
  prompt: StructuredPrompt,
  userText: string,
  schema: S,
): Promise<z.output<S>> {
  const systemPrompt = prompt.build();
  let previousResponse: string | null = null;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
      {
        role: "system",
        content: `${systemPrompt}\nReturn exactly one JSON object and no markdown.${
          attempt === 0
            ? ""
            : "\nThe previous response was invalid. Return a corrected JSON object matching the schema."
        }`,
      },
      { role: "user", content: userText },
    ];
    if (previousResponse) {
      messages.push({ role: "assistant", content: previousResponse.slice(0, 12_000) });
    }
    const response = await chat({
      messages,
      response_format: "json_object",
      temperature: attempt === 0 ? 0.1 : 0,
      max_tokens: 1_500,
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
    const result = schema.safeParse(candidate);
    if (result.success) return result.data;
    previousResponse = raw;
  }

  throw new AiError(
    "bad_response",
    `Could not safely validate the ${prompt.id} response. Please review or enter the information manually.`,
  );
}
