import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2.56.0";
import type { ChatRequest } from "./ai-schema.ts";

export type UserClient = SupabaseClient;
export type QuotaLease = { day: string; minute: string };
export type QuotaResult =
  | { status: "allowed"; lease: QuotaLease }
  | { status: "rate_limited"; retryAfterSec: number }
  | { status: "unavailable" };

export function createUserClient(authorization: string): UserClient | null {
  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!url || !anonKey) return null;
  return createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: authorization } },
  });
}

export function createUsageClient(): SupabaseClient | null {
  const url = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceRoleKey) return null;
  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function secondsUntilNextMinute(): number {
  return Math.max(1, 60 - new Date().getUTCSeconds());
}

function secondsUntilNextUtcDay(): number {
  const now = new Date();
  const nextUtcDay = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + 1,
  );
  return Math.max(1, Math.ceil((nextUtcDay - now.getTime()) / 1_000));
}

async function refundMinuteQuota(userId: string, minute: string): Promise<boolean> {
  const admin = createUsageClient();
  if (!admin) return false;
  const { error } = await admin.rpc("refund_ai_minute_quota", {
    p_user_id: userId,
    p_minute: minute,
  });
  return !error;
}

export async function consumeQuota(client: UserClient, userId: string): Promise<QuotaResult> {
  const minute = await client.rpc("consume_ai_minute_quota", { p_limit: 10 });
  if (minute.error) return { status: "unavailable" };
  const minuteBucket = minute.data?.[0];
  if (!minuteBucket || typeof minuteBucket.allowed !== "boolean" ||
    typeof minuteBucket.quota_minute !== "string") {
    return { status: "unavailable" };
  }
  if (!minuteBucket.allowed) {
    return { status: "rate_limited", retryAfterSec: secondsUntilNextMinute() };
  }

  const daily = await client.rpc("consume_ai_quota", { p_limit: 100 });
  if (daily.error) {
    if (!(await refundMinuteQuota(userId, minuteBucket.quota_minute))) {
      console.error("[ai] minute quota rollback failed", { userId });
    }
    return { status: "unavailable" };
  }
  const dailyBucket = daily.data?.[0];
  if (!dailyBucket || typeof dailyBucket.allowed !== "boolean" ||
    typeof dailyBucket.quota_day !== "string") {
    if (!(await refundMinuteQuota(userId, minuteBucket.quota_minute))) {
      console.error("[ai] minute quota rollback failed", { userId });
    }
    return { status: "unavailable" };
  }
  if (!dailyBucket.allowed) {
    if (!(await refundMinuteQuota(userId, minuteBucket.quota_minute))) {
      console.error("[ai] minute quota rollback failed", { userId });
      return { status: "unavailable" };
    }
    return { status: "rate_limited", retryAfterSec: secondsUntilNextUtcDay() };
  }
  return {
    status: "allowed",
    lease: { day: dailyBucket.quota_day, minute: minuteBucket.quota_minute },
  };
}

export async function refundQuota(userId: string, lease: QuotaLease): Promise<void> {
  const admin = createUsageClient();
  if (!admin) throw new Error("AI quota refund configuration is unavailable.");
  const [daily, minute] = await Promise.all([
    admin.rpc("refund_ai_quota", { p_user_id: userId, p_day: lease.day }),
    admin.rpc("refund_ai_minute_quota", { p_user_id: userId, p_minute: lease.minute }),
  ]);
  if (daily.error || minute.error) {
    throw new Error("AI quota refund failed.");
  }
}

export async function logUsage(
  requestType: "chat" | "transcription",
  userId: string,
  model: string,
  promptTokens: number | null,
  completionTokens: number | null,
): Promise<boolean> {
  const client = createUsageClient();
  if (!client) return false;
  const { error } = await client.from("ai_usage_log").insert({
    user_id: userId,
    request_type: requestType,
    model,
    prompt_tokens: promptTokens,
    completion_tokens: completionTokens,
  });
  return !error;
}

export function errorResponse(message: string, status: number, retryAfter?: number): Response {
  return Response.json(
    { error: message, ...(retryAfter === undefined ? {} : { retry_after: retryAfter }) },
    { status },
  );
}

export async function authenticate(
  request: Request,
): Promise<{ client: UserClient; userId: string } | Response> {
  const authorization = request.headers.get("Authorization");
  if (!authorization) return errorResponse("Authentication required.", 401);
  const client = createUserClient(authorization);
  if (!client) return errorResponse("AI configuration is incomplete.", 500);
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) return errorResponse("Invalid session.", 401);
  return { client, userId: data.user.id };
}
