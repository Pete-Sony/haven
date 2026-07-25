import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { VoiceCompanion } from "@/features/companion/VoiceCompanion";
import { requireCompletedAccount } from "@/server/auth";
import { isSupabaseConfigured } from "@/server/supabase";

export const metadata: Metadata = { title: "Talk to Haven" };

export default async function CompanionPage() {
  const configured = isSupabaseConfigured();

  if (!configured) {
    return (
      <main id="main" tabIndex={-1} className="content-page">
        <span className="eyebrow">Talk to Haven</span>
        <h1>Private voice sessions are not available right now.</h1>
        <p>
          A voice session needs a private signed-in account. Zero-typing
          immediate support and emergency calls remain available without one.
        </p>
        <Link className="primary-button" href="/">
          Use immediate support
        </Link>
      </main>
    );
  }

  const access = await requireCompletedAccount();
  if (access.status === "unauthenticated") {
    redirect("/auth?next=/companion");
  }
  if (access.status === "onboarding_required") {
    redirect("/onboarding");
  }

  return <VoiceCompanion />;
}
