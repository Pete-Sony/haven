"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  HabitMetrics,
  HabitStatus,
  RecoveryHabitId,
  StoredHabitCheckin,
  StoredHabitTracker,
} from "@/domain/habits";

const HABITS: readonly { id: RecoveryHabitId; label: string }[] = [
  { id: "connect_with_someone", label: "Connect with someone" },
  { id: "use_grounding_tool", label: "Use a grounding tool" },
  { id: "follow_support_plan", label: "Follow my support plan" },
  { id: "move_to_safety", label: "Move to safety" },
  { id: "care_for_basics", label: "Care for basics" },
];

const STATUS_LABELS: Readonly<Record<HabitStatus, string>> = {
  completed: "Completed",
  partial: "Partly practiced",
  not_today: "Not today",
};

interface HabitsResponse {
  readonly tracker: StoredHabitTracker | null;
  readonly checkins: StoredHabitCheckin[];
  readonly metrics: HabitMetrics | null;
  readonly today?: string;
}

export function HabitCheckin() {
  const [data, setData] = useState<HabitsResponse>({
    tracker: null,
    checkins: [],
    metrics: null,
  });
  const [selected, setSelected] = useState<RecoveryHabitId[]>([]);
  const [statuses, setStatuses] = useState<
    Partial<Record<RecoveryHabitId, HabitStatus>>
  >({});
  const [status, setStatus] = useState("Loading your daily check-in…");

  const load = useCallback(async () => {
    const response = await fetch("/api/account/habits", { cache: "no-store" });
    if (!response.ok) throw new Error("load_failed");
    const next = (await response.json()) as HabitsResponse;
    setData(next);
    if (next.tracker) setSelected(next.tracker.habitIds);
    const today = next.checkins.find(
      (checkin) => checkin.localDate === next.today,
    );
    if (today) {
      setStatuses(
        Object.fromEntries(
          today.entries.map((entry) => [entry.habitId, entry.status]),
        ),
      );
      setStatus("Today’s check-in is ready to change.");
    } else {
      setStatuses({});
      setStatus(
        next.tracker
          ? "Choose one status for each practice."
          : "Choose the practices you want to check each day.",
      );
    }
  }, []);

  useEffect(() => {
    void load().catch(() =>
      setStatus("Your daily check-in could not be loaded."),
    );
  }, [load]);

  const allStatusesChosen = useMemo(
    () =>
      Boolean(data.tracker) &&
      data.tracker!.habitIds.every((habitId) => statuses[habitId]),
    [data.tracker, statuses],
  );

  async function saveTracker() {
    setStatus("Saving your practice choices…");
    const response = await fetch("/api/account/habits", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        operation: "configure",
        tracker: { habitIds: selected },
      }),
    });
    if (!response.ok) {
      setStatus("Choose at least one practice and try again.");
      return;
    }
    await load();
  }

  async function saveCheckin() {
    if (!data.tracker || !allStatusesChosen) return;
    setStatus("Saving today’s check-in…");
    const response = await fetch("/api/account/habits", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        operation: "checkin",
        checkin: {
          entries: data.tracker.habitIds.map((habitId) => ({
            habitId,
            status: statuses[habitId],
          })),
        },
      }),
    });
    if (!response.ok) {
      setStatus("Today’s check-in could not be saved.");
      return;
    }
    await load();
    setStatus("Today’s check-in is saved. You can change it until midnight.");
  }

  async function undoToday() {
    setStatus("Removing today’s check-in…");
    const response = await fetch("/api/account/habits?scope=today", {
      method: "DELETE",
    });
    if (!response.ok) {
      setStatus("Today’s check-in could not be removed.");
      return;
    }
    setStatuses({});
    await load();
    setStatus("Today’s check-in was removed.");
  }

  return (
    <section className="plan-card" aria-labelledby="habit-heading">
      <p aria-live="polite">{status}</p>
      {!data.tracker ? (
        <>
          <h2 id="habit-heading">Choose your daily practices</h2>
          <p>
            Tap one or more. Haven records only these choices—not notes,
            substances, symptoms, or a clinical score.
          </p>
          {HABITS.map((habit) => (
            <label key={habit.id}>
              <input
                checked={selected.includes(habit.id)}
                onChange={() =>
                  setSelected((current) =>
                    current.includes(habit.id)
                      ? current.filter((id) => id !== habit.id)
                      : [...current, habit.id],
                  )
                }
                type="checkbox"
              />
              {habit.label}
            </label>
          ))}
          <button
            className="primary-button"
            disabled={selected.length === 0}
            onClick={() => void saveTracker()}
            type="button"
          >
            Save daily practices
          </button>
        </>
      ) : (
        <>
          <h2 id="habit-heading">How did today’s practice go?</h2>
          <p>
            There is no pass, fail, or sobriety streak. Choose what is true.
          </p>
          {data.tracker.habitIds.map((habitId) => (
            <fieldset key={habitId}>
              <legend>
                {HABITS.find((habit) => habit.id === habitId)?.label ?? habitId}
              </legend>
              <div className="result-actions">
                {(["completed", "partial", "not_today"] as const).map(
                  (habitStatus) => (
                    <button
                      aria-pressed={statuses[habitId] === habitStatus}
                      className={
                        statuses[habitId] === habitStatus
                          ? "primary-button"
                          : "secondary-button"
                      }
                      key={habitStatus}
                      onClick={() =>
                        setStatuses((current) => ({
                          ...current,
                          [habitId]: habitStatus,
                        }))
                      }
                      type="button"
                    >
                      {STATUS_LABELS[habitStatus]}
                    </button>
                  ),
                )}
              </div>
            </fieldset>
          ))}
          <div className="result-actions">
            <button
              className="primary-button"
              disabled={!allStatusesChosen}
              onClick={() => void saveCheckin()}
              type="button"
            >
              Save today
            </button>
            <button
              className="text-button"
              onClick={() => void undoToday()}
              type="button"
            >
              Undo today
            </button>
          </div>
          {data.metrics && (
            <div aria-label="Practice summary">
              <p>
                Practiced {data.metrics.practicedDays} of{" "}
                {data.metrics.eligibleDays} eligible days.
              </p>
              <p>
                Current practice run: {data.metrics.currentPracticeRun}{" "}
                {data.metrics.currentPracticeRun === 1 ? "day" : "days"}.
              </p>
            </div>
          )}
          <h3>Last seven check-ins</h3>
          {data.checkins.length === 0 ? (
            <p>No daily check-ins saved yet.</p>
          ) : (
            <ul>
              {data.checkins.slice(0, 7).map((checkin) => (
                <li key={checkin.localDate}>
                  <strong>{checkin.localDate}</strong>:{" "}
                  {checkin.entries
                    .map(
                      (entry) =>
                        `${HABITS.find((habit) => habit.id === entry.habitId)?.label ?? entry.habitId} — ${STATUS_LABELS[entry.status]}`,
                    )
                    .join("; ")}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}
