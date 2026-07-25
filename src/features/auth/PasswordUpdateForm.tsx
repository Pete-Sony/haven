"use client";

import { useState, type FormEvent } from "react";

export function PasswordUpdateForm() {
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    try {
      const response = await fetch("/api/auth/password-reset/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const body = (await response.json()) as {
        error?: string;
        next?: string;
      };
      if (!response.ok) {
        setStatus(
          body.error === "reset_link_required"
            ? "Open the reset link from your email before setting a password."
            : "Haven could not update the password. Request a new link.",
        );
        return;
      }
      window.location.assign(body.next ?? "/account");
    } catch {
      setStatus("Haven could not update the password. Request a new link.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={(event) => void submit(event)}>
      <label>
        New password
        <input
          autoComplete="new-password"
          maxLength={128}
          minLength={8}
          onChange={(event) => setPassword(event.target.value)}
          required
          type="password"
          value={password}
        />
      </label>
      <button className="primary-button" disabled={submitting} type="submit">
        {submitting ? "Updating…" : "Set new password"}
      </button>
      <p aria-live="polite">{status}</p>
    </form>
  );
}
