"use client";

import { useActionState } from "react";
import { createMatch } from "@/app/admin/matches/actions";

export default function MatchForm({ reps, companies }) {
  const [state, formAction, pending] = useActionState(createMatch, null);

  return (
    <form action={formAction} className="card space-y-5 p-6">
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label
            htmlFor="repId"
            className="mb-2 block text-xs font-semibold uppercase tracking-wide text-[var(--text-faint)]"
          >
            Rep *
          </label>
          <select id="repId" name="repId" required defaultValue="" className="field-input">
            <option value="" disabled>
              Select a rep…
            </option>
            {reps.map((r) => (
              <option key={r.id} value={r.id}>
                {r.fullName} - {r.jobTitle || r.notInSalesCategory || "Sales"}
              </option>
            ))}
          </select>
          {reps.length === 0 && (
            <p className="mt-1.5 text-xs text-[var(--danger)]">
              No approved reps yet, approve one from the Reps tab first.
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="companyId"
            className="mb-2 block text-xs font-semibold uppercase tracking-wide text-[var(--text-faint)]"
          >
            Company *
          </label>
          <select id="companyId" name="companyId" required defaultValue="" className="field-input">
            <option value="" disabled>
              Select a company…
            </option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.companyName} {c.roleTitle ? `- ${c.roleTitle}` : ""}
                {c.status === "pending" ? " (pending review)" : ""}
              </option>
            ))}
          </select>
          {companies.length === 0 && (
            <p className="mt-1.5 text-xs text-[var(--danger)]">
              No companies yet, add one first.
            </p>
          )}
        </div>
      </div>

      <div>
        <label
          htmlFor="roleTitle"
          className="mb-2 block text-xs font-semibold uppercase tracking-wide text-[var(--text-faint)]"
        >
          Role title (optional, defaults to the company&rsquo;s listed role)
        </label>
        <input id="roleTitle" name="roleTitle" className="field-input" placeholder="Mid-Market AE" />
      </div>

      <div>
        <label
          htmlFor="matchReason"
          className="mb-2 block text-xs font-semibold uppercase tracking-wide text-[var(--text-faint)]"
        >
          Why this match (internal, not shown to the rep or company)
        </label>
        <textarea
          id="matchReason"
          name="matchReason"
          rows={2}
          className="field-input"
          placeholder="e.g. Deal size and tools line up closely, rep is actively looking"
        />
      </div>

      <div>
        <label
          htmlFor="companyBrief"
          className="mb-2 block text-xs font-semibold uppercase tracking-wide text-[var(--text-faint)]"
        >
          Company brief for the rep (optional, leave blank to auto-draft one from the company&rsquo;s
          profile)
        </label>
        <textarea
          id="companyBrief"
          name="companyBrief"
          rows={4}
          className="field-input"
          placeholder="Shown to the rep before they record their video. Leave blank and we'll draft one for you."
        />
      </div>

      {state && state.success === false && (
        <p className="text-sm text-[var(--danger)]">{state.message}</p>
      )}

      <button
        type="submit"
        disabled={pending || reps.length === 0 || companies.length === 0}
        className="btn btn-primary"
      >
        {pending ? "Creating…" : "Create match"}
      </button>
      <p className="text-xs text-[var(--text-faint)]">
        New matches start in review. You&rsquo;ll approve it on the next screen before the rep sees
        anything.
      </p>
    </form>
  );
}
