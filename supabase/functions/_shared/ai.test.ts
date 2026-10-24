import { chatRequestSchema } from "./ai-schema.ts";

Deno.test("strict AI request validation rejects unsupported provider fields", () => {
  const validRequest = {
    messages: [{ role: "user", content: "A valid request." }],
  };
  for (const field of ["n", "tools", "max_completion_tokens", "reasoning_effort"]) {
    const request = { ...validRequest, [field]: 1 };
    if (chatRequestSchema.safeParse(request).success) {
      throw new Error(`The strict request schema accepted unsupported field "${field}".`);
    }
  }
});
