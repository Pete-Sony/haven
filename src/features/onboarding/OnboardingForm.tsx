"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { TrustedContactInput } from "@/domain/contracts";
import type { SupportProfileInput } from "@/domain/support-profile";

type Step = 1 | 2 | 3 | 4 | 5;

const emptyProfile: SupportProfileInput = {
  schemaVersion: "1.0",
  language: "en-IN",
  readAloudByDefault: false,
  tone: "warm",
  commonPressurePatternId: "stress",
  firstHelpfulActionId: "call_someone",
  saferContextId: "shared_room",
  preferredHumanSupportType: "trusted_person",
  groundingPreferenceId: "sensory",
};

const labels: Readonly<Record<string, string>> = {
  social_pressure: "Social pressure",
  stress: "Stress",
  loneliness: "Loneliness",
  pain: "Pain",
  call_someone: "Call someone I trust",
  leave_safely: "Leave the situation safely",
  quiet_company: "Ask for quiet company",
  shared_room: "A shared room",
  public_place: "A calm public place",
  trusted_home: "A trusted person’s home",
  other_non_precise: "Another general safe place",
  trusted_person: "A trusted person",
  peer_support: "Peer support",
  professional_support: "Professional support",
  helpline: "A support helpline",
  not_sure: "I am not sure yet",
  sensory: "Sensory grounding",
  gentle_breathing: "Gentle breathing",
  movement: "Movement",
  none: "No grounding preference",
  direct: "Direct",
  warm: "Warm",
  minimal: "Minimal",
};

function label(value: string): string {
  return labels[value] ?? value;
}

export function OnboardingForm() {
  const [step, setStep] = useState<Step>(1);
  const [profile, setProfile] = useState<SupportProfileInput>(emptyProfile);
  const [preferredName, setPreferredName] = useState("");
  const [safePlaceLabel, setSafePlaceLabel] = useState("");
  const [supportSentence, setSupportSentence] = useState("");
  const [contact, setContact] = useState<TrustedContactInput>({
    displayName: "",
    phone: "",
    relationship: "friend",
    preferredChannel: "call",
  });
  const [hasSavedProfile, setHasSavedProfile] = useState(false);
  const [status, setStatus] = useState("Loading your support card…");

  useEffect(() => {
    void fetch("/api/account/onboarding")
      .then(async (response) => {
        if (!response.ok) throw new Error("load_failed");
        return response.json() as Promise<{
          completed: boolean;
          profile: SupportProfileInput | null;
          contact: (TrustedContactInput & { id: string }) | null;
        }>;
      })
      .then(({ completed, profile: stored, contact: storedContact }) => {
        if (completed && stored && storedContact) {
          setProfile(stored);
          setContact(storedContact);
          setPreferredName(stored.preferredName ?? "");
          setSafePlaceLabel(stored.safePlaceLabel ?? "");
          setSupportSentence(stored.supportSentence ?? "");
          setHasSavedProfile(true);
          setStatus("Your saved support card is ready to review.");
          setStep(5);
        } else {
          setStatus("Nothing is saved until you review and choose Save.");
        }
      })
      .catch(() => setStatus("Your support card could not be loaded."));
  }, []);

  function payload(): SupportProfileInput {
    const name = preferredName.trim();
    const place = safePlaceLabel.trim();
    const sentence = supportSentence.trim();
    return {
      ...profile,
      ...(name ? { preferredName: name } : {}),
      ...(place ? { safePlaceLabel: place } : {}),
      ...(sentence ? { supportSentence: sentence } : {}),
    };
  }

  async function save(): Promise<void> {
    setStatus("Saving your encrypted support card…");
    const response = await fetch("/api/account/onboarding", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profile: payload(), contact }),
    });
    if (!response.ok) {
      setStatus("Check the card fields and try again.");
      return;
    }
    const result = (await response.json()) as {
      profile: SupportProfileInput;
    };
    setProfile(result.profile);
    setPreferredName(result.profile.preferredName ?? "");
    setSafePlaceLabel(result.profile.safePlaceLabel ?? "");
    setSupportSentence(result.profile.supportSentence ?? "");
    setHasSavedProfile(true);
    setStatus("Private setup saved. Your account features are ready.");
  }

  async function erase(): Promise<void> {
    setStatus("Erasing your support card…");
    const response = await fetch("/api/account/onboarding", {
      method: "DELETE",
    });
    if (!response.ok) {
      setStatus("Your support card could not be erased.");
      return;
    }
    setProfile(emptyProfile);
    setPreferredName("");
    setSafePlaceLabel("");
    setSupportSentence("");
    setContact({
      displayName: "",
      phone: "",
      relationship: "friend",
      preferredChannel: "call",
    });
    setHasSavedProfile(false);
    setStep(1);
    setStatus("Support card erased.");
  }

  return (
    <section className="plan-card" aria-labelledby="support-card-heading">
      <p aria-live="polite">{status}</p>
      <div className="flow-progress">
        <span>Minimum private setup</span>
        <span>Step {step} of 5</span>
      </div>

      {step === 1 && (
        <>
          <h2 id="support-card-heading">What tends to add pressure?</h2>
          <p>
            Choose a general pattern and a first action. Haven does not ask for
            substance history or a diagnosis.
          </p>
          <label>
            Common pressure pattern
            <select
              value={profile.commonPressurePatternId}
              onChange={(event) =>
                setProfile({
                  ...profile,
                  commonPressurePatternId: event.target
                    .value as SupportProfileInput["commonPressurePatternId"],
                })
              }
            >
              <option value="stress">Stress</option>
              <option value="social_pressure">Social pressure</option>
              <option value="loneliness">Loneliness</option>
              <option value="pain">Pain</option>
            </select>
          </label>
          <label>
            First helpful action
            <select
              value={profile.firstHelpfulActionId}
              onChange={(event) =>
                setProfile({
                  ...profile,
                  firstHelpfulActionId: event.target
                    .value as SupportProfileInput["firstHelpfulActionId"],
                })
              }
            >
              <option value="call_someone">Call someone I trust</option>
              <option value="leave_safely">Leave safely</option>
              <option value="quiet_company">Ask for quiet company</option>
            </select>
          </label>
          <label>
            Safer context
            <select
              value={profile.saferContextId}
              onChange={(event) =>
                setProfile({
                  ...profile,
                  saferContextId: event.target
                    .value as SupportProfileInput["saferContextId"],
                })
              }
            >
              <option value="shared_room">A shared room</option>
              <option value="public_place">A calm public place</option>
              <option value="trusted_home">A trusted person’s home</option>
              <option value="other_non_precise">
                Another general safe place
              </option>
            </select>
          </label>
          <label>
            Optional general label, not an address
            <input
              maxLength={80}
              value={safePlaceLabel}
              onChange={(event) => setSafePlaceLabel(event.target.value)}
              placeholder="Shared lounge or trusted home"
            />
          </label>
        </>
      )}

      {step === 2 && (
        <>
          <h2 id="support-card-heading">What kind of support helps?</h2>
          <p>
            These are preferences only. They never replace a fresh safety check.
          </p>
          <label>
            Preferred human support
            <select
              value={profile.preferredHumanSupportType}
              onChange={(event) =>
                setProfile({
                  ...profile,
                  preferredHumanSupportType: event.target
                    .value as SupportProfileInput["preferredHumanSupportType"],
                })
              }
            >
              <option value="trusted_person">A trusted person</option>
              <option value="peer_support">Peer support</option>
              <option value="professional_support">Professional support</option>
              <option value="helpline">A support helpline</option>
              <option value="not_sure">I am not sure yet</option>
            </select>
          </label>
          <label>
            Grounding preference
            <select
              value={profile.groundingPreferenceId}
              onChange={(event) =>
                setProfile({
                  ...profile,
                  groundingPreferenceId: event.target
                    .value as SupportProfileInput["groundingPreferenceId"],
                })
              }
            >
              <option value="sensory">Sensory grounding</option>
              <option value="gentle_breathing">Gentle breathing</option>
              <option value="quiet_company">Quiet company</option>
              <option value="movement">Movement</option>
              <option value="none">No grounding preference</option>
            </select>
          </label>
        </>
      )}

      {step === 3 && (
        <>
          <h2 id="support-card-heading">How should Haven respond?</h2>
          <p>Both text fields are optional. Do not enter medical details.</p>
          <label>
            Preferred name
            <input
              maxLength={40}
              value={preferredName}
              onChange={(event) => setPreferredName(event.target.value)}
              placeholder="Name Haven may show"
            />
          </label>
          <label>
            Tone
            <select
              value={profile.tone}
              onChange={(event) =>
                setProfile({
                  ...profile,
                  tone: event.target.value as SupportProfileInput["tone"],
                })
              }
            >
              <option value="warm">Warm</option>
              <option value="direct">Direct</option>
              <option value="minimal">Minimal</option>
            </select>
          </label>
          <label>
            <input
              type="checkbox"
              checked={profile.readAloudByDefault}
              onChange={(event) =>
                setProfile({
                  ...profile,
                  readAloudByDefault: event.target.checked,
                })
              }
            />
            Offer read-aloud by default
          </label>
          <label>
            One sentence to show when pressure rises
            <input
              maxLength={160}
              value={supportSentence}
              onChange={(event) => setSupportSentence(event.target.value)}
              placeholder="I only need to take one step."
            />
          </label>
        </>
      )}

      {step === 4 && (
        <>
          <h2 id="support-card-heading">Who can you call?</h2>
          <p>
            Add one trusted person with a real phone number. Haven encrypts this
            contact and only opens your device dialer; it never sends a message
            or places a call automatically.
          </p>
          <label>
            Name or relationship
            <input
              maxLength={80}
              required
              value={contact.displayName}
              onChange={(event) =>
                setContact({ ...contact, displayName: event.target.value })
              }
              placeholder="Friend, sister, sponsor"
            />
          </label>
          <label>
            Phone with country code
            <input
              inputMode="tel"
              pattern="^\+[1-9]\d{7,14}$"
              required
              value={contact.phone}
              onChange={(event) =>
                setContact({ ...contact, phone: event.target.value })
              }
              placeholder="+919876543210"
            />
          </label>
          <label>
            Relationship
            <select
              value={contact.relationship}
              onChange={(event) =>
                setContact({
                  ...contact,
                  relationship: event.target
                    .value as TrustedContactInput["relationship"],
                })
              }
            >
              <option value="friend">Friend</option>
              <option value="family">Family</option>
              <option value="partner">Partner</option>
              <option value="peer">Peer</option>
              <option value="sponsor">Sponsor</option>
              <option value="other">Other</option>
            </select>
          </label>
        </>
      )}

      {step === 5 && (
        <>
          <h2 id="support-card-heading">Review before saving</h2>
          <p>
            This card can pre-fill a calm-time plan. It cannot diagnose, score
            risk, or bypass Haven’s current safety questions.
          </p>
          <dl>
            <dt>Preferred name</dt>
            <dd>{preferredName.trim() || "Not provided"}</dd>
            <dt>Pressure pattern</dt>
            <dd>{label(profile.commonPressurePatternId)}</dd>
            <dt>First action</dt>
            <dd>{label(profile.firstHelpfulActionId)}</dd>
            <dt>Safer context</dt>
            <dd>{safePlaceLabel.trim() || label(profile.saferContextId)}</dd>
            <dt>Human support</dt>
            <dd>{label(profile.preferredHumanSupportType)}</dd>
            <dt>Grounding preference</dt>
            <dd>{label(profile.groundingPreferenceId)}</dd>
            <dt>Response style</dt>
            <dd>
              {label(profile.tone)}
              {profile.readAloudByDefault ? ", read-aloud preferred" : ""}
            </dd>
            <dt>Personal sentence</dt>
            <dd>{supportSentence.trim() || "Not provided"}</dd>
            <dt>Trusted person</dt>
            <dd>
              {contact.displayName.trim() || "Required"} ·{" "}
              {contact.phone.trim() || "Add a +country-code phone"}
            </dd>
          </dl>
        </>
      )}

      <div className="result-actions">
        {step > 1 && (
          <button
            className="text-button"
            type="button"
            onClick={() => setStep((step - 1) as Step)}
          >
            Back
          </button>
        )}
        {step < 5 && (
          <button
            className="primary-button"
            type="button"
            onClick={() => {
              if (
                step === 4 &&
                (!contact.displayName.trim() ||
                  !/^\+[1-9]\d{7,14}$/.test(contact.phone.trim()))
              ) {
                setStatus(
                  "Add a trusted person and a valid +country-code phone.",
                );
                return;
              }
              setStep((step + 1) as Step);
            }}
          >
            Continue
          </button>
        )}
        {step === 5 && (
          <>
            <button
              className="primary-button"
              type="button"
              onClick={() => void save()}
            >
              Save encrypted card
            </button>
            <button
              className="secondary-button"
              type="button"
              onClick={() => setStep(1)}
            >
              Change
            </button>
          </>
        )}
      </div>

      {hasSavedProfile && (
        <>
          <div className="result-actions">
            <Link className="primary-button" href="/check-in">
              Start daily check-in
            </Link>
            <Link className="secondary-button" href="/plan">
              Create my plan
            </Link>
          </div>
          <button
            className="text-button"
            type="button"
            onClick={() => void erase()}
          >
            Erase private setup
          </button>
        </>
      )}
      <p>
        Need support now? <Link href="/">Use immediate support</Link>. In
        immediate danger, <a href="tel:112">call 112</a>.
      </p>
    </section>
  );
}
