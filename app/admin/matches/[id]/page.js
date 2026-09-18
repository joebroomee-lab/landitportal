import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { matches, reps, companies, meetings } from "@/db/schema";
import { setMatchStatus } from "@/app/admin/actions";
import {
  approveMatch,
  rejectMatch,
  updateCompanyBrief,
  updateMatchReasons,
  updateMatchTags,
  scheduleMeeting,
} from "@/app/admin/matches/actions";
import StatusBadge from "@/components/StatusBadge";
import TagEditor from "@/components/TagEditor";
import { formatMeetingTime } from "@/lib/format";

export const dynamic = "force-dynamic";

const PIPELINE_STATUSES = ["matched", "intro_requested", "interviewing", "hired"];

function toLocalInputValue(date) {
  if (!date) return "";
  const d = new Date(date);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(
    d.getMinutes()
  )}`;
}

export default async function AdminMatchDetailPage({ params }) {
  const { id } = await params;

  const [row] = await db
    .select({
      match: matches,
      rep: reps,
      company: companies,
    })
    .from(matches)
    .leftJoin(reps, eq(matches.repId, reps.id))
    .leftJoin(companies, eq(matches.companyId, companies.id))
    .where(eq(matches.id, id))
    .limit(1);

  if (!row) notFound();
  const { match, rep, company } = row;

  const [meeting] = await db.select().from(meetings).where(eq(meetings.matchId, id)).limit(1);

  const isPending = match.status === "pending_review";
  const isRejected = match.status === "rejected";

  return (
    <div className="max-w-2xl">
      <Link
        href="/admin/matches"
        className="mb-6 inline-block text-sm text-[var(--text-dim)] hover:text-[var(--cyan)]"
      >
        ← Back to Matches
      </Link>

      <div className="card mb-6 p-8">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-[var(--text)]">
              {rep?.fullName || "-"} <span className="text-[var(--text-faint)]">×</span>{" "}
              {company?.companyName || "-"}
            </h1>
            <p className="text-sm text-[var(--text-dim)]">
              {match.roleTitle || company?.roleTitle || "Role not specified"}
            </p>
          </div>
          <StatusBadge status={match.status} />
        </div>

        {isPending ? (
          <div className="mb-2 flex gap-2">
            <form action={approveMatch.bind(null, match.id)}>
              <button type="submit" className="btn btn-primary" style={{ padding: "10px 20px", fontSize: 14 }}>
                Force match now
              </button>
            </form>
            <form action={rejectMatch.bind(null, match.id)}>
              <button type="submit" className="btn btn-ghost" style={{ padding: "10px 20px", fontSize: 14 }}>
                Reject
              </button>
            </form>
          </div>
        ) : !isRejected ? (
          <div className="flex flex-wrap gap-2">
            {PIPELINE_STATUSES.map((s) => (
              <form key={s} action={setMatchStatus.bind(null, match.id, s)}>
                <button
                  type="submit"
                  disabled={match.status === s}
                  className="rounded-full border border-[var(--line)] px-3 py-1.5 text-xs font-semibold text-[var(--text-dim)] transition hover:border-[var(--cyan)] hover:text-[var(--cyan)] disabled:opacity-30"
                >
                  {s === "intro_requested" ? "Intro Req." : s[0].toUpperCase() + s.slice(1)}
                </button>
              </form>
            ))}
          </div>
        ) : null}

        {isPending && (
          <p className="mt-4 text-xs text-[var(--text-faint)]">
            {match.repDecision === "interested"
              ? "The rep said yes, this is now waiting on the company's decision in their swipe deck."
              : "This is sitting in the rep's Discover deck waiting on their decision. \"Force match now\" skips that and marks it matched immediately."}
          </p>
        )}
      </div>

      <div className="card mb-6 p-8">
        <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-[var(--text-faint)]">
          Swipe deck reasoning
        </h2>
        <p className="mb-4 text-xs text-[var(--text-faint)]">
          Shown on each side&rsquo;s swipe card before they decide. AI-drafted when the match was created,
          edit freely.
        </p>
        <form action={updateMatchReasons.bind(null, match.id)} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[var(--text-faint)]">
              Shown to {rep?.fullName?.split(" ")[0] || "the rep"}
            </label>
            <textarea name="matchReasonForRep" rows={3} defaultValue={match.matchReasonForRep || ""} className="field-input" />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[var(--text-faint)]">
              Shown to {company?.companyName || "the company"}
            </label>
            <textarea
              name="matchReasonForCompany"
              rows={3}
              defaultValue={match.matchReasonForCompany || ""}
              className="field-input"
            />
          </div>
          <button type="submit" className="btn btn-ghost" style={{ padding: "8px 18px", fontSize: 13 }}>
            Save reasoning
          </button>
        </form>
      </div>

      <div className="card mb-6 p-8">
        <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-[var(--text-faint)]">
          Company brief for the rep
        </h2>
        <p className="mb-4 text-xs text-[var(--text-faint)]">
          Shown to the rep before they record their bespoke video. Auto-drafted from the company&rsquo;s
          profile if it was left blank at creation, edit freely.
        </p>
        <form action={updateCompanyBrief.bind(null, match.id)} className="space-y-3">
          <textarea
            name="companyBrief"
            rows={4}
            defaultValue={match.companyBrief || ""}
            className="field-input"
          />
          <button type="submit" className="btn btn-ghost" style={{ padding: "8px 18px", fontSize: 13 }}>
            Save brief
          </button>
        </form>
      </div>

      <div className="card mb-6 p-8">
        <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-[var(--text-faint)]">
          Why you matched
        </h2>
        <p className="mb-4 text-xs text-[var(--text-faint)]">
          Shown to both the rep and the company as the reason for this match. Starts as whatever tags
          they already share, add or remove freely.
        </p>
        <TagEditor action={updateMatchTags} id={match.id} selected={match.matchTags || []} />
      </div>

      <div className="card mb-6 p-8">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-[var(--text-faint)]">
          Rep&rsquo;s 60-second pitch video
        </h2>
        {match.repVideoUrl ? (
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm text-[var(--text)]">Submitted, link on file</span>
            <a
              href={match.repVideoUrl}
              target="_blank"
              rel="noreferrer"
              className="text-sm font-semibold text-[var(--cyan)] hover:underline"
            >
              Open video ↗
            </a>
          </div>
        ) : (
          <p className="text-sm text-[var(--text-dim)]">
            Not recorded yet. The rep will see a prompt for this on their dashboard once the match is
            approved.
          </p>
        )}
      </div>

      <div className="card p-8">
        <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-[var(--text-faint)]">
          Meeting
        </h2>
        <p className="mb-4 text-xs text-[var(--text-faint)]">
          Companies don&rsquo;t have their own portal yet, so for now you&rsquo;re coordinating times
          by hand, set the confirmed slot here once it&rsquo;s agreed.
        </p>
        {meeting?.scheduledAt && (
          <p className="mb-4 text-sm text-[var(--text)]">
            Currently scheduled for{" "}
            <span className="font-semibold text-[var(--cyan)]">
              {formatMeetingTime(meeting.scheduledAt)}
            </span>
          </p>
        )}
        <form action={scheduleMeeting.bind(null, match.id)} className="space-y-4">
          <div>
            <label
              htmlFor="scheduledAt"
              className="mb-2 block text-xs font-semibold uppercase tracking-wide text-[var(--text-faint)]"
            >
              Date &amp; time
            </label>
            <input
              id="scheduledAt"
              name="scheduledAt"
              type="datetime-local"
              defaultValue={toLocalInputValue(meeting?.scheduledAt)}
              className="field-input"
            />
          </div>
          <div>
            <label className="flex items-center gap-2 text-sm text-[var(--text-dim)]">
              <input
                type="checkbox"
                name="notetakerRequested"
                defaultChecked={meeting?.notetakerRequested ?? true}
              />
              Bring a LandIt notetaker to this meeting
            </label>
            <p className="mt-1 pl-6 text-xs text-[var(--text-faint)]">
              Saves your intent for this meeting. The bot that actually joins calls isn&rsquo;t
              built yet, see delivery notes.
            </p>
          </div>
          <div>
            <label
              htmlFor="meetingNotes"
              className="mb-2 block text-xs font-semibold uppercase tracking-wide text-[var(--text-faint)]"
            >
              Notes (e.g. video call link)
            </label>
            <textarea
              id="meetingNotes"
              name="notes"
              rows={2}
              defaultValue={meeting?.notes || ""}
              className="field-input"
            />
          </div>
          <button type="submit" className="btn btn-primary" style={{ padding: "10px 20px", fontSize: 14 }}>
            {meeting?.scheduledAt ? "Update meeting" : "Schedule meeting"}
          </button>
        </form>
      </div>
    </div>
  );
}
