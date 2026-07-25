import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Privacy" };

export default function PrivacyPage() {
  return (
    <main id="main" tabIndex={-1} className="content-page">
      <span className="eyebrow">Your privacy in Haven</span>
      <h1>Immediate support without an account.</h1>
      <p>
        Your tap choices and optional voice note are used only to produce the
        current result. The voice note is not intentionally retained after
        processing and is excluded from standard telemetry.
      </p>
      <h2>Optional account data</h2>
      <p>
        If you create an account with email or optional Google sign-in, Haven
        stores the account identifier and only the information you explicitly
        save. Saved plan fields, your optional Support Card, and support
        memories are encrypted by the application before database storage.
      </p>
      <p>
        The Support Card contains general calm-time preferences, not a
        diagnosis, substance history, medication record, or current risk
        assessment. You can review, change, or erase it from{" "}
        <Link href="/onboarding">My support card</Link>.
      </p>
      <p>
        A support memory records only selected situation tags, the first action,
        and whether you marked it “helpful” or “not for me.” It expires after 90
        days. Haven retrieves at most two matching memories to adjust wording or
        action order; a memory can never change emergency routing or serve as
        medical evidence.
      </p>
      <p>
        Talk to Haven sessions stay in browser memory for at most four turns. A
        short recording and the bounded visible session are sent only to produce
        the current transcript and response; Haven does not save the audio,
        transcript, or conversation to your account.
      </p>
      <h2>What we do not collect</h2>
      <ul>
        <li>No automatic crisis or intervention history.</li>
        <li>No saved audio, transcript, generated script, or diagnosis.</li>
        <li>No precise location permission.</li>
        <li>No camera access.</li>
        <li>No background monitoring.</li>
        <li>No sale of health-related data.</li>
      </ul>
      <h2>Your control</h2>
      <p>
        You can use immediate support while signed out. Saving a Support Card or
        support memory requires a separate action and a signed-in account. Saved
        memories can be{" "}
        <Link href="/account/memories">listed and deleted individually</Link>.
        You can request account deletion and a copy of your saved account data.
      </p>
    </main>
  );
}
