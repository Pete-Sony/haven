"use client";

import {
  ArrowLeft,
  Check,
  Clipboard,
  Headphones,
  LockKeyhole,
  RotateCcw,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

const STORAGE_KEY = "haven.prevention-plan.v1";

const triggers = [
  ["stress", "Stress builds quickly"],
  ["social_pressure", "Someone offers or pressures me"],
  ["loneliness", "I feel alone"],
  ["pain", "Pain makes the moment harder"],
] as const;
const actions = [
  ["leave_safely", "Leave the situation"],
  ["call_someone", "Call a trusted person"],
  ["quiet_company", "Ask for quiet company"],
] as const;
const places = [
  ["shared_room", "A shared room"],
  ["public_place", "A calm public place"],
  ["trusted_home", "A trusted person’s home"],
] as const;

type Trigger = (typeof triggers)[number][0];
type Action = (typeof actions)[number][0];
type Place = (typeof places)[number][0];

interface PreventionPlan {
  readonly trigger: Trigger;
  readonly action: Action;
  readonly place: Place;
}

function labelFor<T extends string>(
  options: ReadonlyArray<readonly [T, string]>,
  selected: T,
): string {
  return options.find(([id]) => id === selected)?.[1] ?? selected;
}

export function PreventionPlanner() {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [plan, setPlan] = useState<Partial<PreventionPlan>>({});
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (!stored) return;
      const parsed = JSON.parse(stored) as Partial<PreventionPlan>;
      if (
        triggers.some(([id]) => id === parsed.trigger) &&
        actions.some(([id]) => id === parsed.action) &&
        places.some(([id]) => id === parsed.place)
      ) {
        setPlan(parsed);
        setSaved(true);
        setStep(4);
      }
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const completed = plan as PreventionPlan;
  const planText =
    step === 4
      ? `If ${labelFor(triggers, completed.trigger).toLowerCase()}, I will ${labelFor(actions, completed.action).toLowerCase()} and move to ${labelFor(places, completed.place).toLowerCase()}.`
      : "";

  function reset(): void {
    window.localStorage.removeItem(STORAGE_KEY);
    setPlan({});
    setSaved(false);
    setCopied(false);
    setStep(1);
  }

  function save(): void {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(completed));
    setSaved(true);
  }

  if (step === 4) {
    return (
      <main id="main" className="prevention-page">
        <section className="prevention-result">
          <span className="eyebrow">Your prevention plan</span>
          <h1>Decide before the hard moment.</h1>
          <p className="plan-statement">{planText}</p>
          <div className="prevention-result-actions">
            <button
              onClick={() => {
                speechSynthesis.cancel();
                speechSynthesis.speak(new SpeechSynthesisUtterance(planText));
              }}
            >
              <Headphones /> Read aloud
            </button>
            <button
              onClick={async () => {
                await navigator.clipboard?.writeText(planText);
                setCopied(true);
              }}
            >
              <Clipboard /> {copied ? "Copied" : "Copy plan"}
            </button>
          </div>
          <div className="local-save-panel">
            <LockKeyhole />
            <div>
              <strong>
                {saved ? "Saved on this device" : "Save for the next time"}
              </strong>
              <p>
                This plan stays only in this browser unless you choose to copy
                or share it.
              </p>
            </div>
            {!saved && (
              <button className="primary-button" onClick={save}>
                <Check /> Save on this device
              </button>
            )}
          </div>
          <div className="result-actions">
            <button className="text-button" onClick={() => setStep(1)}>
              <ArrowLeft /> Change choices
            </button>
            <button className="secondary-button" onClick={reset}>
              <RotateCcw /> Start a new plan
            </button>
          </div>
          <p className="optional-account-note">
            Want encrypted cloud access across devices?{" "}
            <Link href="/plan">Optional account saving</Link> is available
            outside this core flow.
          </p>
        </section>
      </main>
    );
  }

  const options =
    step === 1 ? triggers : step === 2 ? actions : step === 3 ? places : [];
  const heading =
    step === 1
      ? "What tends to raise the risk?"
      : step === 2
        ? "What will you do first?"
        : "Where can you create more safety?";
  const description =
    step === 1
      ? "Pick the closest pattern. You can change it anytime."
      : step === 2
        ? "Choose one action small enough to use under pressure."
        : "Choose a place that adds distance, visibility, or support.";

  return (
    <main id="main" className="prevention-page">
      <section className="prevention-card">
        <Link className="back-button" href="/">
          <ArrowLeft /> Back to immediate support
        </Link>
        <div className="flow-progress">
          <span>Plan ahead</span>
          <div aria-hidden="true">
            <i className="active">1</i>
            <span />
            <i className={step >= 2 ? "active" : ""}>2</i>
            <span />
            <i className={step >= 3 ? "active" : ""}>3</i>
          </div>
          <span>Step {step} of 3</span>
        </div>
        <div className="flow-heading narrow">
          <span className="eyebrow">Prevention without typing</span>
          <h1>{heading}</h1>
          <p>{description}</p>
        </div>
        <div className="prevention-options">
          {options.map(([id, label]) => (
            <button
              key={id}
              onClick={() => {
                if (step === 1) {
                  setPlan({ ...plan, trigger: id as Trigger });
                  setStep(2);
                } else if (step === 2) {
                  setPlan({ ...plan, action: id as Action });
                  setStep(3);
                } else {
                  setPlan({ ...plan, place: id as Place });
                  setStep(4);
                }
              }}
            >
              <span>{label}</span>
              <Check />
            </button>
          ))}
        </div>
        <p className="safety-note">
          <ShieldCheck /> This is a personal preparation tool, not a medical
          treatment plan.
        </p>
      </section>
    </main>
  );
}
