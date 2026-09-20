import { groq } from "./client";
import { AI_MODELS } from "./model-config";
import { safeGroqCall } from "./safeCall";

export interface InBodyParseResult {
  date: string | null;
  weight_kg: number;
  body_fat_pct: number;
  body_fat_mass_kg: number;
  skeletal_muscle_mass_kg: number;
  lean_body_mass_kg: number;
  bmi: number;
  inbody_score: number;
  tbw_l: number | null;
  ecw_tbw_ratio: number | null;
  visceral_fat_level: number | null;
  segmental_muscle: {
    right_arm_kg: number | null;
    left_arm_kg: number | null;
    trunk_kg: number | null;
    right_leg_kg: number | null;
    left_leg_kg: number | null;
  };
  segmental_fat: {
    right_arm_kg: number | null;
    left_arm_kg: number | null;
    trunk_kg: number | null;
    right_leg_kg: number | null;
    left_leg_kg: number | null;
  };
  parse_confidence: "high" | "medium" | "low";
  missing_fields: string[];
}

/**
 * Parse InBody report text into structured body composition data using Groq LLaMA
 */
export async function parseInBodyText(text: string): Promise<InBodyParseResult> {
  return safeGroqCall(async () => {
    const completion = await groq.chat.completions.create({
      model: AI_MODELS.inbody_parse,
      messages: [
        {
          role: "system",
          content: `You are a body composition data extractor. Parse InBody report text and extract ALL metrics.

ALWAYS respond with valid JSON only, no markdown, no explanation, no code blocks.

Use this exact schema:
{
  "date": "YYYY-MM-DD or null",
  "weight_kg": number,
  "body_fat_pct": number,
  "body_fat_mass_kg": number,
  "skeletal_muscle_mass_kg": number,
  "lean_body_mass_kg": number,
  "bmi": number,
  "inbody_score": number,
  "tbw_l": number or null,
  "ecw_tbw_ratio": number or null,
  "visceral_fat_level": number or null,
  "segmental_muscle": {
    "right_arm_kg": number or null,
    "left_arm_kg": number or null,
    "trunk_kg": number or null,
    "right_leg_kg": number or null,
    "left_leg_kg": number or null
  },
  "segmental_fat": {
    "right_arm_kg": number or null,
    "left_arm_kg": number or null,
    "trunk_kg": number or null,
    "right_leg_kg": number or null,
    "left_leg_kg": number or null
  },
  "parse_confidence": "high" | "medium" | "low",
  "missing_fields": ["list of fields not found in text"]
}

Rules:
- Extract every field you can find
- Set fields you cannot find to null
- Add field names to missing_fields array if not found
- Parse dates in YYYY-MM-DD format
- Convert all weights to kg if given in other units
- Mark confidence as "high" if most fields found, "medium" if some missing, "low" if many missing`,
        },
        {
          role: "user",
          content: text,
        },
      ],
      temperature: 0.1,
      max_tokens: 1000,
      response_format: { type: "json_object" },
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    return JSON.parse(raw) as InBodyParseResult;
  }) as Promise<InBodyParseResult>;
}
