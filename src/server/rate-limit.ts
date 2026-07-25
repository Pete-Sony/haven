import { createHmac, randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { RequestBudget, type BudgetResult } from "@/domain/request-budget";

const shared = globalThis as typeof globalThis & {
  havenBudgetSecret?: string;
  havenShortBudget?: RequestBudget;
  havenDailyBudget?: RequestBudget;
  havenAuthBudget?: RequestBudget;
};

shared.havenBudgetSecret ??=
  process.env.RATE_LIMIT_HMAC_KEY || randomBytes(32).toString("hex");
shared.havenShortBudget ??= new RequestBudget(10, 10 * 60_000);
shared.havenDailyBudget ??= new RequestBudget(30, 24 * 60 * 60_000);
shared.havenAuthBudget ??= new RequestBudget(8, 15 * 60_000);
const budgetSecret = shared.havenBudgetSecret;
const shortBudget = shared.havenShortBudget;
const dailyBudget = shared.havenDailyBudget;
const authBudget = shared.havenAuthBudget;

function requestKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0];
  const networkIdentity =
    forwarded?.trim() ||
    request.headers.get("cf-connecting-ip")?.trim() ||
    "anonymous";
  const suppliedClientId = request.headers.get("x-haven-client-id")?.trim();
  const clientId =
    suppliedClientId &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      suppliedClientId,
    )
      ? suppliedClientId
      : "unidentified-client";
  return createHmac("sha256", budgetSecret)
    .update(`${networkIdentity}:${clientId}`)
    .digest("hex");
}

async function consumeDistributedBudget(
  key: string,
  kind: "ten_minute" | "daily",
  cost: number,
  maximumCost: number,
  windowSeconds: number,
): Promise<BudgetResult | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;

  const client = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await client.rpc("consume_haven_budget", {
    p_identity_hash: key,
    p_budget_kind: kind,
    p_cost: cost,
    p_limit: maximumCost,
    p_window_seconds: windowSeconds,
  });
  if (error) {
    return { allowed: false, remaining: 0, retryAfterSeconds: 60 };
  }
  const row = Array.isArray(data) ? data[0] : null;
  if (
    !row ||
    typeof row.allowed !== "boolean" ||
    typeof row.remaining !== "number" ||
    typeof row.retry_after_seconds !== "number"
  ) {
    return { allowed: false, remaining: 0, retryAfterSeconds: 60 };
  }
  return {
    allowed: row.allowed,
    remaining: row.remaining,
    retryAfterSeconds: row.retry_after_seconds,
  };
}

export async function consumeInterventionBudget(
  request: Request,
  hasAudio: boolean,
): Promise<BudgetResult> {
  const key = requestKey(request);
  const cost = hasAudio ? 3 : 1;
  const distributedShort = await consumeDistributedBudget(
    key,
    "ten_minute",
    cost,
    10,
    10 * 60,
  );
  if (distributedShort) {
    if (!distributedShort.allowed) return distributedShort;
    const distributedDaily = await consumeDistributedBudget(
      key,
      "daily",
      cost,
      30,
      24 * 60 * 60,
    );
    if (distributedDaily && !distributedDaily.allowed) return distributedDaily;
    const globalKey = createHmac("sha256", budgetSecret)
      .update("haven-global-provider-budget")
      .digest("hex");
    const globalDaily = await consumeDistributedBudget(
      globalKey,
      "daily",
      cost,
      1_000,
      24 * 60 * 60,
    );
    if (globalDaily) return globalDaily;
  }

  const shortResult = shortBudget.consume(key, cost);
  if (!shortResult.allowed) return shortResult;
  return dailyBudget.consume(key, cost);
}

export function consumeAuthBudget(request: Request): BudgetResult {
  return authBudget.consume(requestKey(request), 1);
}
