import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { HabitCheckin } from "@/features/habits/HabitCheckin";
import { requireCompletedAccount } from "@/server/auth";

export const metadata: Metadata = { title: "Daily check-in" };

export default async function CheckInPage() {
  const access = await requireCompletedAccount();
  if (access.status === "unauthenticated") {
    redirect("/auth?next=/check-in");
  }
  if (access.status === "onboarding_required") {
    redirect("/onboarding");
  }

  return (
    <main id="main" tabIndex={-1} className="content-page">
      <span className="eyebrow">Zero-typing daily logger</span>
      <h1>Notice whether a helpful practice persists.</h1>
      <p>
        A small daily record can show what you practiced over time. It is not a
        diagnosis, risk score, or measure of recovery.
      </p>
      <HabitCheckin />
    </main>
  );
}
