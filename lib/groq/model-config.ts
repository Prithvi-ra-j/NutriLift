export type AiTask =
  | "coach_chat"
  | "daily_insight"
  | "food_parse"
  | "exercise_parse"
  | "inbody_parse"
  | "weekly_review"
  | "periodic_report";

const DEFAULT_MODEL = "openai/gpt-oss-120b";

export const AI_MODELS: Record<AiTask, string> = {
  coach_chat: DEFAULT_MODEL,
  daily_insight: DEFAULT_MODEL,
  food_parse: DEFAULT_MODEL,
  exercise_parse: DEFAULT_MODEL,
  inbody_parse: DEFAULT_MODEL,
  weekly_review: DEFAULT_MODEL,
  periodic_report: DEFAULT_MODEL,
};