"use client";

import { useState, type FormEvent } from "react";

export function PasswordResetRequestForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    try {
      const response = await fetch("/api/auth/password-reset/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const body = (await response.json()) as {
        message?: string;
        error?: string;
      };
      setStatus(
        body.message ??
          body.error ??
          "If that account exists, reset instructions have been sent.",
      );
    } catch {
      setStatus("Password recovery is unavailable right now.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={(event) => void submit(event)}>
      <label>
        Account email
        <input
          autoComplete="email"
          inputMode="email"
          maxLength={254}
          onChange={(event) => setEmail(event.target.value)}
          required
          type="email"
          value={email}
        />
      </label>
      <button className="primary-button" disabled={submitting} type="submit">
        {submitting ? "Sending…" : "Send reset instructions"}
      </button>
      <p aria-live="polite">{status}</p>
    </form>
  );
}
