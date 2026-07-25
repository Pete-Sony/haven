import type { Metadata } from "next";
import Link from "next/link";
import { VoiceCompanion } from "@/components/VoiceCompanion";
import {
  createSupabaseServerClient,
  isSupabaseConfigured,
} from "@/lib/server/supabase";

export const metadata: Metadata = { title: "Voice companion" };

export default async function CompanionPage() {
  const configured = isSupabaseConfigured();
  const supabase = configured ? await createSupabaseServerClient() : null;
  const { data } = (await supabase?.auth.getUser()) ?? { data: { user: null } };

  if (!configured) {
    return (
      <main id="main" className="content-page">
        <span className="eyebrow">Voice companion</span>
        <h1>Accounts are not available here.</h1>
        <p>
          The companion requires a private signed-in session. Immediate support
          remains available without an account.
        </p>
        <Link className="primary-button" href="/">
          Use immediate support
        </Link>
      </main>
    );
  }

  if (!data.user) {
    return (
      <main id="main" className="content-page">
        <span className="eyebrow">Voice companion</span>
        <h1>Sign in to start a private session.</h1>
        <p>
          A companion session is limited to four turns and is not saved. Sign-in
          protects the endpoint; it is never required for emergency support.
        </p>
        <Link className="primary-button" href="/auth?next=/companion">
          Sign in to continue
        </Link>
        <Link className="text-button" href="/">
          Use immediate support
        </Link>
      </main>
    );
  }

  return <VoiceCompanion />;
}
