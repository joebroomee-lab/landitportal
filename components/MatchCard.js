"use client";

import { useState } from "react";
import {
  submitMatchVideo,
  proposeInterviewTime,
  confirmInterview,
  reportCompany,
  blockCompany,
} from "@/app/rep/dashboard/actions";
import StatusBadge from "@/components/StatusBadge";
import InterviewScheduler from "@/components/InterviewScheduler";
import PitchVideoUploader, { videoUploadConfigured } from "@/components/PitchVideoUploader";
import ReportBlockControls from "@/components/ReportBlockControls";
import { resolveVideo } from "@/lib/video";
import { formatMeetingTime } from "@/lib/format";
import { briefSections } from "@/lib/brief";
import BulletText from "@/components/BulletText";

export default function MatchCard({ match, company, meeting, onBlocked }) {
  const [videoUrl, setVideoUrl] = useState(match.repVideoUrl || "");
  const [expanded, setExpanded] = useState(!match.repVideoUrl);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [savedUrl, setSavedUrl] = useState(match.repVideoUrl || "");
  const [mode, setMode] = useState(videoUploadConfigured ? "upload" : "record"); // "record" | "upload"

  const video = savedUrl ? resolveVideo(savedUrl) : null;
  const scheduling = ["intro_requested", "interview_proposed", "interviewing", "hired"].includes(match.status);
  const sections = briefSections(match.companyBrief);

  const save = async (url) => {
    setError("");
    setSaving(true);
    const result = await submitMatchVideo(match.id, url);
    setSaving(false);
    if (!result.success) {
      setError(result.message);
      return;
    }
    setSavedUrl(url.trim());
    setExpanded(false);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!videoUrl.trim()) return;
    save(videoUrl);
  };

  return (
    <div className="card-lift overflow-hidden">
      <div className="flex items-start justify-between gap-4 p-6 pb-4">
        <div>
          <div className="serif text-xl text-[var(--text)]">{company.companyName}</div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-[var(--text-dim)]">
            <span>{match.roleTitle || company.roleTitle || "Role"}</span>
            {company.website && (
              <>
                <span className="text-[var(--text-faint)]">·</span>
                <a
                  href={company.website}
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-[var(--cyan)] hover:underline"
                >
                  Visit their site ↗
                </a>
              </>
            )}
          </div>
        </div>
        <StatusBadge status={match.status} hasVideo={!!savedUrl} />
      </div>

      {(company.industry || (match.matchTags || []).length > 0) && (
        <div className="flex flex-wrap gap-1.5 px-6 pb-4">
          {company.industry && (
            <span className="badge" style={{ fontSize: 11, padding: "3px 10px" }}>
              {company.industry}
            </span>
          )}
          {(match.matchTags || []).map((tag) => (
            <span key={tag} className="badge badge-dim" style={{ fontSize: 11, padding: "3px 10px" }}>
              {tag}
            </span>
          ))}
        </div>
      )}

      {sections.length > 0 && (
        <div className="mx-6 mb-4 space-y-3 rounded-[var(--radius-sm)] border border-[var(--line-soft)] bg-[var(--bg-raised)]/60 p-4">
          {sections.map((s, i) => (
            <div key={i}>
              {s.label && <div className="eyebrow mb-1.5">{s.label}</div>}
              <BulletText text={s.text} />
            </div>
          ))}
        </div>
      )}

      {meeting?.scheduledAt && meeting.status !== "confirmed" && !scheduling && (
        <div className="mx-6 mb-4 rounded-[var(--radius-sm)] border border-[var(--cyan)]/30 bg-[var(--cyan-soft)] px-4 py-3 text-sm text-[var(--text)]">
          Meeting scheduled: <span className="font-semibold">{formatMeetingTime(meeting.scheduledAt)}</span>
        </div>
      )}

      <div className="border-t border-[var(--line-soft)] px-6 py-5">
        {scheduling ? (
          <InterviewScheduler
            matchId={match.id}
            viewerRole="rep"
            meeting={meeting}
            otherPartyLabel={company.companyName}
            proposeAction={proposeInterviewTime}
            confirmAction={confirmInterview}
          />
        ) : (
          <>
            {!expanded && savedUrl && (
              <div>
                <div className="mb-1 text-sm font-semibold text-[var(--text)]">Pitch submitted</div>
                <p className="mb-3 text-sm text-[var(--text-dim)]">
                  {company.companyName} is reviewing it, we'll let you know as soon as they respond.
                </p>
                <div className="mb-3 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setExpanded(true)}
                    className="text-xs font-semibold text-[var(--cyan)] hover:underline"
                  >
                    Replace it
                  </button>
                </div>
                {video?.kind === "iframe" && (
                  <div className="aspect-video overflow-hidden rounded-[var(--radius-sm)] border border-[var(--line)]">
                    <iframe
                      src={video.src}
                      className="h-full w-full"
                      allow="autoplay; fullscreen; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                )}
                {video?.kind === "video" && (
                  <video src={video.src} controls className="w-full rounded-[var(--radius-sm)] border border-[var(--line)]" />
                )}
                {video?.kind === "link" && (
                  <a href={savedUrl} target="_blank" rel="noreferrer" className="text-sm font-semibold text-[var(--cyan)] hover:underline">
                    Open your video ↗
                  </a>
                )}
              </div>
            )}

            {!expanded && !savedUrl && (
              <div className="flex items-center justify-between gap-4">
                <p className="text-sm text-[var(--text-dim)]">
                  You haven&rsquo;t recorded your pitch for {company.companyName} yet.
                </p>
                <button type="button" onClick={() => setExpanded(true)} className="btn btn-ghost shrink-0">
                  Record now
                </button>
              </div>
            )}

            {expanded && (
              <div>
                <div className="mb-1 text-[15px] font-semibold text-[var(--text)]">Record your pitch</div>
                <div className="mb-4 rounded-[var(--radius-sm)] border border-[var(--line)] bg-[var(--bg-raised)] p-4 text-sm leading-relaxed text-[var(--text-dim)]">
                  You&rsquo;ve just got someone from {company.companyName}&rsquo;s ideal customer on a call.
                  They&rsquo;ve got 60 seconds. Show us you can actually sell: pitch {company.companyName}&rsquo;s
                  product like you already work there, using the brief above.
                </div>

                {videoUploadConfigured && (
                  <div className="mb-4 flex gap-2 border-b border-[var(--line-soft)]">
                    {[
                      ["upload", "Upload a video"],
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
                  <PitchVideoUploader onUploaded={(url) => save(url)} />
                ) : (
                  <form onSubmit={handleSave} className="space-y-3">
                    <input
                      type="url"
                      value={videoUrl}
                      onChange={(e) => setVideoUrl(e.target.value)}
                      placeholder="Paste a link to your video"
                      className="field-input"
                    />
                    <div className="flex gap-2">
                      <button type="submit" disabled={saving || !videoUrl.trim()} className="btn btn-primary">
                        {saving ? "Saving…" : "Save video"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setVideoUrl(savedUrl);
                          setError("");
                          setExpanded(false);
                        }}
                        className="btn btn-ghost"
                      >
                        {savedUrl ? "Cancel" : "I'll do this later"}
                      </button>
                    </div>
                  </form>
                )}
                <p className="mt-3 text-xs text-[var(--text-faint)]">
                  {videoUploadConfigured
                    ? "Record on your phone or computer and upload it directly, keep it under 5 minutes."
                    : "Record on your phone, then paste a link to it below, keep it under 5 minutes."}
                </p>
                {error && <p className="mt-2 text-sm text-[var(--danger)]">{error}</p>}
              </div>
            )}
          </>
        )}
      </div>

      <div className="flex justify-center border-t border-[var(--line-soft)] px-6 py-3">
        <ReportBlockControls
          otherPartyLabel={company.companyName}
          reportAction={(reason) => reportCompany(match.id, reason)}
          blockAction={(reason) => blockCompany(match.id, reason)}
          onBlocked={() => onBlocked?.(match.id)}
        />
      </div>
    </div>
  );
}
