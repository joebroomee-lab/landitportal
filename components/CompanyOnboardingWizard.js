"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { TextField, TextAreaField, SelectCards, ChipGroup } from "./inputs";
import {
  INDUSTRIES,
  TOOLS,
  DEAL_SIZES,
  OTE_RANGES,
  COMPANY_SIZES,
  SENIORITY_LEVELS,
  HIRING_TIMELINES,
} from "@/lib/constants";
import { TAG_GROUPS } from "@/lib/tags";
import OnboardingShell from "./OnboardingShell";
import FileDropzone from "./FileDropzone";
import SupportNote from "./SupportNote";
import { submitCompanyOnboarding, extractCompanyProfile } from "@/app/company/onboarding/actions";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// No dedicated "what's your name" step — work email is enough to get
// started, and we derive a first-name greeting from it server-side
// (submitCompanyOnboarding). One less thing to ask before they're through.
const STEPS = [
  "files",
  "workEmail",
  "companyName",
  "companySize",
  "industry",
  "roleTitle",
  "seniority",
  "dealSize",
  "ote",
  "icp",
  "tools",
  "timeline",
  "notes",
  "tags",
];

export default function CompanyOnboardingWizard() {
  const [data, setData] = useState({});
  const [stepIdx, setStepIdx] = useState(0);
  const [error, setError] = useState("");
  const [errorCode, setErrorCode] = useState("");
  const [debugError, setDebugError] = useState("");
  const [pending, startTransition] = useTransition();
  const [files, setFiles] = useState([]); // uploaded file refs from FileDropzone
  const [extractState, setExtractState] = useState({ status: "idle", note: "", debugReason: null }); // idle | extracting | done | error

  const key = STEPS[stepIdx];
  const set = (patch) => setData((d) => ({ ...d, ...patch }));

  const isValid = () => {
    switch (key) {
      case "files":
        return true; // optional — but drives everything else below if used
      case "workEmail":
        return EMAIL_RE.test(data.workEmail || "");
      case "companyName":
        return !!data.companyName?.trim();
      case "companySize":
        return !!data.companySize;
      case "industry":
        return !!data.industry;
      case "roleTitle":
        return !!data.roleTitle?.trim();
      case "seniority":
        return !!data.seniority;
      case "dealSize":
        return !!data.dealSize;
      case "ote":
        return !!data.ote;
      case "icp":
        return !!data.icp?.trim();
      case "tools":
        return true; // optional
      case "timeline":
        return true; // optional
      case "notes":
        return true; // optional
      case "tags":
        return true; // optional
      default:
        return true;
    }
  };

  const runExtraction = async () => {
    if (files.length === 0) return;
    setExtractState({ status: "extracting", note: "" });
    const result = await extractCompanyProfile(files.map((f) => f.key));
    if (result?.ok) {
      const f = result.fields;
      setData((d) => ({
        ...d,
        companyName: d.companyName || f.companyName || "",
        companySize: d.companySize || f.companySize,
        industry: d.industry || f.industry,
        roleTitle: d.roleTitle || f.roleTitle,
        seniority: d.seniority || f.seniority,
        dealSize: d.dealSize || f.dealSize,
        ote: d.ote || f.ote,
        tools: d.tools?.length ? d.tools : f.tools || [],
        timeline: d.timeline || f.timeline,
        icp: d.icp || f.icp,
        notes: d.notes || f.notes,
        tags: d.tags?.length ? d.tags : f.tags || [],
      }));
      setExtractState({
        status: "done",
        note: "We've drafted your profile from those files, check it as you go.",
      });
    } else {
      setExtractState({
        status: "error",
        note: "Couldn't draft a profile from those automatically, no problem, just fill things in as you go.",
        // TEMPORARY — see the matching comment in RepOnboardingWizard.js.
        debugReason: result?.reason || null,
      });
    }
  };

  const goNext = () => {
    setError("");
    setErrorCode("");
    setDebugError("");

    if (key === "files") {
      set({ fileKeys: files.map((f) => f.key) });
      if (files.length > 0 && extractState.status === "idle") {
        // Stay on this step after extraction finishes rather than advancing
        // straight away — this is the "wow" moment (files in, drafted
        // profile out) and it's wasted if they never see the confirmation.
        // A second tap on Continue moves on, same as any other step.
        startTransition(runExtraction);
        return;
      }
      setStepIdx((i) => i + 1);
      return;
    }

    if (stepIdx === STEPS.length - 1) {
      startTransition(async () => {
        const result = await submitCompanyOnboarding(data);
        if (result && result.success === false) {
          setError(result.message || "Something went wrong submitting your profile. Please try again.");
          setErrorCode(result.code || "");
          if (result.debug) setDebugError(result.debug);
        }
      });
      return;
    }
    setStepIdx((i) => i + 1);
  };

  const goBack = () => setStepIdx((i) => Math.max(0, i - 1));

  let title = "";
  let subtitle = "";
  let content = null;

  if (key === "files") {
    title = "Drop in what you've got";
    subtitle =
      "Got a job description for the role? That alone is enough for us to draft most of your profile. Add a company overview, hiring thesis, values doc, branding, or articles too if you have them, we'll fold it all in. Totally optional, but it's the fastest way through this.";
    content = (
      <div>
        <FileDropzone
          value={files}
          onChange={setFiles}
          label="Drop a job description here, or click to browse"
          hint="Job description works best: PDF, Word, images, or text, up to 8MB each"
        />
        {extractState.status === "extracting" && (
          <p className="mt-4 text-sm text-[var(--cyan)]">Reading your files and drafting a profile…</p>
        )}
        {extractState.note && (
          <p
            className={`mt-4 text-sm ${
              extractState.status === "error" ? "text-[var(--text-faint)]" : "text-[var(--cyan)]"
            }`}
          >
            {extractState.note}
          </p>
        )}
        {extractState.debugReason && (
          <p className="mt-1 font-mono text-xs text-[var(--text-faint)]">
            (debug: {extractState.debugReason})
          </p>
        )}
        {extractState.status === "error" && <SupportNote context="company file upload" />}
      </div>
    );
  } else if (key === "workEmail") {
    title = "What's your work email?";
    content = (
      <TextField
        type="email"
        value={data.workEmail}
        onChange={(v) => set({ workEmail: v })}
        placeholder="jamie@company.com"
        autoFocus
      />
    );
  } else if (key === "companyName") {
    title = "What's your company called?";
    content = (
      <TextField value={data.companyName} onChange={(v) => set({ companyName: v })} placeholder="Acme Inc." autoFocus />
    );
  } else if (key === "companySize") {
    title = "How big is the company?";
    content = <SelectCards options={COMPANY_SIZES} value={data.companySize} onChange={(v) => set({ companySize: v })} />;
  } else if (key === "industry") {
    title = "What industry are you in?";
    content = <SelectCards options={INDUSTRIES} value={data.industry} onChange={(v) => set({ industry: v })} />;
  } else if (key === "roleTitle") {
    title = "What role are you hiring for?";
    content = (
      <TextField value={data.roleTitle} onChange={(v) => set({ roleTitle: v })} placeholder="Mid-Market AE" autoFocus />
    );
  } else if (key === "seniority") {
    title = "What seniority is this role?";
    content = <SelectCards options={SENIORITY_LEVELS} value={data.seniority} onChange={(v) => set({ seniority: v })} />;
  } else if (key === "dealSize") {
    title = "What's your typical deal size?";
    content = <SelectCards options={DEAL_SIZES} value={data.dealSize} onChange={(v) => set({ dealSize: v })} />;
  } else if (key === "ote") {
    title = "What's the OTE for this role?";
    content = <SelectCards options={OTE_RANGES} value={data.ote} onChange={(v) => set({ ote: v })} />;
  } else if (key === "icp") {
    title = "Who do you sell to?";
    subtitle =
      "Your ideal customer profile: who actually buys your product. We'll use this to brief your matched rep before they record a pitch of your business aimed at this exact customer.";
    content = (
      <TextAreaField
        value={data.icp}
        onChange={(v) => set({ icp: v })}
        placeholder="e.g. Heads of Sales at 50-500 person B2B SaaS companies, typically evaluating us during a re-platforming push"
      />
    );
  } else if (key === "tools") {
    title = "What tools does your team use?";
    subtitle = "Select all that apply.";
    content = <ChipGroup options={TOOLS} value={data.tools || []} onChange={(v) => set({ tools: v })} />;
  } else if (key === "timeline") {
    title = "What's your hiring timeline?";
    content = <SelectCards options={HIRING_TIMELINES} value={data.timeline} onChange={(v) => set({ timeline: v })} />;
  } else if (key === "notes") {
    title = "Anything else useful for matching?";
    subtitle = "Hiring thesis, values, what makes a rep a great fit here, whatever you'd tell us in person.";
    content = (
      <TextAreaField value={data.notes} onChange={(v) => set({ notes: v })} placeholder="What should we know when picking your match?" />
    );
  } else if (key === "tags") {
    title = "A few tags for matching";
    subtitle =
      "Pick what fits: these help us explain why we've matched you with a rep, and vice versa. We've pre-selected anything obvious from your files.";
    content = (
      <div className="space-y-5">
        {TAG_GROUPS.map((group) => (
          <div key={group.label}>
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-faint)]">
              {group.label}
            </div>
            <ChipGroup options={group.tags} value={data.tags || []} onChange={(v) => set({ tags: v })} />
          </div>
        ))}
      </div>
    );
  }

  return (
    <OnboardingShell
      stepNumber={stepIdx + 1}
      totalSteps={STEPS.length}
      canBack={stepIdx > 0}
      onBack={goBack}
      title={title}
      subtitle={subtitle}
      ctaLabel={stepIdx === STEPS.length - 1 ? "Submit profile" : "Continue"}
      ctaDisabled={!isValid()}
      ctaLoading={pending}
      onCta={goNext}
    >
      {content}
      {error && (
        <p className="mt-4 text-sm text-[var(--danger)]">
          {error}
          {errorCode === "duplicate" && (
            <>
              {" "}
              <Link href="/company/login" className="font-semibold underline">
                Log in instead →
              </Link>
            </>
          )}
        </p>
      )}
      {error && errorCode !== "duplicate" && <SupportNote context="company onboarding" />}
      {debugError && <p className="mt-2 text-xs text-[var(--text-faint)]">Debug: {debugError}</p>}
    </OnboardingShell>
  );
}
