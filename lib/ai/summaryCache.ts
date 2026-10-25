import { eq } from "drizzle-orm";
import { sha256 } from "@noble/hashes/sha256";
import { aiSummaryCache } from "../data/db/schema";
import { db } from "../data/db/client";
import { inTx } from "../data/db/tx";
import { nowIso } from "../time/clock";

const inFlight = new Map<string, Promise<string>>();

function hashInputs(inputs: unknown): string {
  const serialized = JSON.stringify(inputs);
  return Array.from(sha256(serialized), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function getOrGenerateAiSummary(
  period: string,
  promptVersion: string,
  inputs: unknown,
  generate: () => Promise<string>,
): Promise<string> {
  const inputHash = hashInputs(inputs);
  const key = `${period}:${promptVersion}:${inputHash}`;
  const pending = inFlight.get(key);
  if (pending) return pending;

  const task = (async () => {
    const [cached] = await db
      .select()
      .from(aiSummaryCache)
      .where(eq(aiSummaryCache.period, period))
      .limit(1);
    if (
      cached?.input_hash === inputHash &&
      cached.prompt_version === promptVersion
    ) {
      return cached.output_text;
    }

    const output = await generate();
    await inTx(async () => {
      await db
        .insert(aiSummaryCache)
        .values({
          period,
          input_hash: inputHash,
          output_text: output,
          prompt_version: promptVersion,
          updated_at: nowIso(),
        })
        .onConflictDoUpdate({
          target: aiSummaryCache.period,
          set: {
            input_hash: inputHash,
            output_text: output,
            prompt_version: promptVersion,
            updated_at: nowIso(),
          },
        });
    });
    return output;
  })();

  inFlight.set(key, task);
  try {
    return await task;
  } finally {
    if (inFlight.get(key) === task) inFlight.delete(key);
  }
}
