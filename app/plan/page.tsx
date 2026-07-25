import type { Metadata } from "next";
import Link from "next/link";
import { PlanForm } from "@/components/PlanForm";
import {
  createSupabaseServerClient,
  isSupabaseConfigured,
} from "@/lib/server/supabase";

export const metadata: Metadata = { title: "My plan" };

export default async function PlanPage() {
  const configured = isSupabaseConfigured();
  const supabase = configured ? await createSupabaseServerClient() : null;
  const { data } = (await supabase?.auth.getUser()) ?? { data: { user: null } };
  return (
    <main id="main" className="content-page">
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
      {configured && !data.user && (
        <section className="plan-card">
          <h2>Sign in only if you want to save.</h2>
          <p>
            Your Haven account is used only for saved features. We do not
            require it during a difficult moment.
          </p>
          <Link className="primary-button" href="/auth?next=/plan">
            Sign in to continue
          </Link>
        </section>
      )}
      {data.user && (
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
