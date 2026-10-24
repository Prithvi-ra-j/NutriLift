export const yearlyPrompt = {
  id: "yearly",
  version: 1,
  build: (context: unknown) => `Summarize the year using the supplied quarterly aggregates and summaries.
Distinguish measured facts from estimates. Do not diagnose or recommend medication.

${JSON.stringify(context)}`,
} as const;
