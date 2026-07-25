import type { Metadata } from "next";

export const metadata: Metadata = { title: "Privacy" };

export default function PrivacyPage() {
  return (
    <main id="main" className="content-page">
      <span className="eyebrow">Privacy summary</span>
      <h1>Urgent help without an account.</h1>
      <p>
        Your tap choices and optional voice note are used only to produce the
        current result. The voice note is not intentionally retained after
        processing and is excluded from standard telemetry.
      </p>
      <h2>Optional account data</h2>
      <p>
        If you choose Google sign-in, Haven stores only the account identifier
        and the plan you explicitly save. Saved plan fields are encrypted by the
        application before database storage.
      </p>
      <h2>What we do not collect</h2>
      <ul>
        <li>No precise location permission.</li>
        <li>No camera access.</li>
        <li>No background monitoring.</li>
        <li>No sale of health-related data.</li>
      </ul>
      <h2>Your control</h2>
      <p>
        You can use immediate support while signed out. Account deletion and
        data export are release requirements before real-world clinical use.
      </p>
    </main>
  );
}
