import Link from "next/link";
import { AccountActions } from "@/features/account/AccountActions";
import { requireCompletedAccount } from "@/server/auth";

export default async function AccountPage() {
  const access = await requireCompletedAccount();
  const ready = access.status === "ready";
  const email =
    access.status === "unauthenticated"
      ? null
      : (access.account.user.email ?? null);

  return (
    <main id="main" tabIndex={-1} className="content-page">
      <span className="eyebrow">Your account</span>
      <h1>Manage your Haven data</h1>
      <p>{email ?? "Signed-in Haven account"}</p>

      {!ready && (
        <section className="plan-card">
          <h2>Finish your support setup</h2>
          <p>
            Add a Support Card and trusted contact to unlock saved support,
            habits, and the companion. Immediate help remains available.
          </p>
          <Link className="primary-button" href="/onboarding">
            Complete setup
          </Link>
        </section>
      )}

      <section className="plan-card">
        <h2>Manage personalized support</h2>
        <div className="result-actions">
          <Link className="secondary-button" href="/onboarding">
            Support Card and contact
          </Link>
          <Link className="secondary-button" href="/account/memories">
            Support memories
          </Link>
          <Link className="secondary-button" href="/check-in">
            Habit check-ins
          </Link>
          <Link className="secondary-button" href="/plan">
            Saved prevention plan
          </Link>
        </div>
      </section>

      <AccountActions />
    </main>
  );
}
