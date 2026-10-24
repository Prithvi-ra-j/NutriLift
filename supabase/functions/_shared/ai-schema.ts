import { z } from "npm:zod@3.25.76";

export const chatRequestSchema = z.object({
  messages: z.array(z.object({
    role: z.enum(["system", "user", "assistant"]),
    content: z.string().min(1).max(12_000),
  }).strict()).min(1).max(30),
  response_format: z.enum(["text", "json_object"]).optional(),
  temperature: z.number().min(0).max(1.5).optional(),
  max_tokens: z.number().int().min(1).max(1_500).optional(),
}).strict();

export type ChatRequest = z.infer<typeof chatRequestSchema>;
