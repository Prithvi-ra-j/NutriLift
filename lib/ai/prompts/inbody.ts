export const inbodyPrompt = {
  id: "inbody",
  version: 1,
  build: () => `Extract only values present in the supplied body-composition report.
Return one JSON object matching the requested InBody schema. Use null for missing optional values and list them in missing_fields.
Do not infer measurements or provide health advice.`,
} as const;
