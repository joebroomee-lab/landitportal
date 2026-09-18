"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
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
import { TAG_GROUPS } from "@/lib/tags";
import OnboardingShell from "./OnboardingShell";
import FileDropzone from "./FileDropzone";
import SupportNote from "./SupportNote";
import PitchVideoUploader, { videoUploadConfigured } from "./PitchVideoUploader";
import { submitRepOnboarding, extractRepProfileFromCV } from "@/app/rep/onboarding/actions";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// TAG_GROUPS is shared with CompanyOnboardingWizard (a company picks tags
// describing the rep they want, using the same vocabulary a rep picks tags
// describing themselves with) — so its "Rep style" label can't just be
// renamed in lib/tags.js without also changing what a company sees. This
// overrides the displayed label for this wizard only.
const TAG_GROUP_LABEL_OVERRIDES = {
  "Rep style": "How would you describe yourself?",
};

function getSteps(data) {
  const steps = ["cv", "fullName", "email", "phone", "photo", "linkedin", "inSales"];
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
    "tags",
    "pitchVideo"
  );
  return steps;
}

export default function RepOnboardingWizard() {
  const [data, setData] = useState({});
  const [stepIdx, setStepIdx] = useState(0);
  const [error, setError] = useState("");
  const [errorCode, setErrorCode] = useState("");
  const [debugError, setDebugError] = useState("");
  const [pending, startTransition] = useTransition();
  const [cvState, setCvState] = useState({ file: null, status: "idle", note: "", debugReason: null });
  const [cvUploading, setCvUploading] = useState(false);

  const steps = useMemo(() => getSteps(data), [data]);
  const key = steps[stepIdx];

  const set = (patch) => setData((d) => ({ ...d, ...patch }));

  const handleCvChange = (files) => {
    const file = files[files.length - 1] || null;
    setCvState({ file, status: file ? "extracting" : "idle", note: "" });
    set({ cvFileKey: file?.key || null });
    if (!file) return;

    extractRepProfileFromCV(file.key).then((result) => {
      if (result?.ok) {
        const f = result.fields;
        setData((d) => ({
          ...d,
          fullName: d.fullName || f.fullName || "",
          email: d.email || f.email || "",
          phone: d.phone || f.phone || "",
          jobTitle: f.jobTitle || d.jobTitle,
          inSales: d.inSales ?? f.inSales ?? null,
          location: f.location || d.location,
          linkedinUrl: f.linkedinUrl || d.linkedinUrl,
          industries: d.industries?.length ? d.industries : f.industries || [],
          tools: d.tools?.length ? d.tools : f.tools || [],
          dealSize: d.dealSize || f.dealSize,
          bio: d.bio || f.bio,
          tags: d.tags?.length ? d.tags : f.tags || [],
        }));
        setCvState({
          file,
          status: "done",
          note: "We've pre-filled your profile from your CV, check it as you go.",
        });
      } else {
        setCvState({
          file,
          status: "error",
          note: "Couldn't read that one automatically, no problem, just fill things in as you go.",
          // TEMPORARY while we're tracking down why extraction is failing —
          // shows the server's failure reason (e.g. "no_api_key",
          // "provider_error") right on the page so we don't have to dig
          // through Netlify's function logs. Remove once this is reliable.
          debugReason: result?.reason || null,
        });
      }
    });
  };

  const isValid = () => {
    switch (key) {
      case "cv":
        // Optional, you can skip it entirely. But while a file is still
        // uploading or mid-extract, hold here rather than let someone tap
        // through to fullName/email/phone before the pre-fill has landed,
        // otherwise those fields look blank even though the CV genuinely
        // had the answer, and whatever they type by hand then "wins" over
        // the real extracted value once it arrives (see the merge logic in
        // handleCvChange). Covers both phases: cvUploading is true for the
        // file upload itself, cvState.status is "extracting" for the AI
        // read that follows it.
        return !cvUploading && cvState.status !== "extracting";
      case "tags":
        return true; // optional
      case "fullName":
        return !!data.fullName?.trim();
      case "email":
        return EMAIL_RE.test(data.email || "");
      case "phone":
        return (data.phone || "").replace(/[^0-9]/g, "").length >= 7;
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
        // Choosing "Record now" isn't itself the finish line — you actually
        // have to hand over a video before Submit unlocks, otherwise the
        // choice does nothing and the profile goes in with no video at all
        // (see the inline capture widget below).
        return data.pitchVideoChoice === "later" || (data.pitchVideoChoice === "record" && !!data.pitchVideoUrl?.trim());
      default:
        return true;
    }
  };

  const goNext = () => {
    setError("");
    setErrorCode("");
    setDebugError("");
    if (stepIdx === steps.length - 1) {
      startTransition(async () => {
        // submitRepOnboarding returns a plain {success, code, message} object
        // for any expected failure (it only throws internally for the
        // redirect() on success, which we never see here since that
        // navigates the browser away). No try/catch needed on this side.
        const result = await submitRepOnboarding(data);
        if (result && result.success === false) {
          setError(result.message || "Something went wrong submitting your profile. Please try again.");
          setErrorCode(result.code || "");
          // TEMPORARY while we're debugging the submit flow pre-launch — shows
          // the raw server error so we don't have to dig through Netlify's
          // function logs. Remove once submissions are reliably working.
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

  if (key === "cv") {
    title = "Upload your CV";
    subtitle =
      "We'll use it to pre-fill your profile so this takes less time. You'll still get to check and edit everything before you submit. Totally optional.";
    content = (
      <div>
        <FileDropzone
          value={cvState.file ? [cvState.file] : []}
          onChange={handleCvChange}
          onBusyChange={setCvUploading}
          label="Drop your CV here, or click to browse"
          hint="PDF, Word doc, or text file, up to 8MB"
        />
        {(cvUploading || cvState.status === "extracting") && (
          <p className="mt-4 text-sm text-[var(--cyan)]">
            {cvUploading ? "Uploading your CV, this takes a few seconds." : "Reading your CV, this takes a few seconds."}
          </p>
        )}
        {cvState.note && (
          <p
            className={`mt-4 text-sm ${
              cvState.status === "error" ? "text-[var(--text-faint)]" : "text-[var(--cyan)]"
            }`}
          >
            {cvState.note}
          </p>
        )}
        {cvState.debugReason && (
          <p className="mt-1 font-mono text-xs text-[var(--text-faint)]">
            (debug: {cvState.debugReason})
          </p>
        )}
      </div>
    );
  } else if (key === "fullName") {
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
  } else if (key === "phone") {
    title = "What's your phone number?";
    subtitle = "So we can text you the moment you're approved and matched.";
    content = (
      <TextField
        type="tel"
        value={data.phone}
        onChange={(v) => set({ phone: v })}
        placeholder="07123 456789"
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
        placeholder="Sales Development Representative"
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
  } else if (key === "tags") {
    title = "A few tags for matching";
    subtitle =
      "Pick what fits: these help us explain why we've matched you with a company, and vice versa. We've pre-selected anything obvious from your CV.";
    content = (
      <div className="space-y-5">
        {TAG_GROUPS.map((group) => (
          <div key={group.label}>
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-faint)]">
              {TAG_GROUP_LABEL_OVERRIDES[group.label] || group.label}
            </div>
            <ChipGroup options={group.tags} value={data.tags || []} onChange={(v) => set({ tags: v })} />
          </div>
        ))}
      </div>
    );
  } else if (key === "pitchVideo") {
    title = "Record a video about you";
    subtitle =
      "A minute or two, personally and professionally. Who you are, what you've sold, and what you're looking for next. Reps with a video are 62% more likely to get hired on LandIt.";
    content = (
      <div>
        <div className="grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => set({ pitchVideoChoice: "record" })}
            className={`select-card ${data.pitchVideoChoice === "record" ? "active" : ""}`}
          >
            <div className="text-[15px] font-semibold text-[var(--text)]">Record now</div>
            <div className="mt-1 text-[13px] text-[var(--text-dim)]">
              Record your video as part of onboarding.
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

        {data.pitchVideoChoice === "record" && (
          <div className="mt-5 rounded-[var(--radius-sm)] border border-[var(--line)] bg-[var(--bg-raised)] p-4">
            {data.pitchVideoUrl ? (
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-semibold text-[var(--cyan)]">Video added ✓</div>
                <button
                  type="button"
                  onClick={() => set({ pitchVideoUrl: "" })}
                  className="text-xs font-semibold text-[var(--text-faint)] hover:text-[var(--danger)]"
                >
                  Remove
                </button>
              </div>
            ) : (
              <>
                {videoUploadConfigured && (
                  <PitchVideoUploader onUploaded={(url) => set({ pitchVideoUrl: url })} />
                )}
                <div className={videoUploadConfigured ? "mt-4 border-t border-[var(--line-soft)] pt-4" : ""}>
                  <p className="mb-2 text-[13px] text-[var(--text-dim)]">
                    {videoUploadConfigured ? "Or paste a link to a video you've already recorded:" : "Paste a link to your video:"}
                  </p>
                  <TextField
                    value={data.pitchVideoUrl || ""}
                    onChange={(v) => set({ pitchVideoUrl: v })}
                    placeholder="Paste a link to your video"
                  />
                </div>
              </>
            )}
          </div>
        )}
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
      {error && (
        <p className="mt-4 text-sm text-[var(--danger)]">
          {error}
          {errorCode === "duplicate" && (
            <>
              {" "}
              <Link href="/rep/login" className="font-semibold underline">
                Log in instead →
              </Link>
            </>
          )}
        </p>
      )}
      {error && errorCode !== "duplicate" && <SupportNote context="rep onboarding" />}
      {debugError && (
        <p className="mt-2 text-xs text-[var(--text-faint)]">Debug: {debugError}</p>
      )}
    </OnboardingShell>
  );
}
