const STYLES = {
  pending: "text-amber-300 border-amber-300/30 bg-amber-300/10",
  pending_review: "text-amber-300 border-amber-300/30 bg-amber-300/10",
  approved: "text-[var(--cyan)] border-[var(--cyan)]/30 bg-[var(--cyan-soft)]",
  rejected: "text-[var(--danger)] border-[var(--danger)]/30 bg-[var(--danger)]/10",
  active: "text-[var(--cyan)] border-[var(--cyan)]/30 bg-[var(--cyan-soft)]",
  matched: "text-[var(--cyan)] border-[var(--cyan)]/30 bg-[var(--cyan-soft)]",
  intro_requested: "text-violet-300 border-violet-300/30 bg-violet-300/10",
  interview_proposed: "text-violet-300 border-violet-300/30 bg-violet-300/10",
  interviewing: "text-amber-300 border-amber-300/30 bg-amber-300/10",
  hired: "text-emerald-300 border-emerald-300/30 bg-emerald-300/10",
};

const LABELS = {
  pending_review: "Pending Review",
  intro_requested: "Interview Pending",
  interview_proposed: "Interview Proposed",
  interviewing: "Interview Confirmed",
};

// "Matched" reads as "Video Submitted" once the rep has actually recorded
// their pitch — same underlying status, just a more useful label at that
// point. Callers pass hasVideo when they have it (matches.repVideoUrl).

export default function StatusBadge({ status, hasVideo }) {
  const cls = STYLES[status] || "text-[var(--text-dim)] border-[var(--line)] bg-transparent";
  const label =
    status === "matched" && hasVideo
      ? "Video Submitted"
      : LABELS[status] || (status ? status[0].toUpperCase() + status.slice(1) : "-");
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${cls}`}
    >
      {label}
    </span>
  );
}
