"use client";

import { useActionState } from "react";
import { createCompany } from "@/app/admin/companies/actions";
import {
  COMPANY_SIZES,
  INDUSTRIES,
  SENIORITY_LEVELS,
  DEAL_SIZES,
  OTE_RANGES,
  TOOLS,
  HIRING_TIMELINES,
} from "@/lib/constants";

export default function CompanyForm() {
  const [state, formAction, pending] = useActionState(createCompany, null);

  return (
    <form action={formAction} className="card space-y-5 p-6">
      <Row>
        <Field label="Company name" name="companyName" required autoFocus />
        <Field label="Contact name" name="contactName" required />
      </Row>
      <Row>
        <Field label="Work email" name="workEmail" type="email" required />
        <Select label="Company size" name="companySize" options={COMPANY_SIZES} />
      </Row>
      <Row>
        <Select label="Industry" name="industry" options={INDUSTRIES} />
        <Field label="Role they're hiring for" name="roleTitle" placeholder="Mid-Market AE" />
      </Row>
      <Row>
        <Select label="Seniority" name="seniority" options={SENIORITY_LEVELS} />
        <Select label="Hiring timeline" name="timeline" options={HIRING_TIMELINES} />
      </Row>
      <Row>
        <Select label="Typical deal size" name="dealSize" options={DEAL_SIZES} />
        <Select label="OTE for this role" name="ote" options={OTE_RANGES} />
      </Row>

      <div>
        <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-[var(--text-faint)]">
          Tools they use
        </label>
        <div className="flex flex-wrap gap-2">
          {TOOLS.map((tool) => (
            <label key={tool} className="chip cursor-pointer">
              <input type="checkbox" name="tools" value={tool} className="hidden" />
              {tool}
            </label>
          ))}
        </div>
      </div>

      <div>
        <label
          htmlFor="icp"
          className="mb-2 block text-xs font-semibold uppercase tracking-wide text-[var(--text-faint)]"
        >
          Ideal customer profile (who they sell to)
        </label>
        <textarea id="icp" name="icp" rows={2} className="field-input" />
      </div>

      <div>
        <label
          htmlFor="notes"
          className="mb-2 block text-xs font-semibold uppercase tracking-wide text-[var(--text-faint)]"
        >
          Internal notes (what they told you, anything useful for matching)
        </label>
        <textarea id="notes" name="notes" rows={4} className="field-input" />
      </div>

      {state && state.success === false && (
        <p className="text-sm text-[var(--danger)]">{state.message}</p>
      )}

      <button type="submit" disabled={pending} className="btn btn-primary">
        {pending ? "Saving…" : "Add company"}
      </button>
    </form>
  );
}

function Row({ children }) {
  return <div className="grid gap-5 sm:grid-cols-2">{children}</div>;
}

function Field({ label, name, type = "text", required, placeholder, autoFocus }) {
  return (
    <div>
      <label
        htmlFor={name}
        className="mb-2 block text-xs font-semibold uppercase tracking-wide text-[var(--text-faint)]"
      >
        {label}
        {required && " *"}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className="field-input"
      />
    </div>
  );
}

function Select({ label, name, options }) {
  return (
    <div>
      <label
        htmlFor={name}
        className="mb-2 block text-xs font-semibold uppercase tracking-wide text-[var(--text-faint)]"
      >
        {label}
      </label>
      <select id={name} name={name} defaultValue="" className="field-input">
        <option value="" disabled>
          Select…
        </option>
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </div>
  );
}
