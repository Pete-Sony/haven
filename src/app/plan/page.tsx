import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PlanForm } from "@/features/plan/PlanForm";
import { requireCompletedAccount } from "@/server/auth";
import { isSupabaseConfigured } from "@/server/supabase";

export const metadata: Metadata = { title: "My plan" };

export default async function PlanPage() {
  const configured = isSupabaseConfigured();
  const access = configured ? await requireCompletedAccount() : null;
  if (access?.status === "unauthenticated") {
    redirect("/auth?next=/plan");
  }
  if (access?.status === "onboarding_required") {
    redirect("/onboarding");
  }
  return (
    <main id="main" tabIndex={-1} className="content-page">
      <span className="eyebrow">For a calmer moment</span>
      <h1>Prepare one future action.</h1>
      <p>
        A saved plan is optional. Immediate support and emergency routing never
        require an account.
      </p>
      {!configured && (
        <section className="plan-card">
          <h2>Account setup is not available yet.</h2>
          <p>
            The cloud account environment is not configured in this deployment.
            The urgent flow remains fully available.
          </p>
          <Link className="primary-button" href="/">
            Use immediate support
          </Link>
        </section>
      )}
      {access?.status === "ready" && (
        <>
          <PlanForm />
          <form action="/api/auth/sign-out" method="post">
            <button className="text-button" type="submit">
              Sign out
            </button>
          </form>
        </>
      )}
    </main>
  );
}
