"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import type {
  CompanionHistoryItem,
  CompanionTurnResponse,
} from "@/domain/companion";
import { MAX_COMPANION_TURNS } from "@/domain/companion";

const RECORDING_LIMIT_MS = 10_000;
const CLIENT_TIMEOUT_MS = 9_000;
const MIME_CANDIDATES = [
  "audio/webm;codecs=opus",
  "audio/mp4",
  "audio/ogg;codecs=opus",
] as const;

function audioFilename(type: string): string {
  if (type.includes("mp4")) return "companion.m4a";
  if (type.includes("ogg")) return "companion.ogg";
  return "companion.webm";
}

export function VoiceCompanion() {
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const stopTimerRef = useRef<number | null>(null);
  const mountedRef = useRef(true);
  const [history, setHistory] = useState<CompanionHistoryItem[]>([]);
  const [typedText, setTypedText] = useState("");
  const [audio, setAudio] = useState<Blob | null>(null);
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState(
    "Tap Record voice to speak for up to ten seconds, or type a short message.",
  );
  const [emergency, setEmergency] = useState<CompanionTurnResponse | null>(
    null,
  );

  function clearStopTimer() {
    if (stopTimerRef.current !== null) {
      window.clearTimeout(stopTimerRef.current);
      stopTimerRef.current = null;
    }
  }

  function releaseStream() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }

  useEffect(
    () => () => {
      mountedRef.current = false;
      clearStopTimer();
      const recorder = recorderRef.current;
      if (recorder && recorder.state !== "inactive") {
        recorder.stop();
      }
      releaseStream();
    },
    [],
  );

  function stopRecording() {
    clearStopTimer();
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") recorder.stop();
  }

  async function startRecording() {
    setAudio(null);
    if (
      typeof MediaRecorder === "undefined" ||
      !navigator.mediaDevices?.getUserMedia
    ) {
      setStatus("Microphone recording is unavailable. Type a message instead.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mimeType = MIME_CANDIDATES.find((candidate) =>
        MediaRecorder.isTypeSupported(candidate),
      );
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.addEventListener("dataavailable", (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      });
      recorder.addEventListener("error", () => {
        clearStopTimer();
        releaseStream();
        if (!mountedRef.current) return;
        setRecording(false);
        setAudio(null);
        setStatus("Recording failed. Type a message or try again.");
      });
      recorder.addEventListener("stop", () => {
        clearStopTimer();
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || mimeType || "audio/webm",
        });
        recorderRef.current = null;
        releaseStream();
        if (!mountedRef.current) return;
        setRecording(false);
        if (blob.size === 0 || blob.size > 1_000_000) {
          setAudio(null);
          setStatus(
            blob.size === 0
              ? "No audio was captured. Type a message or try again."
              : "That recording was too large. Type a message or try again.",
          );
          return;
        }
        setAudio(blob);
        setStatus("Voice message ready. Send it when you are ready.");
      });
      recorderRef.current = recorder;
      recorder.start();
      setRecording(true);
      setStatus("Recording. It will stop after ten seconds.");
      stopTimerRef.current = window.setTimeout(
        stopRecording,
        RECORDING_LIMIT_MS,
      );
    } catch {
      releaseStream();
      setRecording(false);
      setStatus("Microphone permission was not available. Type a message.");
    }
  }

  async function sendTurn(text?: string) {
    if (busy || history.length >= MAX_COMPANION_TURNS) return;
    const cleanText = text?.trim();
    if (!cleanText && !audio) {
      setStatus("Record or type a message first.");
      return;
    }
    setBusy(true);
    setStatus("Preparing one bounded response…");
    const controller = new AbortController();
    const timeout = window.setTimeout(
      () => controller.abort(),
      CLIENT_TIMEOUT_MS,
    );
    try {
      const context = cleanText ? { history, text: cleanText } : { history };
      const form = new FormData();
      form.set("context", JSON.stringify(context));
      if (audio) form.set("audio", audio, audioFilename(audio.type));

      let clientId = window.localStorage.getItem("haven.client-id");
      if (!clientId) {
        clientId = window.crypto.randomUUID();
        window.localStorage.setItem("haven.client-id", clientId);
      }
      const response = await fetch("/api/companion/turn", {
        method: "POST",
        body: form,
        signal: controller.signal,
        headers: { "X-Haven-Client-Id": clientId },
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(body?.error ?? "request_failed");
      }
      const result = (await response.json()) as CompanionTurnResponse;
      setAudio(null);
      setTypedText("");
      if (result.emergency) {
        setEmergency(result);
        setStatus("Haven found an explicit danger sign.");
        return;
      }
      if (!result.transcript || !result.reply) throw new Error("invalid_reply");
      setHistory((current) => [
        ...current,
        { user: result.transcript!, assistant: result.reply!.text },
      ]);
      setStatus(
        result.remainingTurns === 0
          ? "This four-turn session is complete."
          : `${result.remainingTurns} ${
              result.remainingTurns === 1 ? "turn" : "turns"
            } remaining.`,
      );
    } catch (error) {
      setStatus(
        error instanceof Error && error.message === "unauthorized"
          ? "Your session has expired. Sign in again to continue."
          : error instanceof Error && error.message === "rate_limited"
            ? "Live responses are paused for this device. Try again later."
            : "The companion could not respond. Your message was not saved.",
      );
    } finally {
      window.clearTimeout(timeout);
      setBusy(false);
    }
  }

  function clearSession() {
    stopRecording();
    setHistory([]);
    setTypedText("");
    setAudio(null);
    setEmergency(null);
    setStatus("Session cleared. No conversation was saved.");
  }

  const sessionComplete = history.length >= MAX_COMPANION_TURNS;

  if (emergency) {
    return (
      <main id="main" tabIndex={-1} className="content-page">
        <span className="eyebrow">Immediate safety</span>
        <h1>Call 112 now.</h1>
        <p role="alert">
          The voice or text included an explicit danger sign. Haven discarded
          the companion reply.
        </p>
        <section className="emergency-script">
          <h2>Words for the dispatcher</h2>
          <blockquote>{emergency.emergencyScript}</blockquote>
          <a className="primary-button" href="tel:112">
            Call 112
          </a>
        </section>
        <button className="text-button" onClick={clearSession}>
          Clear this session
        </button>
      </main>
    );
  }

  return (
    <main id="main" tabIndex={-1} className="content-page">
      <span className="eyebrow">Talk to Haven</span>
      <h1>Say one thing. Find one next step.</h1>
      <p>
        GenAI turns your voice or text into a short, contextual recovery
        response. This is not therapy or emergency care. Audio, transcripts, and
        replies are not saved.
      </p>

      <section className="plan-card" aria-labelledby="companion-input-heading">
        <h2 id="companion-input-heading">Your next message</h2>
        <div className="voice-panel">
          <button
            className="primary-button"
            type="button"
            disabled={busy || sessionComplete}
            aria-pressed={recording}
            onClick={() =>
              recording ? stopRecording() : void startRecording()
            }
          >
            {recording ? "Stop recording" : "Record voice"}
          </button>
          <div>
            <strong>{audio ? "Voice message ready" : "Optional voice"}</strong>
            <p>
              Recording begins only after your tap. Maximum ten seconds; it
              leaves the browser only when sent.
            </p>
          </div>
          {audio && (
            <button
              className="text-button"
              type="button"
              disabled={busy}
              onClick={() => {
                setAudio(null);
                setStatus("Voice message removed.");
              }}
            >
              Remove
            </button>
          )}
        </div>
        {audio && (
          <button
            className="primary-button"
            type="button"
            disabled={busy || sessionComplete}
            onClick={() => void sendTurn()}
          >
            Send voice
          </button>
        )}

        <form
          onSubmit={(event: FormEvent) => {
            event.preventDefault();
            void sendTurn(typedText);
          }}
        >
          <label htmlFor="companion-text">Or type a short message</label>
          <textarea
            id="companion-text"
            rows={3}
            maxLength={500}
            value={typedText}
            disabled={busy || sessionComplete}
            onChange={(event) => setTypedText(event.target.value)}
          />
          <button
            className="primary-button"
            type="submit"
            disabled={!typedText.trim() || busy || sessionComplete}
          >
            Send text
          </button>
        </form>
        <p role="status" aria-live="polite">
          {status}
        </p>
      </section>

      {history.length > 0 && (
        <section aria-labelledby="companion-history-heading">
          <h2 id="companion-history-heading">This session</h2>
          <ol>
            {history.map((turn, index) => (
              <li key={`${index}-${turn.user.slice(0, 12)}`}>
                <p>
                  <strong>You:</strong> {turn.user}
                </p>
                <p>
                  <strong>Haven:</strong> {turn.assistant}
                </p>
              </li>
            ))}
          </ol>
        </section>
      )}

      <p>
        If someone is not responding, not breathing normally, having a seizure,
        or in immediate danger, call <a href="tel:112">112</a>.
      </p>
      <button className="text-button" type="button" onClick={clearSession}>
        End and clear session
      </button>
    </main>
  );
}
