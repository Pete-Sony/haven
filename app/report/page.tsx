import type { Metadata } from "next";

export const metadata: Metadata = { title: "Report a concern" };

export default function ReportPage() {
  return (
    <main id="main" className="content-page">
      <span className="eyebrow">Safety feedback</span>
      <h1>Report a resource or content concern.</h1>
      <p>
        Do not use this page for an emergency. In India, call 112 for immediate
        danger.
      </p>
      <p>
        This public prototype does not yet operate a monitored clinical-support
        inbox. Please open a GitHub issue for incorrect public content without
        including names, health details, phone numbers, or other sensitive
        information.
      </p>
      <a
        className="primary-button"
        href="https://github.com/Pete-Sony/haven/issues"
        target="_blank"
        rel="noreferrer"
      >
        Open GitHub issues
      </a>
    </main>
  );
}
