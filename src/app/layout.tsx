import type { Metadata, Viewport } from "next";
import { Mic } from "lucide-react";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Haven — the next safe step",
    template: "%s · Haven",
  },
  description:
    "Multi-modal, GenAI-powered recovery and prevention support for individuals and caregivers when cognitive load is highest.",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.png", type: "image/png", sizes: "512x512" },
    ],
    apple: [{ url: "/apple-icon.png", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f9f4f2",
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
            <Link href="/auth">Account</Link>
            <Link
              className="companion-link"
              href="/auth?next=/companion"
              aria-label="Talk to Haven"
            >
              <Mic aria-hidden="true" />
              <span className="companion-label-long">Talk to Haven</span>
              <span className="companion-label-short" aria-hidden="true">
                Talk
              </span>
            </Link>
            <Link className="emergency-link" href="/emergency">
              Emergency 112
            </Link>
          </nav>
        </header>
        {children}
        <footer className="site-footer">
          <div>
            <strong>Haven</strong>
            <p>Recovery and prevention support when words are hard.</p>
          </div>
          <nav aria-label="Legal and support">
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
            <Link href="/report">Report a concern</Link>
          </nav>
          <small>
            Haven supports safer next steps; it does not provide medical care,
            diagnosis, monitoring, or emergency dispatch.
          </small>
        </footer>
      </body>
    </html>
  );
}
