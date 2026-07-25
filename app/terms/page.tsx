import type { Metadata } from "next";

export const metadata: Metadata = { title: "Terms" };

export default function TermsPage() {
  return (
    <main id="main" className="content-page">
      <span className="eyebrow">Research prototype terms</span>
      <h1>Support, not medical care.</h1>
      <p>
        Haven is a research and competition prototype. It does not diagnose,
        prescribe, monitor, dispatch emergency services, or replace qualified
        professional care.
      </p>
      <h2>Emergency use</h2>
      <p>
        If there is immediate danger in India, call 112. A phone call begins
        only after you tap and confirm through your device.
      </p>
      <h2>External services</h2>
      <p>
        Phone networks, support lines, source websites, Google, Gemini, and
        Supabase are operated by third parties under their own terms.
        Availability must be rechecked.
      </p>
      <h2>Age and geography</h2>
      <p>
        The prototype is designed for adults and currently uses an India
        reference configuration.
      </p>
    </main>
  );
}
