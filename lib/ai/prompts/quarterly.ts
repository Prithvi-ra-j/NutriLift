export const quarterlyPrompt = {
  id: "quarterly",
  version: 1,
  build: (context: unknown) => `Summarize the quarter using the supplied monthly aggregates and summaries.
Highlight training consistency, nutrition patterns, and one practical focus. Do not diagnose or recommend medication.

${JSON.stringify(context)}`,
} as const;
