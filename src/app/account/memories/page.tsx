"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { SupportMemoryInput } from "@/domain/rag";

interface SupportMemoryView extends SupportMemoryInput {
  readonly id: string;
  readonly savedAt: string;
  readonly expiresAt: string;
}

const label = (value: string) => value.replaceAll("_", " ");

export default function SupportMemoriesPage() {
  const [memories, setMemories] = useState<SupportMemoryView[]>([]);
  const [state, setState] = useState<
    "loading" | "ready" | "unauthorized" | "failed"
  >("loading");

  const load = useCallback(async () => {
    setState("loading");
    try {
      const response = await fetch("/api/account/support-memories", {
        cache: "no-store",
      });
      if (response.status === 401) {
        setState("unauthorized");
        return;
      }
      if (!response.ok) throw new Error("load_failed");
      const payload = (await response.json()) as {
        memories: SupportMemoryView[];
      };
      setMemories(payload.memories);
      setState("ready");
    } catch {
      setState("failed");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const remove = async (id: string) => {
    const response = await fetch("/api/account/support-memories", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (response.ok) {
      setMemories((current) => current.filter((memory) => memory.id !== id));
    } else {
      setState("failed");
    }
  };

  return (
    <main id="main" tabIndex={-1} className="content-page">
      <span className="eyebrow">Your data</span>
      <h1>Saved support memories</h1>
      <p>
        These are explicit tap preferences, not a crisis log. Haven never saves
        the conversation, audio, generated script, diagnosis, or location here.
      </p>

      {state === "loading" && <p aria-live="polite">Loading your memories…</p>}
      {state === "unauthorized" && (
        <p>
          <Link href="/auth?next=/account/memories">Sign in</Link> to manage
          saved preferences.
        </p>
      )}
      {state === "failed" && (
        <p role="alert">
          Haven could not load that data. Try again; no memory was changed.
        </p>
      )}
      {state === "ready" && memories.length === 0 && (
        <p>No support memories are currently saved.</p>
      )}
      {state === "ready" && memories.length > 0 && (
        <div className="support-memory-list">
          {memories.map((memory) => (
            <article key={memory.id}>
              <div>
                <strong>{memory.helpfulness.replace("_", " ")}</strong>
                <p>
                  {memory.situationIds.map(label).join(", ")} ·{" "}
                  {label(memory.actionId)}
                </p>
                <small>
                  Saved {new Date(memory.savedAt).toLocaleDateString("en-IN")} ·
                  unavailable after{" "}
                  {new Date(memory.expiresAt).toLocaleDateString("en-IN")}
                </small>
              </div>
              <button onClick={() => void remove(memory.id)}>Delete</button>
            </article>
          ))}
        </div>
      )}
      <Link className="secondary-button" href="/">
        Return to Haven
      </Link>
    </main>
  );
}
