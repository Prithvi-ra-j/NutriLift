export const weeklyPrompt = {
  id: "weekly",
  version: 1,
  build: (context: unknown) => `Summarize this completed week using only the supplied aggregates.
Return a concise, factual summary with one practical focus for next week. Do not diagnose or recommend medication.

${JSON.stringify(context)}`,
} as const;
