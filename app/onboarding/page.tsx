import type { Metadata } from "next";
import Link from "next/link";
import { OnboardingForm } from "@/components/OnboardingForm";
import { getCurrentUser } from "@/lib/server/auth";
import { isSupabaseConfigured } from "@/lib/server/supabase";

export const metadata: Metadata = { title: "My support card" };

export default async function OnboardingPage() {
  const configured = isSupabaseConfigured();
  const user = configured ? await getCurrentUser() : null;

  return (
    <main id="main" className="content-page">
      <span className="eyebrow">Optional calm-time setup</span>
      <h1>Create a support card, not a medical record.</h1>
      <p>
        Save a few general preferences that Haven can use to pre-fill future
        planning. Do not enter substance history, diagnoses, medication, or a
        precise address.
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
          <h2>Sign in only if you want to save this card.</h2>
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
