"use client";

import { Check, Save } from "lucide-react";
import { useEffect, useState } from "react";
import type { SavedPlanInput, TrustedContactInput } from "@/domain/contracts";

const emptyPlan: SavedPlanInput = {
  triggerIds: ["stress"],
  supportActionId: "call_someone",
  tone: "warm",
  language: "en-IN",
  trustedContactId: null,
  safePlaceLabel: "",
};

export function PlanForm() {
  const [plan, setPlan] = useState<SavedPlanInput>(emptyPlan);
  const [contact, setContact] = useState<TrustedContactInput>({
    displayName: "",
    phone: "",
    relationship: "friend",
    preferredChannel: "call",
  });
  const [status, setStatus] = useState("Loading your plan…");

  useEffect(() => {
    void fetch("/api/account/plan")
      .then(async (response) => {
        if (!response.ok) throw new Error();
        return response.json() as Promise<{ plan: SavedPlanInput | null }>;
      })
      .then(({ plan: stored }) => {
        if (stored) setPlan(stored);
        setStatus(stored ? "Your saved plan is ready." : "No plan saved yet.");
      })
      .catch(() => setStatus("Your plan could not be loaded."));
    void fetch("/api/account/contact")
      .then(async (response) => {
        if (!response.ok) throw new Error();
        return response.json() as Promise<{
          contact: (TrustedContactInput & { id: string }) | null;
        }>;
      })
      .then(({ contact: stored }) => {
        if (stored) setContact(stored);
      })
      .catch(() => undefined);
  }, []);

  async function save() {
    setStatus("Saving…");
    let planToSave = plan;
    if (contact.displayName || contact.phone) {
      const contactResponse = await fetch("/api/account/contact", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(contact),
      });
      if (!contactResponse.ok) {
        setStatus("Check the trusted contact name and +country-code phone.");
        return;
      }
      const { id } = (await contactResponse.json()) as { id: string };
      planToSave = { ...plan, trustedContactId: id };
      setPlan(planToSave);
    }
    const response = await fetch("/api/account/plan", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(planToSave),
    });
    setStatus(
      response.ok ? "Saved securely." : "Could not save. Please try again.",
    );
  }

  return (
    <section className="plan-card">
      <p aria-live="polite">{status}</p>
      <label>
        A safer place I can move to
        <input
          maxLength={80}
          value={plan.safePlaceLabel}
          onChange={(event) =>
            setPlan({ ...plan, safePlaceLabel: event.target.value })
          }
          placeholder="Shared room, lobby, or trusted place"
        />
      </label>
      <label>
        When this happens
        <select
          value={plan.triggerIds[0]}
          onChange={(event) =>
            setPlan({
              ...plan,
              triggerIds: [
                event.target.value as SavedPlanInput["triggerIds"][number],
              ],
            })
          }
        >
          <option value="stress">Stress rises</option>
          <option value="social_pressure">I face social pressure</option>
          <option value="loneliness">I feel isolated</option>
          <option value="pain">Pain gets harder</option>
        </select>
      </label>
      <label>
        My first support action
        <select
          value={plan.supportActionId}
          onChange={(event) =>
            setPlan({
              ...plan,
              supportActionId: event.target
                .value as SavedPlanInput["supportActionId"],
            })
          }
        >
          <option value="call_someone">Call someone</option>
          <option value="leave_safely">Leave safely</option>
          <option value="quiet_company">Ask for quiet company</option>
        </select>
      </label>
      <h2>Optional trusted contact</h2>
      <p>
        Add both fields or leave both blank. Contact details are encrypted
        before database storage.
      </p>
      <label>
        Name or relationship
        <input
          maxLength={80}
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
          value={contact.phone}
          onChange={(event) =>
            setContact({ ...contact, phone: event.target.value })
          }
          placeholder="+919876543210"
        />
      </label>
      <button className="primary-button" onClick={() => void save()}>
        <Save /> Save plan
      </button>
      {status === "Saved securely." && (
        <span className="quiet-note">
          <Check /> Saved
        </span>
      )}
    </section>
  );
}
