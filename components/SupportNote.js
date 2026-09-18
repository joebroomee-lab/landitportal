"use client";

// Small "still stuck?" link shown next to onboarding errors. Update
// SUPPORT_EMAIL once there's a real support inbox / help domain — for now
// it points at the founder's own address so nothing gets missed.
const SUPPORT_EMAIL = "joebroomee@gmail.com";

export default function SupportNote({ context }) {
  const subject = encodeURIComponent(`LandIt support: ${context || "onboarding issue"}`);
  return (
    <p className="mt-2 text-xs text-[var(--text-faint)]">
      Still stuck?{" "}
      <a
        href={`mailto:${SUPPORT_EMAIL}?subject=${subject}`}
        className="font-semibold text-[var(--cyan)] hover:underline"
      >
        Contact support
      </a>
    </p>
  );
}
