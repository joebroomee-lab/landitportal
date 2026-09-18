"use client";

import { useEffect, useState, useTransition } from "react";
import Modal from "@/components/Modal";
import StatusBadge from "@/components/StatusBadge";
import { previewMatchReasons, createPendingMatch, setPipelineStage } from "@/app/admin/matches/actions";
import { PIPELINE_STAGES } from "@/lib/pipeline";

function RepCard({ rep, onOpen, onMatchClick }) {
  const firstName = rep.fullName?.split(" ")[0] || "-";
  return (
    <div className="card p-4">
      <button type="button" onClick={() => onOpen(rep)} className="flex w-full items-center gap-3 text-left">
        <div className="h-11 w-11 shrink-0 overflow-hidden rounded-full border border-[var(--line)] bg-[var(--bg-raised)]">
          {rep.photoUrl ? (
            <img src={rep.photoUrl} alt={firstName} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-[var(--cyan)]">
              {firstName[0]}
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-[var(--text)]">{firstName}</div>
          <div className="truncate text-xs text-[var(--text-dim)]">{rep.jobTitle || "-"}</div>
        </div>
        {rep.availability && (
          <span className="badge shrink-0" style={{ fontSize: 10, padding: "2px 8px" }}>
            {rep.availability}
          </span>
        )}
      </button>
      <div className="mt-2.5 flex flex-wrap gap-1">
        {(rep.industries || []).slice(0, 2).map((t) => (
          <span key={t} className="badge-dim rounded-full border border-[var(--line)] px-2 py-0.5 text-[10px] text-[var(--text-faint)]">
            {t}
          </span>
        ))}
        {rep.dealSize && (
          <span className="badge-dim rounded-full border border-[var(--line)] px-2 py-0.5 text-[10px] text-[var(--text-faint)]">
            {rep.dealSize}
          </span>
        )}
        {(rep.tools || []).slice(0, 1).map((t) => (
          <span key={t} className="badge-dim rounded-full border border-[var(--line)] px-2 py-0.5 text-[10px] text-[var(--text-faint)]">
            {t}
          </span>
        ))}
      </div>
      <button
        type="button"
        onClick={() => onMatchClick(rep)}
        className="btn btn-ghost mt-3 w-full"
        style={{ padding: "6px 12px", fontSize: 12 }}
      >
        Match
      </button>
    </div>
  );
}

function CompanyCard({ company, onOpen }) {
  return (
    <button type="button" onClick={() => onOpen(company)} className="card flex w-full items-center gap-3 p-4 text-left">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[var(--line)] bg-[var(--bg-raised)]">
        {company.logoUrl ? (
          <img src={company.logoUrl} alt={company.companyName} className="h-full w-full object-cover" />
        ) : (
          <span className="text-sm font-semibold text-[var(--cyan)]">{company.companyName?.[0] || "?"}</span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold text-[var(--text)]">{company.companyName}</div>
        <div className="truncate text-xs text-[var(--text-dim)]">
          {company.roleTitle || "-"}
          {company.seniority ? ` · ${company.seniority}` : ""}
        </div>
      </div>
      {company.status === "pending" ? (
        // Still awaiting approval — can already be matched (see the comment
        // in app/admin/page.js), just flagged so it's obvious here too.
        <StatusBadge status="pending" />
      ) : (
        company.timeline && (
          <span className="badge shrink-0" style={{ fontSize: 10, padding: "2px 8px" }}>
            {company.timeline}
          </span>
        )
      )}
    </button>
  );
}

function PipelineStepper({ matchId, stage }) {
  const [current, setCurrent] = useState(stage || "matched");
  const [pending, startTransition] = useTransition();
  const currentIndex = Math.max(
    0,
    PIPELINE_STAGES.findIndex((s) => s.key === current)
  );

  const jump = (key) => {
    if (key === current) return;
    const prev = current;
    setCurrent(key);
    startTransition(async () => {
      const result = await setPipelineStage(matchId, key);
      if (!result.success) setCurrent(prev);
    });
  };

  return (
    <div className={pending ? "opacity-70" : ""}>
      <div className="flex items-center gap-1">
        {PIPELINE_STAGES.map((s, i) => (
          <button
            key={s.key}
            type="button"
            title={s.label}
            onClick={() => jump(s.key)}
            className={`h-1.5 flex-1 rounded-full transition ${
              i <= currentIndex ? "bg-[var(--cyan)]" : "bg-[var(--line)] hover:bg-[var(--text-faint)]"
            }`}
          />
        ))}
      </div>
      <button
        type="button"
        onClick={() => jump(PIPELINE_STAGES[currentIndex]?.key)}
        className="mt-2 block w-full text-center text-xs font-semibold text-[var(--text)]"
      >
        {PIPELINE_STAGES[currentIndex]?.label}
      </button>
      <div className="mt-1 flex justify-center gap-3">
        {currentIndex > 0 && (
          <button
            type="button"
            onClick={() => jump(PIPELINE_STAGES[currentIndex - 1].key)}
            className="text-[11px] font-medium text-[var(--text-faint)] hover:text-[var(--cyan)]"
          >
            ← Back
          </button>
        )}
        {currentIndex < PIPELINE_STAGES.length - 1 && (
          <button
            type="button"
            onClick={() => jump(PIPELINE_STAGES[currentIndex + 1].key)}
            className="text-[11px] font-medium text-[var(--cyan)] hover:underline"
          >
            Advance →
          </button>
        )}
      </div>
    </div>
  );
}

function MatchPair({ row }) {
  const { match, rep, company } = row;
  return (
    <div className="card-lift p-4">
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1 text-right">
          <div className="truncate text-sm font-semibold text-[var(--text)]">{rep.fullName?.split(" ")[0]}</div>
          <div className="truncate text-xs text-[var(--text-faint)]">{rep.jobTitle || ""}</div>
        </div>
        <div className="flex shrink-0 items-center">
          <div className="h-px w-6 bg-[var(--cyan)]/50" />
          <div className="h-1.5 w-1.5 rounded-full bg-[var(--cyan)] shadow-[0_0_8px_var(--cyan)]" />
          <div className="h-px w-6 bg-[var(--cyan)]/50" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-[var(--text)]">{company.companyName}</div>
          <div className="truncate text-xs text-[var(--text-faint)]">{company.roleTitle || ""}</div>
        </div>
      </div>

      {match.status === "rejected" ? (
        <div className="mt-3 flex justify-center">
          <StatusBadge status={match.status} hasVideo={!!match.repVideoUrl} />
        </div>
      ) : (
        <div className="mt-4 border-t border-[var(--line-soft)] pt-3">
          <PipelineStepper matchId={match.id} stage={match.pipelineStage} />
        </div>
      )}
    </div>
  );
}

function RepDetailModal({ rep, open, onClose }) {
  if (!rep) return null;
  return (
    <Modal open={open} onClose={onClose}>
      <div className="mb-4 flex items-center gap-4">
        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-full border border-[var(--line)] bg-[var(--bg-raised)]">
          {rep.photoUrl ? (
            <img src={rep.photoUrl} alt={rep.fullName} className="h-full w-full object-cover" />
          ) : null}
        </div>
        <div>
          <div className="text-lg font-semibold text-[var(--text)]">{rep.fullName}</div>
          <div className="text-sm text-[var(--text-dim)]">{rep.jobTitle || "-"}</div>
        </div>
      </div>
      <div className="space-y-3 text-sm">
        <Row label="Email" value={rep.email} />
        <Row label="Phone" value={rep.phone} />
        <Row label="LinkedIn (admin only)" value={rep.linkedinUrl} link />
        <Row label="Location" value={rep.location} />
        <Row label="Availability" value={rep.availability} />
        <Row label="Deal size" value={rep.dealSize} />
        <Row label="OTE" value={rep.ote} />
        <Row label="Industries" value={(rep.industries || []).join(", ")} />
        <Row label="Tools" value={(rep.tools || []).join(", ")} />
        <Row label="Tags" value={(rep.tags || []).join(", ")} />
        <Row label="Bio" value={rep.bio} />
      </div>
    </Modal>
  );
}

function CompanyDetailModal({ company, open, onClose }) {
  if (!company) return null;
  return (
    <Modal open={open} onClose={onClose} wide>
      <div className="mb-4">
        <div className="text-lg font-semibold text-[var(--text)]">{company.companyName}</div>
        <div className="text-sm text-[var(--text-dim)]">
          {company.roleTitle || "-"}
          {company.seniority ? ` · ${company.seniority}` : ""}
        </div>
      </div>
      <div className="space-y-3 text-sm">
        <Row label="Contact" value={`${company.contactName || "-"} (${company.workEmail})`} />
        <Row label="Company size" value={company.companySize} />
        <Row label="Industry" value={company.industry} />
        <Row label="Deal size" value={company.dealSize} />
        <Row label="OTE" value={company.ote} />
        <Row label="Timeline" value={company.timeline} />
        <Row label="Tools" value={(company.tools || []).join(", ")} />
        <Row label="Tags" value={(company.tags || []).join(", ")} />
        <Row label="ICP" value={company.icp} />
        <Row label="Notes" value={company.notes} />
      </div>
    </Modal>
  );
}

function Row({ label, value, link }) {
  return (
    <div>
      <div className="mb-0.5 text-xs font-semibold uppercase tracking-wide text-[var(--text-faint)]">{label}</div>
      {link && value ? (
        <a href={value} target="_blank" rel="noreferrer" className="text-[var(--cyan)] hover:underline">
          {value}
        </a>
      ) : (
        <div className="text-[var(--text)]">{value || "-"}</div>
      )}
    </div>
  );
}

// Two steps: pick a company and generate the AI reasoning for both sides
// (no database write yet, so it's cheap to regenerate), then review it and
// confirm to actually create the match — which lands in the rep's Discover
// deck, not straight in the pipeline. See db/schema.js's comment on
// repDecision/companyDecision for why.
function MatchPicker({ rep, companies, open, onClose, onCreated }) {
  const [companyId, setCompanyId] = useState("");
  const [reasons, setReasons] = useState(null); // { reasonForRep, reasonForCompany } | null
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  const reset = () => {
    setCompanyId("");
    setReasons(null);
    setError("");
  };

  if (!rep) return null;

  const handleGenerate = () => {
    if (!companyId) {
      setError("Pick a company first.");
      return;
    }
    setError("");
    startTransition(async () => {
      const result = await previewMatchReasons(rep.id, companyId);
      if (!result.success) {
        setError(result.message);
        return;
      }
      setReasons({ reasonForRep: result.reasonForRep, reasonForCompany: result.reasonForCompany });
    });
  };

  const handleConfirm = () => {
    setError("");
    startTransition(async () => {
      const result = await createPendingMatch(rep.id, companyId, reasons.reasonForRep, reasons.reasonForCompany);
      if (!result.success) {
        setError(result.message);
        return;
      }
      onCreated(result);
      reset();
      onClose();
    });
  };

  const company = companies.find((c) => c.id === companyId);

  return (
    <Modal open={open} onClose={() => { reset(); onClose(); }}>
      <div className="mb-1 text-lg font-semibold text-[var(--text)]">Match {rep.fullName?.split(" ")[0]}</div>
      <p className="mb-5 text-sm text-[var(--text-dim)]">
        Pick a company, generate the match reasoning, then confirm. It goes into{" "}
        {rep.fullName?.split(" ")[0]}&rsquo;s Discover deck first, the company only sees it once they&rsquo;ve
        said yes. Companies marked (pending review) haven&rsquo;t been approved yet, this will be
        waiting for them the moment they are.
      </p>
      <select
        value={companyId}
        onChange={(e) => {
          setCompanyId(e.target.value);
          setReasons(null);
        }}
        disabled={!!reasons}
        className="field-input mb-4"
      >
        <option value="">Select a company…</option>
        {companies.map((c) => (
          <option key={c.id} value={c.id}>
            {c.companyName} {c.roleTitle ? `- ${c.roleTitle}` : ""}
            {c.status === "pending" ? " (pending review)" : ""}
          </option>
        ))}
      </select>

      {!reasons ? (
        <button type="button" onClick={handleGenerate} disabled={pending || !companyId} className="btn btn-ghost w-full">
          {pending ? "Generating…" : "Generate match reasoning"}
        </button>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[var(--text-faint)]">
              Shown to {rep.fullName?.split(" ")[0]}
            </label>
            <textarea
              rows={3}
              className="field-input"
              value={reasons.reasonForRep}
              onChange={(e) => setReasons((r) => ({ ...r, reasonForRep: e.target.value }))}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[var(--text-faint)]">
              Shown to {company?.companyName || "the company"}
            </label>
            <textarea
              rows={3}
              className="field-input"
              value={reasons.reasonForCompany}
              onChange={(e) => setReasons((r) => ({ ...r, reasonForCompany: e.target.value }))}
            />
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={handleGenerate} disabled={pending} className="btn btn-ghost">
              Regenerate
            </button>
            <button type="button" onClick={handleConfirm} disabled={pending} className="btn btn-primary flex-1">
              {pending ? "Creating…" : "Create match"}
            </button>
          </div>
        </div>
      )}

      {error && <p className="mt-3 text-sm text-[var(--danger)]">{error}</p>}
    </Modal>
  );
}

const DECISION_LABELS = {
  awaiting_rep: "Awaiting rep",
  awaiting_company: "Awaiting company",
  rep_passed: "Rep passed",
  company_passed: "Company passed",
};

function pendingDecisionState(match) {
  if (match.repDecision === "passed") return "rep_passed";
  if (match.companyDecision === "passed") return "company_passed";
  if (match.repDecision !== "interested") return "awaiting_rep";
  return "awaiting_company";
}

function PendingMatchRow({ row }) {
  const { match, rep, company } = row;
  const state = pendingDecisionState(match);
  return (
    <div className="card flex items-center justify-between gap-3 p-3.5">
      <div className="min-w-0">
        <div className="truncate text-sm font-semibold text-[var(--text)]">
          {rep.fullName?.split(" ")[0]} <span className="text-[var(--text-faint)]">→</span> {company.companyName}
        </div>
      </div>
      <span
        className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
          state.includes("passed")
            ? "border-[var(--danger)]/30 text-[var(--danger)] bg-[var(--danger)]/10"
            : "border-amber-300/30 text-amber-300 bg-amber-300/10"
        }`}
      >
        {DECISION_LABELS[state]}
      </span>
    </div>
  );
}

export default function AdminDashboard({ reps, companies, matches, pendingMatches = [] }) {
  const [rows, setRows] = useState(matches);
  const [pendingRows, setPendingRows] = useState(pendingMatches);
  const [openRep, setOpenRep] = useState(null);
  const [openCompany, setOpenCompany] = useState(null);
  const [pickerRep, setPickerRep] = useState(null);
  const [justCreatedId, setJustCreatedId] = useState(null);

  // Keep in sync with fresh server data (e.g. a match's status changing
  // elsewhere) without clobbering the optimistic add from handleCreated —
  // see the same pattern/comment in CompanyDashboard.js.
  useEffect(() => {
    setRows(matches);
  }, [matches]);
  useEffect(() => {
    setPendingRows(pendingMatches);
  }, [pendingMatches]);

  const handleCreated = (result) => {
    const rep = reps.find((r) => r.id === result.match.repId);
    const company = companies.find((c) => c.id === result.match.companyId);
    if (!rep || !company) return;
    setPendingRows((prev) => [{ match: result.match, rep, company }, ...prev]);
    setJustCreatedId(result.match.id);
    setTimeout(() => setJustCreatedId(null), 2600);
  };

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-[var(--text)]">Dashboard</h1>

      {pendingRows.length > 0 && (
        <div className="mb-6">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--text-faint)]">
            Awaiting decision ({pendingRows.length})
          </h2>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {pendingRows.map((row) => (
              <div key={row.match.id} className={row.match.id === justCreatedId ? "pulse-glow rounded-[var(--radius-sm)]" : ""}>
                <PendingMatchRow row={row} />
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_1fr_280px]">
        <div>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--text-faint)]">
            Reps ({reps.length})
          </h2>
          <div className="max-h-[75vh] space-y-3 overflow-y-auto pr-1">
            {reps.length === 0 ? (
              <p className="text-sm text-[var(--text-faint)]">No approved reps yet.</p>
            ) : (
              reps.map((rep) => (
                <RepCard key={rep.id} rep={rep} onOpen={setOpenRep} onMatchClick={setPickerRep} />
              ))
            )}
          </div>
        </div>

        <div>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--text-faint)]">
            Active matches ({rows.length})
          </h2>
          <div className="max-h-[75vh] space-y-3 overflow-y-auto pr-1">
            {rows.length === 0 ? (
              <p className="text-sm text-[var(--text-faint)]">
                No matches yet, click Match on a rep to pair them with a company.
              </p>
            ) : (
              rows.map((row) => (
                <div key={row.match.id} className={row.match.id === justCreatedId ? "pulse-glow rounded-[var(--radius-sm)]" : ""}>
                  <MatchPair row={row} />
                </div>
              ))
            )}
          </div>
        </div>

        <div>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--text-faint)]">
            Companies ({companies.length})
          </h2>
          <div className="max-h-[75vh] space-y-3 overflow-y-auto pr-1">
            {companies.length === 0 ? (
              <p className="text-sm text-[var(--text-faint)]">No companies yet.</p>
            ) : (
              companies.map((company) => (
                <CompanyCard key={company.id} company={company} onOpen={setOpenCompany} />
              ))
            )}
          </div>
        </div>
      </div>

      <RepDetailModal rep={openRep} open={!!openRep} onClose={() => setOpenRep(null)} />
      <CompanyDetailModal company={openCompany} open={!!openCompany} onClose={() => setOpenCompany(null)} />
      <MatchPicker
        rep={pickerRep}
        companies={companies}
        open={!!pickerRep}
        onClose={() => setPickerRep(null)}
        onCreated={handleCreated}
      />
    </div>
  );
}
