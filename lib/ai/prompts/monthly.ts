export const monthlyPrompt = {
  id: "monthly",
  version: 1,
  build: (context: unknown) => `Create a structured monthly progress report from the supplied aggregates.
Return JSON matching the requested report schema. Be specific without overstating measurement precision. Do not diagnose or recommend medication.

${JSON.stringify(context)}`,
} as const;
