import type { Metadata } from "next";

export const metadata: Metadata = { title: "Terms" };

export default function TermsPage() {
  return (
    <main id="main" tabIndex={-1} className="content-page">
      <span className="eyebrow">Haven terms</span>
      <h1>Recovery support, not medical care.</h1>
      <p>
        Haven uses generative AI to personalize bounded recovery and prevention
        support. It does not diagnose, prescribe, monitor, dispatch emergency
        services, or replace qualified professional care.
      </p>
      <h2>Emergency use</h2>
      <p>
        If there is immediate danger in India, call 112. A phone call begins
        only after you tap and confirm through your device.
      </p>
      <h2>External services</h2>
      <p>
        Phone networks, support lines, Google, Gemini, and Supabase are operated
        by third parties under their own terms. Service availability can change.
      </p>
      <h2>Age and geography</h2>
      <p>
        Haven is designed for adults and currently provides verified call
        options for India.
      </p>
    </main>
  );
}
