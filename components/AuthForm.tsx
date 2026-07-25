"use client";

import { useState, type FormEvent } from "react";

interface AuthFormProps {
  readonly googleEnabled: boolean;
  readonly initialError: string | undefined;
  readonly nextPath: string;
}

type AuthMode = "sign-in" | "sign-up";

export function AuthForm({
  googleEnabled,
  initialError,
  nextPath,
}: AuthFormProps) {
  const [mode, setMode] = useState<AuthMode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState(initialError ?? "");
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setStatus(mode === "sign-in" ? "Signing in…" : "Creating your account…");

    try {
      const response = await fetch("/api/auth/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, mode, next: nextPath }),
      });
      const result = (await response.json()) as {
        error?: string;
        needsEmailConfirmation?: boolean;
        next?: string;
      };

      if (!response.ok) {
        setStatus(result.error ?? "Authentication is unavailable right now.");
        return;
      }
      if (result.needsEmailConfirmation) {
        setStatus(
          "Check your email to confirm your account, then return to Haven.",
        );
        return;
      }
      window.location.assign(result.next ?? nextPath);
    } catch {
      setStatus("Authentication is unavailable right now.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="plan-card" aria-labelledby="auth-heading">
      <h2 id="auth-heading">
        {mode === "sign-in" ? "Sign in to Haven" : "Create your Haven account"}
      </h2>
      <p>
        Your account is for saved, personalized support. Immediate and emergency
        help remain available without signing in.
      </p>
      <form onSubmit={(event) => void submit(event)}>
        <label>
          Email
          <input
            autoComplete="email"
            inputMode="email"
            maxLength={254}
            name="email"
            onChange={(event) => setEmail(event.target.value)}
            required
            type="email"
            value={email}
          />
        </label>
        <label>
          Password
          <input
            autoComplete={
              mode === "sign-in" ? "current-password" : "new-password"
            }
            maxLength={128}
            minLength={8}
            name="password"
            onChange={(event) => setPassword(event.target.value)}
            required
            type="password"
            value={password}
          />
        </label>
        <button className="primary-button" disabled={submitting} type="submit">
          {submitting
            ? "Please wait…"
            : mode === "sign-in"
              ? "Sign in"
              : "Create account"}
        </button>
      </form>
      <button
        className="text-button"
        disabled={submitting}
        onClick={() => {
          setMode(mode === "sign-in" ? "sign-up" : "sign-in");
          setStatus("");
        }}
        type="button"
      >
        {mode === "sign-in"
          ? "Need an account? Create one"
          : "Already have an account? Sign in"}
      </button>
      {googleEnabled && (
        <a
          className="primary-button"
          href={`/api/auth/google?next=${encodeURIComponent(nextPath)}`}
        >
          Continue with Google
        </a>
      )}
      <p aria-live="polite">{status}</p>
    </section>
  );
}
