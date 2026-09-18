"use client";

import { useMemo, useState, useTransition } from "react";
import {
  TextField,
  TextAreaField,
  SelectCards,
  ChipGroup,
  PhotoUpload,
} from "./inputs";
import {
  INDUSTRIES,
  TOOLS,
  DEAL_SIZES,
  OTE_RANGES,
  NOT_IN_SALES_OPTIONS,
  AVAILABILITY_OPTIONS,
} from "@/lib/constants";
import OnboardingShell from "./OnboardingShell";
import { submitRepOnboarding } from "@/app/rep/onboarding/actions";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getSteps(data) {
  const steps = ["fullName", "email", "photo", "linkedin", "inSales"];
  if (data.inSales === true) steps.push("jobTitle");
  else if (data.inSales === false) steps.push("notInSalesCategory");
  steps.push(
    "industries",
    "dealSize",
    "tools",
    "ote",
    "location",
    "availability",
    "bio",
    "pitchVideo"
  );
  return steps;
}

export default function RepOnboardingWizard() {
  const [data, setData] = useState({});
  const [stepIdx, setStepIdx] = useState(0);
  const [error, setError] = useState("");
  const [debugError, setDebugError] = useState("");
  const [pending, startTransition] = useTransition();

  const steps = useMemo(() => getSteps(data), [data]);
  const key = steps[stepIdx];

  const set = (patch) => setData((d) => ({ ...d, ...patch }));

  const isValid = () => {
    switch (key) {
      case "fullName":
        return !!data.fullName?.trim();
      case "email":
        return EMAIL_RE.test(data.email || "");
      case "photo":
        return true; // optional in MVP
      case "linkedin":
        return true; // optional
      case "inSales":
        return data.inSales === true || data.inSales === false;
      case "jobTitle":
        return !!data.jobTitle?.trim();
      case "notInSalesCategory":
        return !!data.notInSalesCategory;
      case "industries":
        return (data.industries || []).length > 0;
      case "dealSize":
        return !!data.dealSize;
      case "tools":
        return (data.tools || []).length > 0;
      case "ote":
        return !!data.ote;
      case "location":
        return !!data.location?.trim();
      case "availability":
        return !!data.availability;
      case "bio":
        return !!data.bio?.trim();
      case "pitchVideo":
        return !!data.pitchVideoChoice;
      default:
        return true;
    }
  };

  const goNext = () => {
    setError("");
    setDebugError("");
    if (stepIdx === steps.length - 1) {
      startTransition(async () => {
        try {
          await submitRepOnboarding(data);
        } catch (e) {
          if (e?.digest?.startsWith?.("NEXT_REDIRECT")) throw e;
          setError(
            e?.message?.includes("duplicate") || e?.cause?.code === "23505"
              ? "That email is already registered, try logging in from the dashboard instead."
              : "Something went wrong submitting your profile. Please try again."
          );
          // TEMPORARY while we're debugging the submit flow pre-launch — shows
          // the raw server error so we don't have to dig through Netlify's
          // function logs. Remove once submissions are reliably working.
          setDebugError(e?.message || String(e));
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

  if (key === "fullName") {
    title = "What's your full name?";
    content = (
      <TextField
        value={data.fullName}
        onChange={(v) => set({ fullName: v })}
        placeholder="Jordan Smith"
        autoFocus
      />
    );
  } else if (key === "email") {
    title = "What's your email address?";
    content = (
      <TextField
        type="email"
        value={data.email}
        onChange={(v) => set({ email: v })}
        placeholder="jordan@email.com"
        autoFocus
      />
    );
  } else if (key === "photo") {
    title = "Add a profile photo";
    subtitle = "Optional for now. You can add one later from your dashboard.";
    content = <PhotoUpload value={data.photoUrl} onChange={(v) => set({ photoUrl: v })} />;
  } else if (key === "linkedin") {
    title = "What's your LinkedIn URL?";
    content = (
      <div>
        <TextField
          value={data.linkedinUrl}
          onChange={(v) => set({ linkedinUrl: v })}
          placeholder="linkedin.com/in/jordansmith"
          autoFocus
        />
        <p className="mt-3 text-[13px] text-[var(--text-faint)]">
          Used for verification only. Never shown on your profile.
        </p>
      </div>
    );
  } else if (key === "inSales") {
    title = "Are you currently working in B2B sales?";
    content = (
      <SelectCards
        options={["Yes", "No"]}
        columns={2}
        value={data.inSales === true ? "Yes" : data.inSales === false ? "No" : null}
        onChange={(v) => set({ inSales: v === "Yes" })}
      />
    );
  } else if (key === "jobTitle") {
    title = "What's your current job title?";
    content = (
      <TextField
        value={data.jobTitle}
        onChange={(v) => set({ jobTitle: v })}
        placeholder="Mid-Market Account Executive"
        autoFocus
      />
    );
  } else if (key === "notInSalesCategory") {
    title = "What best describes you?";
    content = (
      <SelectCards
        options={NOT_IN_SALES_OPTIONS}
        value={data.notInSalesCategory}
        onChange={(v) => set({ notInSalesCategory: v })}
      />
    );
  } else if (key === "industries") {
    title = "Which industries have you sold into?";
    subtitle = "Select all that apply.";
    content = (
      <ChipGroup
        options={INDUSTRIES}
        value={data.industries || []}
        onChange={(v) => set({ industries: v })}
      />
    );
  } else if (key === "dealSize") {
    title = "What's your average deal size?";
    content = (
      <SelectCards
        options={DEAL_SIZES}
        value={data.dealSize}
        onChange={(v) => set({ dealSize: v })}
      />
    );
  } else if (key === "tools") {
    title = "Which sales tools do you use?";
    subtitle = "Select all that apply.";
    content = (
      <ChipGroup options={TOOLS} value={data.tools || []} onChange={(v) => set({ tools: v })} />
    );
  } else if (key === "ote") {
    title = "What's your current or most recent OTE?";
    content = (
      <SelectCards options={OTE_RANGES} value={data.ote} onChange={(v) => set({ ote: v })} />
    );
  } else if (key === "location") {
    title = "Where are you based?";
    content = (
      <TextField
        value={data.location}
        onChange={(v) => set({ location: v })}
        placeholder="e.g. London, UK"
        autoFocus
      />
    );
  } else if (key === "availability") {
    title = "What's your availability?";
    content = (
      <SelectCards
        options={AVAILABILITY_OPTIONS}
        value={data.availability}
        onChange={(v) => set({ availability: v })}
      />
    );
  } else if (key === "bio") {
    title = "Give us a short bio";
    subtitle = "What makes you a great sales hire? Keep it sharp.";
    content = (
      <TextAreaField
        value={data.bio}
        onChange={(v) => set({ bio: v })}
        placeholder="What makes you a great sales hire? Keep it sharp."
      />
    );
  } else if (key === "pitchVideo") {
    title = "Record your pitch video";
    subtitle =
      "A 1-2 minute video introducing yourself. How you show up and sell is up to you, this is your chance to stand out. Seen by matched companies only.";
    content = (
      <div className="grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => set({ pitchVideoChoice: "record" })}
          className={`select-card ${data.pitchVideoChoice === "record" ? "active" : ""}`}
        >
          <div className="text-[15px] font-semibold text-[var(--text)]">Record now</div>
          <div className="mt-1 text-[13px] text-[var(--text-dim)]">
            Record your pitch as part of onboarding.
          </div>
        </button>
        <button
          type="button"
          onClick={() => set({ pitchVideoChoice: "later" })}
          className={`select-card ${data.pitchVideoChoice === "later" ? "active" : ""}`}
        >
          <div className="text-[15px] font-semibold text-[var(--text)]">
            Upload later from dashboard
          </div>
          <div className="mt-1 text-[13px] text-[var(--text-dim)]">
            Skip for now and finish your profile.
          </div>
        </button>
      </div>
    );
  }

  return (
    <OnboardingShell
      stepNumber={stepIdx + 1}
      totalSteps={steps.length}
      canBack={stepIdx > 0}
      onBack={goBack}
      title={title}
      subtitle={subtitle}
      ctaLabel={stepIdx === steps.length - 1 ? "Submit profile" : "Continue"}
      ctaDisabled={!isValid()}
      ctaLoading={pending}
      onCta={goNext}
    >
      {content}
      {error && <p className="mt-4 text-sm text-[var(--danger)]">{error}</p>}
      {debugError && (
        <p className="mt-2 text-xs text-[var(--text-faint)]">Debug: {debugError}</p>
      )}
    </OnboardingShell>
  );
}
