import { z } from "zod";

export const ChatRequestSchema = z.object({
  messages: z.array(z.object({
    role: z.enum(["system", "user", "assistant"]),
    content: z.string().min(1).max(12_000),
  }).strict()).min(1).max(30),
  response_format: z.enum(["text", "json_object"]).optional(),
  temperature: z.number().min(0).max(1.5).optional(),
  max_tokens: z.number().int().min(1).max(1_500).optional(),
}).strict();

export type ChatRequest = z.infer<typeof ChatRequestSchema>;

export const ChatResponseSchema = z.object({
  choices: z.array(z.object({
    message: z.object({
      content: z.string().nullable(),
    }).passthrough(),
  }).passthrough()).min(1),
  usage: z.object({
    prompt_tokens: z.number().int().nonnegative().optional(),
    completion_tokens: z.number().int().nonnegative().optional(),
  }).passthrough().optional(),
}).passthrough();

export type ChatResponse = z.infer<typeof ChatResponseSchema>;

export const TranscriptionResponseSchema = z.object({
  text: z.string().min(1),
}).strict();

export const FoodParseSchema = z.object({
  items: z.array(z.object({
    name: z.string().trim().min(1).max(80),
    quantity: z.string().max(80).optional(),
    quantity_g: z.number().min(0).nullable().optional(),
    calories: z.number().min(0).max(3_000),
    protein_g: z.number().min(0).max(300),
    carbs_g: z.number().min(0).max(500),
    fat_g: z.number().min(0).max(300),
    fiber_g: z.number().min(0).nullable().optional(),
    confidence: z.enum(["high", "medium", "low"]),
  }).strict()).min(1).max(12),
  meal_suggestion: z.enum(["breakfast", "lunch", "snack", "dinner"]).nullable().optional(),
  parse_notes: z.string().nullable().optional(),
}).strict().transform((result) => ({
  ...result,
  meal_suggestion: result.meal_suggestion ?? null,
  parse_notes: result.parse_notes ?? null,
  items: result.items.map((item) => ({
    ...item,
    quantity: item.quantity ?? "1 serving",
    quantity_g: item.quantity_g ?? null,
    fiber_g: item.fiber_g ?? null,
    needs_review:
      Math.abs(item.calories - (4 * item.protein_g + 4 * item.carbs_g + 9 * item.fat_g)) >
      0.3 * item.calories + 20,
  })),
}));

export type FoodParseResult = z.infer<typeof FoodParseSchema>;
export type ParsedFoodItem = FoodParseResult["items"][number];

export const ParsedSetSchema = z.object({
  weight_kg: z.number().min(0),
  reps: z.number().int().min(0),
  rpe: z.number().min(1).max(10).nullable(),
  is_warmup: z.boolean(),
}).strict();

export const ExerciseParseSchema = z.object({
  exercises: z.array(z.object({
    name: z.string().trim().min(1).max(80),
    muscle_group: z.string().trim().min(1).max(40),
    equipment: z.string().trim().min(1).max(40),
    sets: z.array(ParsedSetSchema).min(1).max(20),
  }).strict()).min(1).max(20),
  day_type_suggestion: z.string().nullable(),
  parse_notes: z.string().nullable(),
}).strict();

export type ExerciseParseResult = z.infer<typeof ExerciseParseSchema>;

const segmentSchema = z.object({
  right_arm_kg: z.number().min(0).nullable(),
  left_arm_kg: z.number().min(0).nullable(),
  trunk_kg: z.number().min(0).nullable(),
  right_leg_kg: z.number().min(0).nullable(),
  left_leg_kg: z.number().min(0).nullable(),
}).strict();

export const InBodyParseSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  weight_kg: z.number().positive(),
  body_fat_pct: z.number().min(0).max(100),
  body_fat_mass_kg: z.number().min(0),
  skeletal_muscle_mass_kg: z.number().min(0),
  lean_body_mass_kg: z.number().min(0),
  bmi: z.number().min(0),
  inbody_score: z.number().min(0).max(100),
  tbw_l: z.number().min(0).nullable(),
  ecw_tbw_ratio: z.number().min(0).nullable(),
  visceral_fat_level: z.number().min(0).nullable(),
  segmental_muscle: segmentSchema,
  segmental_fat: segmentSchema,
  parse_confidence: z.enum(["high", "medium", "low"]),
  missing_fields: z.array(z.string()),
}).strict();

export type InBodyParseResult = z.infer<typeof InBodyParseSchema>;

export const MonthlyReportSchema = z.object({
  executive_summary: z.object({
    headline: z.string().min(1).max(240),
    overall_score: z.number().int().min(1).max(100),
    top_3_wins: z.array(z.string().min(1).max(300)).max(3),
    top_3_areas_to_improve: z.array(z.string().min(1).max(300)).max(3),
  }).strict(),
  nutrition: z.object({
    avg_calories: z.number().min(0).max(10_000),
    avg_protein_g: z.number().min(0).max(1_000),
    adherence_pct: z.number().min(0).max(100),
    key_insights: z.array(z.string().min(1).max(400)).max(5),
  }).strict(),
  strength: z.object({
    total_sessions: z.number().int().min(0).max(100),
    prs_hit: z.number().int().min(0).max(1_000),
    volume_trend: z.enum(["increasing", "stable", "decreasing"]),
    key_insights: z.array(z.string().min(1).max(400)).max(5),
  }).strict(),
  body_composition: z.object({
    weight_change_kg: z.number().min(-100).max(100).nullable(),
    estimated_fat_loss_kg: z.number().min(-100).max(100).nullable(),
    estimated_muscle_gain_kg: z.number().min(-100).max(100).nullable(),
    key_insights: z.array(z.string().min(1).max(400)).max(5),
  }).strict(),
  recovery: z.object({
    avg_sleep_hours: z.number().min(0).max(24).nullable(),
    supplement_adherence_pct: z.number().min(0).max(100),
    key_insights: z.array(z.string().min(1).max(400)).max(5),
  }).strict(),
  next_month_plan: z.object({
    nutrition_adjustments: z.array(z.string().min(1).max(300)).max(5),
    training_adjustments: z.array(z.string().min(1).max(300)).max(5),
    recovery_focus: z.array(z.string().min(1).max(300)).max(5),
  }).strict(),
  ai_narrative: z.string().min(1).max(5_000),
}).strict();

export type MonthlyReportResult = z.infer<typeof MonthlyReportSchema>;
export const SummarySchema = z.object({
  summary: z.string().trim().min(1).max(4_000),
}).strict();

export const CoachResponseSchema = z.object({
  message: z.string().trim().min(1).max(4_000),
  target_suggestion: z.object({
    calories: z.number().positive().max(10_000),
    protein_g: z.number().positive().max(1_000),
    carbs_g: z.number().positive().max(1_000),
    fat_g: z.number().positive().max(1_000),
  }).strict().nullable().optional(),
}).strict();

export function parseJsonLoose(raw: string): unknown {
  const unfenced = raw.replace(/```(?:json)?/gi, "").trim();
  const start = unfenced.indexOf("{");
  const end = unfenced.lastIndexOf("}");
  if (start < 0 || end < start) {
    throw new SyntaxError("AI response did not contain a JSON object.");
  }
  return JSON.parse(unfenced.slice(start, end + 1)) as unknown;
}
