"use client";

import { useEffect, useState, useTransition } from "react";
import MatchCard from "@/components/MatchCard";
import StatusBadge from "@/components/StatusBadge";
import BulletText from "@/components/BulletText";
import PitchVideoUploader, { videoUploadConfigured } from "@/components/PitchVideoUploader";
import { briefSections } from "@/lib/brief";
import { logoutRep, repSwipe, deleteRepAccount } from "@/app/rep/dashboard/actions";
import SiteFooter from "@/components/SiteFooter";

const TABS = ["Discover", "Applications", "Feed", "Profile"];
const APPLICATION_VIDEO_MAX_SECONDS = 60;

// The mandatory record-your-application step shown once a rep taps the
// green tick. No skipping: the company's Stage A deck always has a video to
// watch alongside the profile, since it's attached right here rather than
// as a separate step after they've also said yes (see repSwipe's comment).
function ApplyVideoStep({ companyName, onSubmit, onCancel, pending }) {
  const [mode, setMode] = useState(videoUploadConfigured ? "upload" : "record");
  const [link, setLink] = useState("");
  const [error, setError] = useState("");

  const handleLinkSubmit = (e) => {
    e.preventDefault();
    if (!link.trim()) return;
    setError("");
    onSubmit(link.trim());
  };

  return (
    <div className="p-6">
      <div className="mb-1 text-[15px] font-semibold text-[var(--text)]">
        Record a quick application video
      </div>
      <p className="mb-4 text-sm leading-relaxed text-[var(--text-dim)]">
        Up to {APPLICATION_VIDEO_MAX_SECONDS} seconds, introduce yourself and say why you&rsquo;d be a
        good fit for {companyName}. This gets sent straight to them along with your profile, no
        skipping this bit, it&rsquo;s what gets you noticed.
      </p>

      {videoUploadConfigured && (
        <div className="mb-4 flex gap-2 border-b border-[var(--line-soft)]">
          {[
            ["upload", "Record / upload"],
            ["record", "Paste a link instead"],
          ].map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setMode(key)}
              className={`px-3 py-2 text-sm font-semibold transition ${
                mode === key
                  ? "border-b-2 border-[var(--cyan)] text-[var(--cyan)]"
                  : "text-[var(--text-dim)] hover:text-[var(--text)]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {mode === "upload" && videoUploadConfigured ? (
        <PitchVideoUploader onUploaded={onSubmit} maxDurationSeconds={APPLICATION_VIDEO_MAX_SECONDS} />
      ) : (
        <form onSubmit={handleLinkSubmit} className="space-y-3">
          <input
            type="url"
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="Paste a link to your video"
            className="field-input"
          />
          <button type="submit" disabled={pending || !link.trim()} className="btn btn-primary w-full">
            {pending ? "Submitting…" : "Submit application"}
          </button>
        </form>
      )}
      {error && <p className="mt-2 text-sm text-[var(--danger)]">{error}</p>}

      <button
        type="button"
        onClick={onCancel}
        disabled={pending}
        className="mt-4 w-full text-center text-xs font-semibold text-[var(--text-faint)] hover:text-[var(--cyan)]"
      >
        ← Back, not ready to apply yet
      </button>
    </div>
  );
}

function DiscoverCard({ row, onDecide, pending }) {
  const { match, company } = row;
  const [applying, setApplying] = useState(false);

  if (applying) {
    return (
      <div className="card overflow-hidden">
        <ApplyVideoStep
          companyName={company.companyName}
          pending={pending}
          onCancel={() => setApplying(false)}
          onSubmit={(videoUrl) => onDecide(match.id, "interested", videoUrl)}
        />
      </div>
    );
  }

  return (
    <div className="card overflow-hidden">
      <div className="p-6">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[var(--line)] bg-[var(--bg-raised)]">
            {company.logoUrl ? (
              <img src={company.logoUrl} alt={company.companyName} className="h-full w-full object-cover" />
            ) : (
              <span className="text-base font-semibold text-[var(--cyan)]">{company.companyName?.[0] || "?"}</span>
            )}
          </div>
          <div className="min-w-0">
            <div className="truncate text-lg font-semibold text-[var(--text)]">{company.companyName}</div>
            <div className="truncate text-sm text-[var(--text-dim)]">
              {match.roleTitle || company.roleTitle || "Role"}
              {company.seniority ? ` · ${company.seniority}` : ""}
            </div>
          </div>
        </div>

        {(match.companyBrief || company.icp) && (
          <div className="mb-4 space-y-4 rounded-[var(--radius-sm)] border border-[var(--line-soft)] bg-[var(--bg-raised)]/60 p-4">
            {briefSections(match.companyBrief || company.icp).map((s, i) => (
              <div key={i}>
                <div className="eyebrow mb-1.5">{s.label || `Why ${company.companyName}`}</div>
                <BulletText text={s.text} />
              </div>
            ))}
          </div>
        )}

        <div className="mb-4 flex flex-wrap gap-1.5">
          {company.industry && (
            <span className="badge" style={{ fontSize: 11, padding: "3px 10px" }}>
              {company.industry}
            </span>
          )}
          {company.dealSize && (
            <span className="badge badge-dim" style={{ fontSize: 11, padding: "3px 10px" }}>
              {company.dealSize}
            </span>
          )}
          {(company.tools || []).slice(0, 4).map((tool) => (
            <span key={tool} className="badge badge-dim" style={{ fontSize: 11, padding: "3px 10px" }}>
              {tool}
            </span>
          ))}
        </div>

        {match.matchReasonForRep && (
          <div className="mb-5 rounded-[var(--radius-sm)] border border-[var(--cyan)]/25 bg-[var(--cyan-soft)] p-4">
            <div className="eyebrow mb-2 text-[var(--cyan)]">Why this could be a fit</div>
            <BulletText text={match.matchReasonForRep} tone="bright" />
          </div>
        )}

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
            onClick={() => setApplying(true)}
            disabled={pending}
            aria-label="Interested"
            title="Interested"
            className="pulse-glow flex h-16 w-16 items-center justify-center rounded-full border-2 border-emerald-400/50 text-emerald-400 text-2xl font-semibold transition hover:border-emerald-400 hover:bg-emerald-400/10 disabled:opacity-40"
          >
            ✓
          </button>
        </div>
      </div>
    </div>
  );
}

function ApplicationRow({ row }) {
  const { match, company } = row;
  const waiting = match.status === "pending_review";
  const notSelected = match.status === "rejected";

  return (
    <div className="card flex items-center gap-4 p-5">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[var(--line)] bg-[var(--bg-raised)]">
        {company.logoUrl ? (
          <img src={company.logoUrl} alt={company.companyName} className="h-full w-full object-cover" />
        ) : (
          <span className="text-sm font-semibold text-[var(--cyan)]">{company.companyName?.[0] || "?"}</span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[15px] font-semibold text-[var(--text)]">{company.companyName}</div>
        <div className="truncate text-xs text-[var(--text-dim)]">{match.roleTitle || company.roleTitle || "Role"}</div>
      </div>
      {waiting ? (
        <span className="inline-flex shrink-0 items-center rounded-full border border-amber-300/30 bg-amber-300/10 px-2.5 py-1 text-xs font-semibold text-amber-300">
          Waiting on them
        </span>
      ) : notSelected ? (
        <span className="inline-flex shrink-0 items-center rounded-full border border-[var(--line)] px-2.5 py-1 text-xs font-semibold text-[var(--text-faint)]">
          Not selected
        </span>
      ) : (
        <StatusBadge status={match.status} hasVideo={!!match.repVideoUrl} />
      )}
    </div>
  );
}

export default function RepDashboard({
  rep,
  matches = [],
  deck = [],
  deckRemainingToday = 0,
  applications = [],
}) {
  const [tab, setTab] = useState(deck.length > 0 ? "Discover" : "Feed");
  const [deckRows, setDeckRows] = useState(deck);
  const [feedRows, setFeedRows] = useState(matches);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const firstName = rep.fullName.split(" ")[0];
  const title = rep.jobTitle || rep.notInSalesCategory || "Sales professional";

  useEffect(() => {
    setDeckRows(deck);
  }, [deck]);
  useEffect(() => {
    setFeedRows(matches);
  }, [matches]);

  const current = deckRows[0];

  // blockCompany already ended the match server-side — see
  // app/rep/dashboard/actions.js — drop it out of the Feed locally so it
  // disappears without waiting on revalidatePath's round trip. Mirrors
  // handleBlocked in components/CompanyDashboard.js.
  const handleBlocked = (matchId) => {
    setFeedRows((prev) => prev.filter((r) => r.match.id !== matchId));
  };

  // decision "interested" only ever arrives here once a video's already
  // attached (ApplyVideoStep won't call onDecide without one) — videoUrl is
  // undefined/ignored for "passed".
  const handleDecide = (matchId, decision, videoUrl) => {
    setError("");
    setDeckRows((prev) => prev.filter((r) => r.match.id !== matchId));
    startTransition(async () => {
      const result = await repSwipe(matchId, decision, videoUrl);
      if (!result.success) setError(result.message);
    });
  };

  return (
    <div className="relative min-h-screen">
      <div className="dot-grid" />
      <div className="relative z-10 mx-auto max-w-3xl px-6 py-10">
        <div className="card-lift mb-8 flex flex-wrap items-center gap-x-5 gap-y-3 p-6">
          <div className="ring-glow h-16 w-16 shrink-0 overflow-hidden rounded-full bg-[var(--bg-raised)]">
            {rep.photoUrl ? (
              <img src={rep.photoUrl} alt={firstName} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center serif text-xl text-[var(--cyan)]">
                {firstName[0]}
              </div>
            )}
          </div>
          {/* min-w-[9rem] (not min-w-0) so this never gets squeezed down to
              a couple of characters by the availability badge + logout
              button competing for space on a narrow screen — flex-wrap
              above sends those two to their own line instead once it's
              tight, rather than crushing the name. */}
          <div className="min-w-[9rem] max-w-full flex-1">
            <div className="truncate serif text-2xl text-[var(--text)]">{firstName}</div>
            <div className="truncate text-sm text-[var(--text-dim)]">{title}</div>
          </div>
          {rep.availability && (
            <span className="flex shrink-0 items-center gap-1.5 text-xs font-semibold text-[var(--cyan)]">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--cyan)]" />
              {rep.availability}
            </span>
          )}
          <form action={logoutRep} className="ml-auto sm:ml-0">
            <button
              type="submit"
              className="shrink-0 text-sm font-semibold text-[var(--text-faint)] hover:text-[var(--danger)]"
            >
              Log out
            </button>
          </form>
        </div>

        <div className="scrollbar-hide mb-8 flex gap-6 overflow-x-auto border-b border-[var(--line)]">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`-mb-px shrink-0 whitespace-nowrap px-1 py-3 text-sm font-semibold transition ${
                tab === t
                  ? "border-b-2 border-[var(--cyan)] text-[var(--text)]"
                  : "border-b-2 border-transparent text-[var(--text-faint)] hover:text-[var(--text-dim)]"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {tab === "Discover" && (
          <div>
            {error && <p className="mb-4 text-sm text-[var(--danger)]">{error}</p>}
            {current ? (
              <div>
                <DiscoverCard row={current} onDecide={handleDecide} pending={pending} />
                {deckRows.length > 1 && (
                  <p className="mt-3 text-center text-xs text-[var(--text-faint)]">
                    +{deckRows.length - 1} more waiting after this one
                  </p>
                )}
              </div>
            ) : (
              <div className="card flex flex-col items-center gap-3 px-6 py-16 text-center">
                <div className="text-[15px] font-semibold text-[var(--text)]">
                  {deck.length > 0 || deckRemainingToday === 0 ? "That's everything for today" : "Nothing new right now"}
                </div>
                <p className="max-w-sm text-sm text-[var(--text-dim)]">
                  {deck.length > 0 || deckRemainingToday === 0
                    ? "Come back tomorrow for a fresh set of companies to look through."
                    : "We're lining up companies for you, check back soon."}
                </p>
              </div>
            )}
          </div>
        )}

        {tab === "Applications" &&
          (applications.length === 0 ? (
            <div className="card flex flex-col items-center gap-3 px-6 py-16 text-center">
              <div className="text-[15px] font-semibold text-[var(--text)]">No applications yet</div>
              <p className="max-w-sm text-sm text-[var(--text-dim)]">
                Once you swipe interested on a company in Discover, it&rsquo;ll show up here so you
                can track whether they&rsquo;ve responded.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {applications.map((row) => (
                <ApplicationRow key={row.match.id} row={row} />
              ))}
            </div>
          ))}

        {tab === "Feed" &&
          (feedRows.length === 0 ? (
            <div className="card flex flex-col items-center gap-3 px-6 py-16 text-center">
              <div className="text-[15px] font-semibold text-[var(--text)]">
                No matches yet
              </div>
              <p className="max-w-sm text-sm text-[var(--text-dim)]">
                We&rsquo;re reviewing companies hiring on LandIt right now. Your match feed will fill
                up here as soon as a company fits your profile.
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              {feedRows.map(({ match, company, meeting }) => (
                <MatchCard key={match.id} match={match} company={company} meeting={meeting} onBlocked={handleBlocked} />
              ))}
            </div>
          ))}

        {tab === "Profile" && (
          <div className="space-y-6">
            {rep.bio && (
              <div className="card-lift p-6">
                <div className="eyebrow mb-2">About</div>
                <p className="text-[15px] leading-relaxed text-[var(--text)]">{rep.bio}</p>
              </div>
            )}

            <ProfileSection title="Contact">
              <ProfileRow label="Email" value={rep.email} />
              <ProfileRow label="Phone" value={rep.phone} />
              <ProfileRow label="Location" value={rep.location} />
              <ProfileRow
                label="LinkedIn"
                value={rep.linkedinUrl}
                href={rep.linkedinUrl ? normalizeUrl(rep.linkedinUrl) : null}
              />
            </ProfileSection>

            <ProfileSection title="What you're looking for">
              <ProfileRow label="Deal size" value={rep.dealSize} />
              <ProfileRow label="OTE" value={rep.ote} />
              <ProfileRow label="Industries" value={(rep.industries || []).join(", ")} />
              <ProfileRow label="Tools" value={(rep.tools || []).join(", ")} />
            </ProfileSection>

            <ProfileSection title="Intro video">
              {rep.pitchVideoUrl ? (
                <div className="text-sm text-[var(--text)]">Video on file</div>
              ) : (
                <button type="button" className="btn btn-ghost">
                  Add your intro video
                </button>
              )}
            </ProfileSection>

            <DangerZone onDelete={deleteRepAccount} />
          </div>
        )}
      </div>
      <SiteFooter />
    </div>
  );
}

// Self-serve account deletion, required for App Store review (guideline
// 5.1.1(v)) and a reasonable thing to offer regardless. Deleting the rep
// row cascades at the DB level to their matches and meetings, so there's
// nothing else to clean up here. window.confirm is a deliberately heavy
// speed bump for an irreversible action — no soft-delete/undo exists.
function DangerZone({ onDelete }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  const handleDelete = () => {
    if (
      !window.confirm(
        "Delete your LandIt account? This permanently removes your profile, matches, and meeting history. This can't be undone."
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
    <div className="rounded-[var(--radius-sm)] border border-[var(--danger)]/30 bg-[var(--danger-soft)] p-5">
      <div className="mb-1 text-[15px] font-semibold text-[var(--text)]">Delete account</div>
      <p className="mb-4 text-sm leading-relaxed text-[var(--text-dim)]">
        Permanently deletes your profile, matches, and meeting history. This can&rsquo;t be undone.
      </p>
      {error && <p className="mb-3 text-sm text-[var(--danger)]">{error}</p>}
      <button
        type="button"
        onClick={handleDelete}
        disabled={pending}
        className="text-sm font-semibold text-[var(--danger)] hover:underline disabled:opacity-60"
      >
        {pending ? "Deleting…" : "Delete my account"}
      </button>
    </div>
  );
}

function normalizeUrl(url) {
  if (!url) return null;
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

function ProfileSection({ title, children }) {
  return (
    <div className="card p-6">
      <div className="eyebrow mb-4">{title}</div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>
    </div>
  );
}

function ProfileRow({ label, value, href }) {
  return (
    <div>
      <div className="mb-1 text-xs font-medium text-[var(--text-faint)]">{label}</div>
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          className="text-[15px] font-medium text-[var(--cyan)] hover:underline"
        >
          {value}
        </a>
      ) : (
        <div className="text-[15px] text-[var(--text)]">{value || "-"}</div>
      )}
    </div>
  );
}
