import type { Metadata } from "next";
import Link from "next/link";
import { OnboardingForm } from "@/features/onboarding/OnboardingForm";
import { getCurrentUser } from "@/server/auth";
import { isSupabaseConfigured } from "@/server/supabase";

export const metadata: Metadata = { title: "My support card" };

export default async function OnboardingPage() {
  const configured = isSupabaseConfigured();
  const user = configured ? await getCurrentUser() : null;

  return (
    <main id="main" tabIndex={-1} className="content-page">
      <span className="eyebrow">Private account setup</span>
      <h1>Create your support card and trusted call contact.</h1>
      <p>
        These two encrypted records unlock your saved plan, daily check-in, and
        voice companion. Do not enter substance history, diagnoses, medication,
        or a precise address.
      </p>

      {!configured && (
        <section className="plan-card">
          <h2>Encrypted account saving is unavailable.</h2>
          <p>
            You can still use immediate support and the account-free prevention
            planner.
          </p>
          <Link className="primary-button" href="/prevent">
            Plan without an account
          </Link>
        </section>
      )}

      {configured && !user && (
        <section className="plan-card">
          <h2>Sign in to complete your private setup.</h2>
          <p>
            Immediate support and emergency routing remain available without an
            account.
          </p>
          <a className="primary-button" href="/auth?next=/onboarding">
            Sign in to continue
          </a>
          <Link className="text-button" href="/">
            Skip and use Haven
          </Link>
        </section>
      )}

      {user && <OnboardingForm />}
    </main>
  );
}
