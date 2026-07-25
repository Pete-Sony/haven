import type { Metadata } from "next";
import { Phone } from "lucide-react";
import { INDIA_CALL_NUMBERS, telephoneHref } from "@/features/calls/call-links";

export const metadata: Metadata = { title: "Report a concern" };

export default function ReportPage() {
  return (
    <main id="main" tabIndex={-1} className="content-page">
      <span className="eyebrow">Safety and support</span>
      <h1>Choose immediate human help when you need it.</h1>
      <p>
        Haven does not operate a monitored support or clinical inbox. Do not
        submit personal, health, or contact information through a public
        website.
      </p>
      <p>
        A monitored reporting channel is not available yet. If you need support
        now, call a verified service directly.
      </p>
      <div className="report-call-actions">
        <a
          className="call-button"
          href={telephoneHref(INDIA_CALL_NUMBERS.substanceUseSupport)}
        >
          <Phone aria-hidden="true" /> Call substance-use support: 14446
        </a>
        <a
          className="secondary-button"
          href={telephoneHref(INDIA_CALL_NUMBERS.mentalHealthSupport)}
        >
          <Phone aria-hidden="true" /> Call mental-health support: 14416
        </a>
        <a
          className="text-button"
          href={telephoneHref(INDIA_CALL_NUMBERS.emergency)}
        >
          Immediate danger? Call 112
        </a>
      </div>
    </main>
  );
}
