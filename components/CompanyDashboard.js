"use client";

import { useEffect, useState, useTransition } from "react";
import {
  companySwipeStageA,
  companyMatchAndProposeInterview,
  proposeInterview,
  confirmInterview,
  logoutCompany,
  deleteCompanyAccount,
  reportRep,
  blockRep,
} from "@/app/company/dashboard/actions";
import StatusBadge from "@/components/StatusBadge";
import InterviewScheduler from "@/components/InterviewScheduler";
import BulletText from "@/components/BulletText";
import SiteFooter from "@/components/SiteFooter";
import ReportBlockControls from "@/components/ReportBlockControls";
import { resolveVideo } from "@/lib/video";
import { TIMEZONES, guessBrowserTimeZone } from "@/lib/timezones";

// Self-serve account deletion, required for App Store review (guideline
// 5.1.1(v)). Mirrors the rep dashboard's DangerZone — see
// components/RepDashboard.js for the fuller comment on why this is a plain
// hard delete with no undo.
function DeleteAccountButton({ onDelete }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  const handleDelete = () => {
    if (
      !window.confirm(
        "Delete your LandIt account? This permanently removes your company profile, matches, and meeting history. This can't be undone."
      )
    ) {
      return;
    }
    setError("");
    startTransition(async () => {
      const result = await onDelete();
      if (result && !result.success) setError(result.message || "Something went wrong, try again.");
    });
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleDelete}
        disabled={pending}
        className="text-sm font-semibold text-[var(--text-faint)] hover:text-[var(--danger)] disabled:opacity-60"
      >
        {pending ? "Deleting…" : "Delete account"}
      </button>
      {error && <p className="text-xs text-[var(--danger)]">{error}</p>}
    </div>
  );
}

// Inline first-interview proposal step, shown in place of the pass/interested
// buttons the moment a company swipes interested on a Stage A candidate.
// Deliberately lighter than InterviewScheduler (no meeting prop, no
// confirm/counter-propose states) — this is a one-shot "pick a time" form
// that hasn't been written to the server yet, submitted together with the
// interested decision via companyMatchAndProposeInterview.
function ProposeInterviewStep({ repFirstName, onSubmit, onCancel, pending, error }) {
  const [tz, setTz] = useState("Europe/London");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    setTz(guessBrowserTimeZone());
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!date || !time) return;
    onSubmit({ date, time, timeZone: tz, notes });
  };

  return (
    <div className="rounded-[var(--radius-sm)] border border-[var(--cyan)]/30 bg-[var(--cyan-soft)] p-5">
      <div className="mb-1 text-[15px] font-semibold text-[var(--text)]">
        Propose a first interview with {repFirstName}
      </div>
      <p className="mb-4 text-sm text-[var(--text-dim)]">
        Pick a time that works for you, we&rsquo;ll send it to {repFirstName} to confirm or suggest another.
      </p>
      <form onSubmit={handleSubmit} className="space-y-3">
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
          <button type="submit" disabled={pending} className="btn btn-primary flex-1">
            {pending ? "Sending…" : "Propose interview"}
          </button>
          <button type="button" onClick={onCancel} disabled={pending} className="btn btn-ghost">
            Back
          </button>
        </div>
        {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
      </form>
    </div>
  );
}

// Applicant swipe card: the rep records a mandatory ~60s video the moment
// they swipe interested (see repSwipe in app/rep/dashboard/actions.js), so
// by the time a company sees a candidate here the video's already attached,
// no separate post-match step needed for it. See db/schema.js's comment on
// repDecision/companyDecision for the full sequencing this feeds into.
function StageACandidateCard({
  row,
  onDecide,
  pending,
  scheduling,
  onSubmitInterview,
  onCancelSchedule,
  schedulePending,
  scheduleError,
  onBlocked,
}) {
  const { match, rep } = row;
  const firstName = rep.fullName?.split(" ")[0] || "This rep";
  const video = resolveVideo(match.repVideoUrl);

  return (
    <div className="card overflow-hidden">
      {video && (
        <div className="relative bg-black">
          {video.kind === "iframe" && (
            <div className="aspect-video">
              <iframe
                src={video.src}
                className="h-full w-full"
                allow="autoplay; fullscreen; picture-in-picture"
                allowFullScreen
              />
            </div>
          )}
          {video.kind === "video" && <video src={video.src} controls className="aspect-video w-full" />}
          {video.kind === "link" && (
            <div className="flex aspect-video items-center justify-center">
              <a href={video.src} target="_blank" rel="noreferrer" className="text-sm font-semibold text-[var(--cyan)] hover:underline">
                Open application video ↗
              </a>
            </div>
          )}
        </div>
      )}

      <div className="p-6">
        <div className="mb-4 flex items-center gap-4">
          <div className="h-16 w-16 shrink-0 overflow-hidden rounded-full border border-[var(--line)] bg-[var(--bg-raised)]">
            {rep.photoUrl ? (
              <img src={rep.photoUrl} alt={firstName} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-lg font-semibold text-[var(--cyan)]">
                {firstName[0]}
              </div>
            )}
          </div>
          <div className="min-w-0">
            <div className="truncate text-xl font-semibold text-[var(--text)]">{firstName}</div>
            <div className="truncate text-sm text-[var(--text-dim)]">
              {rep.jobTitle || "Sales professional"}
              {rep.availability ? ` · ${rep.availability}` : ""}
            </div>
          </div>
        </div>

        <div className="mb-4 flex flex-wrap gap-1.5">
          {(rep.industries || []).map((tag) => (
            <span key={tag} className="badge" style={{ fontSize: 11, padding: "3px 10px" }}>
              {tag}
            </span>
          ))}
          {rep.dealSize && (
            <span className="badge badge-dim" style={{ fontSize: 11, padding: "3px 10px" }}>
              {rep.dealSize}
            </span>
          )}
          {(rep.tools || []).slice(0, 4).map((tool) => (
            <span key={tool} className="badge badge-dim" style={{ fontSize: 11, padding: "3px 10px" }}>
              {tool}
            </span>
          ))}
        </div>

        {rep.bio && (
          <div className="mb-4 rounded-[var(--radius-sm)] border border-[var(--line-soft)] bg-[var(--bg-raised)]/60 p-4">
            <div className="eyebrow mb-1.5">About {firstName}</div>
            <p className="text-sm leading-relaxed text-[var(--text-dim)]">{rep.bio}</p>
          </div>
        )}

        {match.matchReasonForCompany && (
          <div className="mb-5 rounded-[var(--radius-sm)] border border-[var(--cyan)]/25 bg-[var(--cyan-soft)] p-4">
            <div className="eyebrow mb-2 text-[var(--cyan)]">Why this could be a fit</div>
            <BulletText text={match.matchReasonForCompany} tone="bright" />
          </div>
        )}

        {scheduling ? (
          <ProposeInterviewStep
            repFirstName={firstName}
            onSubmit={onSubmitInterview}
            onCancel={onCancelSchedule}
            pending={schedulePending}
            error={scheduleError}
          />
        ) : (
          <div className="flex items-center justify-center gap-6">
            <button
              type="button"
              onClick={() => onDecide(match.id, "passed")}
              disabled={pending}
              aria-label="Pass"
              title="Pass"
              className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-[var(--danger)]/40 text-[var(--danger)] text-2xl font-semibold transition hover:border-[var(--danger)] hover:bg-[var(--danger)]/10 disabled:opacity-40"
            >
              ✕
            </button>
            <button
              type="button"
              onClick={() => onDecide(match.id, "interested")}
              disabled={pending}
              aria-label="Interested"
              title="Interested"
              className="pulse-glow flex h-16 w-16 items-center justify-center rounded-full border-2 border-emerald-400/50 text-emerald-400 text-2xl font-semibold transition hover:border-emerald-400 hover:bg-emerald-400/10 disabled:opacity-40"
            >
              ✓
            </button>
          </div>
        )}

        {!scheduling && (
          <div className="mt-4 flex justify-center">
            <ReportBlockControls
              otherPartyLabel={firstName}
              reportAction={(reason) => reportRep(match.id, reason)}
              blockAction={(reason) => blockRep(match.id, reason)}
              onBlocked={() => onBlocked?.(match.id)}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default function CompanyDashboard({ company, matches, stageADeck = [], stageARemainingToday = 0 }) {
  const [rows, setRows] = useState(matches);
  const [stageARows, setStageARows] = useState(stageADeck);
  const [stageAPending, startStageATransition] = useTransition();
  const [schedulePending, startScheduleTransition] = useTransition();
  const [celebrate, setCelebrate] = useState(false);
  const [stageAError, setStageAError] = useState("");
  const [scheduleError, setScheduleError] = useState("");
  const [proposingMatchId, setProposingMatchId] = useState(null);

  // `matches` is a fresh array from the server every time a server action's
  // revalidatePath() causes Next to re-render this route (e.g. after
  // proposing/confirming an interview from InterviewScheduler, which this
  // component doesn't directly manage state for) — without this, our local
  // `rows` fork would go stale the moment anything other than the Stage A
  // deck changed a match, since useState's initial value is only used on
  // first mount.
  useEffect(() => {
    setRows(matches);
  }, [matches]);
  useEffect(() => {
    setStageARows(stageADeck);
  }, [stageADeck]);

  const stageACurrent = stageARows[0];

  const handleStageADecide = (matchId, decision) => {
    if (decision === "interested") {
      // Don't decide yet — swiping interested opens the inline
      // propose-a-time step first; the decision and the proposed interview
      // are written together once they submit that form (see
      // handleSubmitInterview), so there's no intermediate "matched, no
      // time proposed yet" state to leave dangling if they back out.
      setScheduleError("");
      setProposingMatchId(matchId);
      return;
    }
    setStageAError("");
    setStageARows((prev) => prev.filter((r) => r.match.id !== matchId));
    startStageATransition(async () => {
      const result = await companySwipeStageA(matchId, decision);
      if (!result.success) setStageAError(result.message);
    });
  };

  const handleCancelSchedule = () => {
    setProposingMatchId(null);
    setScheduleError("");
  };

  // blockRep already ended the match server-side (see
  // app/company/dashboard/actions.js) by the time ReportBlockControls calls
  // this — just drop it out of the Stage A deck locally so it disappears
  // without waiting on revalidatePath's round trip.
  const handleBlocked = (matchId) => {
    setStageARows((prev) => prev.filter((r) => r.match.id !== matchId));
  };

  const handleSubmitInterview = (payload) => {
    if (!proposingMatchId) return;
    const matchId = proposingMatchId;
    setScheduleError("");
    startScheduleTransition(async () => {
      const result = await companyMatchAndProposeInterview(matchId, payload);
      if (!result.success) {
        setScheduleError(result.message);
        return;
      }
      setStageARows((prev) => prev.filter((r) => r.match.id !== matchId));
      setProposingMatchId(null);
      setCelebrate(true);
      setTimeout(() => setCelebrate(false), 2200);
    });
  };

  const inProgress = rows.filter((r) =>
    ["intro_requested", "interview_proposed", "interviewing"].includes(r.match.status)
  );
  const hired = rows.filter((r) => r.match.status === "hired");

  return (
    <div className="relative min-h-screen">
      <div className="dot-grid" />

      {celebrate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--bg)]/95">
          <div className="match-pulse absolute h-[60vmin] w-[60vmin] rounded-full bg-[var(--cyan)]/20" />
          <div className="relative text-center">
            <div className="mb-2 text-4xl font-semibold text-[var(--cyan)]">It&rsquo;s a match.</div>
            <div className="text-[15px] text-[var(--text-dim)]">We&rsquo;ve sent your proposed time to them.</div>
          </div>
        </div>
      )}

      <div className="relative z-10 mx-auto max-w-3xl px-6 py-10">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <div className="text-lg font-semibold text-[var(--text)]">{company.companyName}</div>
            <div className="text-sm text-[var(--text-dim)]">Your matches</div>
          </div>
          <div className="flex items-center gap-5">
            <form action={logoutCompany}>
              <button type="submit" className="text-sm font-semibold text-[var(--text-faint)] hover:text-[var(--danger)]">
                Log out
              </button>
            </form>
            <DeleteAccountButton onDelete={deleteCompanyAccount} />
          </div>
        </div>

        <div className="mb-10">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-[var(--text-faint)]">
            New candidates
          </h2>
          {stageAError && <p className="mb-4 text-sm text-[var(--danger)]">{stageAError}</p>}
          {stageACurrent ? (
            <div>
              <StageACandidateCard
                row={stageACurrent}
                onDecide={handleStageADecide}
                pending={stageAPending}
                scheduling={proposingMatchId === stageACurrent.match.id}
                onSubmitInterview={handleSubmitInterview}
                onCancelSchedule={handleCancelSchedule}
                schedulePending={schedulePending}
                scheduleError={scheduleError}
                onBlocked={handleBlocked}
              />
              {stageARows.length > 1 && proposingMatchId !== stageACurrent.match.id && (
                <p className="mt-3 text-center text-xs text-[var(--text-faint)]">
                  +{stageARows.length - 1} more waiting after this one
                </p>
              )}
            </div>
          ) : (
            <div className="card flex flex-col items-center gap-3 px-6 py-12 text-center">
              <div className="text-[15px] font-semibold text-[var(--text)]">
                {stageADeck.length > 0 || stageARemainingToday === 0 ? "That's everything for today" : "No new candidates right now"}
              </div>
              <p className="max-w-sm text-sm text-[var(--text-dim)]">
                {stageADeck.length > 0 || stageARemainingToday === 0
                  ? "Come back tomorrow for a fresh set of candidates."
                  : "We're lining up reps for your role, check back soon."}
              </p>
            </div>
          )}
        </div>

        {rows.length === 0 && stageARows.length === 0 && (
          <div className="card mb-10 flex flex-col items-center gap-3 px-6 py-16 text-center">
            <div className="text-[15px] font-semibold text-[var(--text)]">No matches yet</div>
            <p className="max-w-sm text-sm text-[var(--text-dim)]">
              We&rsquo;re reviewing reps on LandIt right now, your first candidate will show up here as soon as
              there&rsquo;s a fit.
            </p>
          </div>
        )}

        {inProgress.length > 0 && (
          <div className="mb-10">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-[var(--text-faint)]">
              Interviews
            </h2>
            <div className="space-y-4">
              {inProgress.map((row) => (
                <div key={row.match.id} className="card p-6">
                  <div className="mb-4 flex items-center justify-between">
                    <div className="text-[15px] font-semibold text-[var(--text)]">
                      {row.rep.fullName?.split(" ")[0]}
                    </div>
                    <StatusBadge status={row.match.status} />
                  </div>
                  <InterviewScheduler
                    matchId={row.match.id}
                    viewerRole="company"
                    meeting={row.meeting}
                    otherPartyLabel={row.rep.fullName?.split(" ")[0] || "the rep"}
                    proposeAction={proposeInterview}
                    confirmAction={confirmInterview}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {hired.length > 0 && (
          <div className="mb-10">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-[var(--text-faint)]">Hired</h2>
            <div className="space-y-3">
              {hired.map((row) => (
                <div key={row.match.id} className="card flex items-center justify-between p-5">
                  <span className="text-[15px] font-semibold text-[var(--text)]">
                    {row.rep.fullName?.split(" ")[0]}
                  </span>
                  <StatusBadge status="hired" />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      <SiteFooter />
    </div>
  );
}
