import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/server/supabase";
import { requireSameOrigin } from "@/server/http";

const DEFAULT_NEXT_PATH = "/";
const MAX_NEXT_PATH_LENGTH = 512;

export function safeNextPath(
  value: string | null | undefined,
  fallback = DEFAULT_NEXT_PATH,
): string {
  if (
    !value ||
    value.length > MAX_NEXT_PATH_LENGTH ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\") ||
    [...value].some((character) => {
      const code = character.charCodeAt(0);
      return code <= 31 || code === 127;
    })
  ) {
    return fallback;
  }

  try {
    const parsed = new URL(value, "https://haven.local");
    if (
      parsed.origin !== "https://haven.local" ||
      parsed.pathname.startsWith("/api/") ||
      parsed.pathname === "/auth/callback"
    ) {
      return fallback;
    }
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
}

export async function getCurrentUser(): Promise<User | null> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;

  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    return error ? null : user;
  } catch {
    return null;
  }
}

export async function getAuthenticatedClient(): Promise<{
  supabase: SupabaseClient;
  user: User;
} | null> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;

  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    return error || !user ? null : { supabase, user };
  } catch {
    return null;
  }
}

export interface AuthenticatedAccount {
  readonly supabase: SupabaseClient;
  readonly user: User;
}

export type AccountAccess =
  | { readonly status: "unauthenticated" }
  | {
      readonly status: "onboarding_required";
      readonly account: AuthenticatedAccount;
    }
  | {
      readonly status: "ready";
      readonly account: AuthenticatedAccount;
    };

/**
 * Central session boundary for private server pages and API routes.
 */
export async function requireUser(): Promise<AuthenticatedAccount | null> {
  return getAuthenticatedClient();
}

/**
 * A completed account has both parts of Haven's minimum safety setup:
 * an encrypted support card and an encrypted E.164 trusted contact.
 */
export async function requireCompletedAccount(): Promise<AccountAccess> {
  const account = await requireUser();
  if (!account) return { status: "unauthenticated" };

  const [profile, contact] = await Promise.all([
    account.supabase
      .from("support_profiles")
      .select("user_id")
      .eq("user_id", account.user.id)
      .maybeSingle(),
    account.supabase
      .from("trusted_contacts")
      .select("user_id")
      .eq("user_id", account.user.id)
      .maybeSingle(),
  ]);

  if (profile.error || contact.error || !profile.data || !contact.data) {
    return { status: "onboarding_required", account };
  }
  return { status: "ready", account };
}

export function isExpectedOrigin(request: Request): boolean {
  return requireSameOrigin(request);
}
