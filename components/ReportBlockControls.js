"use client";

import { useState, useTransition } from "react";

// Small report/block control, shared by StageACandidateCard (company's view
// of a rep) and MatchCard (rep's view of a company) — the two places each
// side sees the other's real submitted content (video, profile), which is
// exactly what App Store guideline 1.2 (user-generated content) requires a
// report mechanism and a block capability for. Deliberately quiet — a text
// link, not a prominent button — since most people will never need it, but
// always present.
export default function ReportBlockControls({ otherPartyLabel, reportAction, blockAction, onBlocked }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState(null); // 'report' | 'block'
  const [reason, setReason] = useState("");
  const [pending, startTransition] = useTransition();
  // Reporting and blocking are independent — filing a report shouldn't take
  // away the ability to also block afterwards, so only `blocked` is a
  // terminal state that replaces the whole control. `reported` is just a
  // transient confirmation shown next to the still-live entry point.
  const [blocked, setBlocked] = useState(false);
  const [reported, setReported] = useState(false);
  const [error, setError] = useState("");

  const reset = () => {
    setOpen(false);
    setMode(null);
    setReason("");
    setError("");
  };

  const submit = (which) => {
    if (which === "block" && !window.confirm(`Block ${otherPartyLabel}? This ends the match now, and LandIt won't match you with them again.`)) {
      return;
    }
    setError("");
    startTransition(async () => {
      const action = which === "report" ? reportAction : blockAction;
      const result = await action(reason);
      if (result && result.success === false) {
        setError(result.message || "Something went wrong, try again.");
        return;
      }
      if (which === "block") {
        setBlocked(true);
        if (onBlocked) onBlocked();
        return;
      }
      setReported(true);
      reset();
    });
  };

  if (blocked) {
    return <p className="text-xs text-[var(--text-faint)]">Blocked.</p>;
  }

  if (!open) {
    return (
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="text-xs font-medium text-[var(--text-faint)] hover:text-[var(--danger)]"
        >
          Report / Block
        </button>
        {reported && <span className="text-xs text-[var(--text-faint)]">Report sent, thank you.</span>}
      </div>
    );
  }

  return (
    <div className="rounded-[var(--radius-sm)] border border-[var(--line)] bg-[var(--bg-raised)]/60 p-4">
      {!mode ? (
        <div className="flex flex-wrap items-center gap-4">
          <span className="text-xs text-[var(--text-dim)]">What would you like to do?</span>
          <button type="button" onClick={() => setMode("report")} className="text-xs font-semibold text-[var(--cyan)] hover:underline">
            Report {otherPartyLabel}
          </button>
          <button type="button" onClick={() => setMode("block")} className="text-xs font-semibold text-[var(--danger)] hover:underline">
            Block {otherPartyLabel}
          </button>
          <button type="button" onClick={reset} className="ml-auto text-xs text-[var(--text-faint)] hover:text-[var(--text)]">
            Cancel
          </button>
        </div>
      ) : (
        <div>
          <p className="mb-2 text-xs text-[var(--text-dim)]">
            {mode === "report"
              ? `Tell us what's wrong — this goes straight to the LandIt team.`
              : `Blocking ends this match immediately and stops LandIt matching you with ${otherPartyLabel} again.`}
          </p>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={mode === "report" ? "What happened? (optional)" : "Reason (optional)"}
            rows={2}
            className="field-input mb-2"
          />
          {error && <p className="mb-2 text-xs text-[var(--danger)]">{error}</p>}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => submit(mode)}
              disabled={pending}
              className={`text-xs font-semibold hover:underline disabled:opacity-60 ${
                mode === "block" ? "text-[var(--danger)]" : "text-[var(--cyan)]"
              }`}
            >
              {pending ? "Sending…" : mode === "report" ? "Send report" : "Block & end match"}
            </button>
            <button type="button" onClick={reset} disabled={pending} className="text-xs text-[var(--text-faint)] hover:text-[var(--text)]">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
