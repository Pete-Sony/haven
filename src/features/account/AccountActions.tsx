"use client";

import { useState } from "react";

type ActionState = "idle" | "working" | "failed";

export function AccountActions() {
  const [state, setState] = useState<ActionState>("idle");
  const [confirmation, setConfirmation] = useState("");
  const [message, setMessage] = useState("");

  async function remove(path: string, successMessage: string) {
    setState("working");
    setMessage("");
    try {
      const response = await fetch(path, { method: "DELETE" });
      if (!response.ok) throw new Error("delete_failed");
      setMessage(successMessage);
      setState("idle");
    } catch {
      setMessage("Haven could not remove that data. Nothing else changed.");
      setState("failed");
    }
  }

  async function deleteAccount() {
    if (confirmation !== "DELETE") return;
    setState("working");
    setMessage("");
    try {
      const response = await fetch("/api/account", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: true }),
      });
      if (!response.ok) throw new Error("delete_failed");
      window.location.assign("/");
    } catch {
      setMessage(
        "Haven could not delete the account. Your account remains active.",
      );
      setState("failed");
    }
  }

  return (
    <>
      <section className="plan-card" aria-labelledby="data-actions-heading">
        <h2 id="data-actions-heading">Download or remove saved data</h2>
        <div className="result-actions">
          <a className="primary-button" href="/api/account/export">
            Download my data
          </a>
          <button
            className="secondary-button"
            disabled={state === "working"}
            onClick={() =>
              void remove("/api/account/plan", "Your saved plan was removed.")
            }
            type="button"
          >
            Delete saved plan
          </button>
          <button
            className="secondary-button"
            disabled={state === "working"}
            onClick={() =>
              void remove(
                "/api/account/contact",
                "Your trusted contact was removed.",
              )
            }
            type="button"
          >
            Delete trusted contact
          </button>
        </div>
      </section>

      <section className="plan-card" aria-labelledby="delete-account-heading">
        <h2 id="delete-account-heading">Delete Haven account</h2>
        <p>
          This permanently removes your account and all Haven data. This cannot
          be undone.
        </p>
        <label>
          Type DELETE to confirm
          <input
            autoComplete="off"
            onChange={(event) => setConfirmation(event.target.value)}
            value={confirmation}
          />
        </label>
        <button
          className="secondary-button"
          disabled={confirmation !== "DELETE" || state === "working"}
          onClick={() => void deleteAccount()}
          type="button"
        >
          Permanently delete my account
        </button>
      </section>
      <p aria-live="polite" role={state === "failed" ? "alert" : undefined}>
        {message}
      </p>
    </>
  );
}
