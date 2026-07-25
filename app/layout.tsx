import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Haven — the next safe step",
    template: "%s · Haven",
  },
  description:
    "Zero-typing, safety-routed recovery support for individuals and caregivers in India.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f3efe6",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-IN">
      <body>
        <a className="skip-link" href="#main">
          Skip to main content
        </a>
        <header className="site-header">
          <Link className="brand" href="/" aria-label="Haven home">
            <span className="brand-mark" aria-hidden="true">
              H
            </span>
            <strong>Haven</strong>
          </Link>
          <nav aria-label="Primary navigation">
            <Link href="/prevent">Plan ahead</Link>
            <Link href="/resources">Resources</Link>
            <Link className="emergency-link" href="/emergency">
              Emergency 112
            </Link>
          </nav>
        </header>
        {children}
        <footer className="site-footer">
          <div>
            <strong>Haven</strong>
            <p>Words and next steps when the moment is hard.</p>
          </div>
          <nav aria-label="Legal and support">
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
            <Link href="/report">Report a concern</Link>
          </nav>
          <small>
            Research prototype · not medical care, diagnosis, monitoring, or an
            emergency service
          </small>
        </footer>
      </body>
    </html>
  );
}
