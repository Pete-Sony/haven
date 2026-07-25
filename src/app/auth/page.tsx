import type { Metadata } from "next";
import Link from "next/link";
import { AuthForm } from "@/features/auth/AuthForm";
import { getCurrentUser, safeNextPath } from "@/server/auth";
import { isGoogleOAuthEnabled, isSupabaseConfigured } from "@/server/supabase";

export const metadata: Metadata = { title: "Account" };

interface AuthPageProps {
  readonly searchParams: Promise<{
    error?: string | string[];
    next?: string | string[];
  }>;
}

const ERROR_MESSAGES: Readonly<Record<string, string>> = {
  accounts_unavailable: "Account access is unavailable right now.",
  sign_in_failed: "We could not sign you in. Please try again.",
};

export default async function AuthPage({ searchParams }: AuthPageProps) {
  const params = await searchParams;
  const requestedNext = Array.isArray(params.next)
    ? params.next[0]
    : params.next;
  const nextPath = safeNextPath(requestedNext, "/onboarding");
  const errorCode = Array.isArray(params.error)
    ? params.error[0]
    : params.error;
  const initialError = errorCode ? ERROR_MESSAGES[errorCode] : undefined;
  const configured = isSupabaseConfigured();
  const user = configured ? await getCurrentUser() : null;

  return (
    <main id="main" tabIndex={-1} className="content-page">
      <span className="eyebrow">Your Haven account</span>
      <h1>Keep personalized support available across devices.</h1>
      {!configured && (
        <section className="plan-card">
          <h2>Account access is not configured.</h2>
          <p>
            You can still use Haven&apos;s immediate support, prevention, and
            emergency routes without an account.
          </p>
          <Link className="primary-button" href="/">
            Use immediate support
          </Link>
        </section>
      )}
      {configured && user && (
        <section className="plan-card">
          <h2>You are signed in.</h2>
          <p>{user.email ?? "Your Haven account is active."}</p>
          <div className="result-actions">
            <a className="primary-button" href={nextPath}>
              Continue
            </a>
            <Link className="secondary-button" href="/onboarding">
              My support card
            </Link>
            <Link className="secondary-button" href="/companion">
              Voice companion
            </Link>
            <Link className="secondary-button" href="/plan">
              My saved plan
            </Link>
          </div>
          <form action={`/api/auth/sign-out?next=/`} method="post">
            <button className="text-button" type="submit">
              Sign out
            </button>
          </form>
        </section>
      )}
      {configured && !user && (
        <AuthForm
          googleEnabled={isGoogleOAuthEnabled()}
          initialError={initialError}
          nextPath={nextPath}
        />
      )}
    </main>
  );
}
