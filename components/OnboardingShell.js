"use client";

import { useRouter } from "next/navigation";

export default function OnboardingShell({
  stepNumber,
  totalSteps,
  onBack,
  canBack,
  title,
  subtitle,
  children,
  ctaLabel = "Continue",
  onCta,
  ctaDisabled,
  ctaLoading,
}) {
  const router = useRouter();
  const pct = Math.round((stepNumber / totalSteps) * 100);

  // Nothing here is saved to the server until the final Submit step, so
  // leaving early never leaves behind a half-created profile — but once
  // someone's past the first step they've likely typed real answers in, so
  // a plain click-away still deserves a "you sure?" rather than silently
  // discarding it. Step 1 skips the confirm since there's nothing to lose
  // yet.
  const handleExit = () => {
    if (stepNumber > 1 && !window.confirm("Leave onboarding? You'll lose your progress so far.")) {
      return;
    }
    router.push("/");
  };

  return (
    <div className="relative flex min-h-screen flex-col">
      <div className="dot-grid" />
      <div className="relative z-10 mx-auto flex w-full max-w-xl flex-1 flex-col px-6 py-8">
        <div className="mb-10">
          {/* A persistent brand mark doubles as the only always-available way
              out of the flow — previously the "← Back" button below was
              invisible on step 1, leaving no way to back out of onboarding
              at all short of the browser's own back button (which drops
              your progress with no warning). This also just orients you:
              you always know you're in LandIt onboarding, not stranded in a
              bare form. */}
          <div className="mb-4 flex items-center justify-between">
            <button
              type="button"
              onClick={handleExit}
              className="serif text-[15px] font-semibold text-[var(--text)] transition hover:text-[var(--cyan)]"
            >
              LandIt
            </button>
            <button
              type="button"
              onClick={onBack}
              disabled={!canBack}
              className="text-sm font-medium text-[var(--text-dim)] transition hover:text-[var(--cyan)] disabled:opacity-0"
            >
              ← Back
            </button>
          </div>
          {/* Progress bar only — no "STEP X OF Y" count. A visible total step
              count (this flow runs ~16 steps) reads as a long form and drives
              drop-off; the bar alone still signals "you're making progress"
              without setting that expectation. */}
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${pct}%` }} />
          </div>
        </div>

        <div className="fade-up flex flex-1 flex-col justify-center" key={stepNumber}>
          <h1 className="mb-2 text-[28px] font-semibold leading-tight text-[var(--text)] sm:text-[34px]">
            {title}
          </h1>
          {subtitle && (
            <p className="mb-8 text-[15px] text-[var(--text-dim)]">{subtitle}</p>
          )}
          {!subtitle && <div className="mb-8" />}

          <div className="mb-10">{children}</div>
        </div>

        <button
          type="button"
          className="btn btn-primary btn-block"
          onClick={onCta}
          disabled={ctaDisabled || ctaLoading}
        >
          {ctaLoading ? "Please wait…" : ctaLabel}
        </button>
      </div>
    </div>
  );
}
