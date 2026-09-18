"use client";

import { useEffect, useState, useTransition } from "react";
import { TIMEZONES, formatInZone, guessBrowserTimeZone } from "@/lib/timezones";

// Shared interview-scheduling widget used on both the rep and company
// dashboards. The two sides pass in their own ownership-checked server
// actions (proposeAction/confirmAction) — this component only knows about
// whose "turn" it is and what to render, not who's allowed to do what.
export default function InterviewScheduler({
  matchId,
  viewerRole, // "rep" | "company"
  meeting, // { scheduledAt, status, proposedBy, notes } | null
  otherPartyLabel, // e.g. company name, or rep's first name
  proposeAction,
  confirmAction,
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [tz, setTz] = useState("Europe/London");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [notes, setNotes] = useState("");
  const [showForm, setShowForm] = useState(!meeting);

  useEffect(() => {
    setTz(guessBrowserTimeZone());
  }, []);

  const isConfirmed = meeting?.status === "confirmed";
  const proposedByOther = meeting && meeting.proposedBy && meeting.proposedBy !== viewerRole;
  const myTurnToRespond = meeting?.status === "proposed" && proposedByOther;
  const waitingOnOther = meeting?.status === "proposed" && !proposedByOther;

  const handlePropose = (e) => {
    e.preventDefault();
    setError("");
    if (!date || !time) {
      setError("Pick a date and time.");
      return;
    }
    startTransition(async () => {
      const result = await proposeAction(matchId, { date, time, timeZone: tz, notes });
      if (!result?.success) {
        setError(result?.message || "Something went wrong, please try again.");
        return;
      }
      setShowForm(false);
    });
  };

  const handleConfirm = () => {
    setError("");
    startTransition(async () => {
      const result = await confirmAction(matchId);
      if (!result?.success) {
        setError(result?.message || "Something went wrong, please try again.");
      }
    });
  };

  if (isConfirmed) {
    return (
      <div className="rounded-[var(--radius-sm)] border border-[var(--cyan)]/30 bg-[var(--cyan-soft)] p-5">
        <div className="mb-1 text-sm font-semibold text-[var(--text)]">Interview confirmed</div>
        <p className="mb-3 text-sm text-[var(--text-dim)]">
          {formatInZone(meeting.scheduledAt, guessBrowserTimeZone())} ({guessBrowserTimeZone().replace("_", " ")})
        </p>
        <a
          href={`/api/meetings/${matchId}/ics`}
          className="btn btn-primary inline-flex"
          style={{ padding: "8px 18px", fontSize: 13 }}
        >
          Add to calendar
        </a>
      </div>
    );
  }

  if (waitingOnOther) {
    return (
      <div className="rounded-[var(--radius-sm)] border border-[var(--line)] p-5">
        <div className="mb-1 text-sm font-semibold text-[var(--text)]">
          Interview proposed, waiting on {otherPartyLabel}
        </div>
        <p className="text-sm text-[var(--text-dim)]">
          You proposed {formatInZone(meeting.scheduledAt, guessBrowserTimeZone())}. We'll let you know as soon
          as they respond.
        </p>
      </div>
    );
  }

  if (myTurnToRespond && !showForm) {
    return (
      <div className="rounded-[var(--radius-sm)] border border-[var(--cyan)]/30 bg-[var(--cyan-soft)] p-5">
        <div className="mb-1 text-sm font-semibold text-[var(--text)]">
          {otherPartyLabel} has proposed an interview
        </div>
        <p className="mb-4 text-sm text-[var(--text-dim)]">
          {formatInZone(meeting.scheduledAt, guessBrowserTimeZone())} ({guessBrowserTimeZone().replace("_", " ")})
          {meeting.notes ? `: "${meeting.notes}"` : ""}
        </p>
        <div className="flex gap-2">
          <button type="button" onClick={handleConfirm} disabled={pending} className="btn btn-primary">
            {pending ? "Confirming…" : "Confirm interview"}
          </button>
          <button type="button" onClick={() => setShowForm(true)} disabled={pending} className="btn btn-ghost">
            Propose a different time
          </button>
        </div>
        {error && <p className="mt-3 text-sm text-[var(--danger)]">{error}</p>}
      </div>
    );
  }

  // Propose (first time) or counter-propose form.
  return (
    <div className="rounded-[var(--radius-sm)] border border-[var(--line)] p-5">
      <div className="mb-3 text-sm font-semibold text-[var(--text)]">
        {meeting ? "Propose a different time" : "Propose an interview time"}
      </div>
      <form onSubmit={handlePropose} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="field-input"
            required
          />
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="field-input"
            required
          />
        </div>
        <select value={tz} onChange={(e) => setTz(e.target.value)} className="field-input">
          {TIMEZONES.map((z) => (
            <option key={z.value} value={z.value}>
              {z.label}
            </option>
          ))}
        </select>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add a note (optional)"
          rows={2}
          className="field-input"
        />
        <div className="flex gap-2">
          <button type="submit" disabled={pending} className="btn btn-primary">
            {pending ? "Sending…" : meeting ? "Send new time" : "Propose interview"}
          </button>
          {meeting && (
            <button type="button" onClick={() => setShowForm(false)} disabled={pending} className="btn btn-ghost">
              Cancel
            </button>
          )}
        </div>
        {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
      </form>
    </div>
  );
}
