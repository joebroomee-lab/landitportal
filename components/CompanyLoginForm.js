"use client";

import { useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { requestCompanyLoginLink } from "@/app/company/login/actions";

const ERROR_COPY = {
  missing: "That link is missing its token, request a new one below.",
  expired: "That link has expired, sign-in links only last 15 minutes. Request a new one below.",
};

export default function CompanyLoginForm() {
  const searchParams = useSearchParams();
  const linkError = ERROR_COPY[searchParams.get("error")] || "";

  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [pending, startTransition] = useTransition();

  const submit = (e) => {
    e.preventDefault();
    setError("");
    startTransition(async () => {
      const result = await requestCompanyLoginLink(email);
      if (result.success) {
        setSent(true);
        setMessage(result.message);
      } else {
        setError(result.message);
      }
    });
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <div className="dot-grid" />
      <div className="card fade-up relative z-10 flex w-full max-w-md flex-col items-center rounded-[24px] px-10 py-14">
        <h1 className="mb-3 text-2xl font-semibold text-[var(--text)]">Log in</h1>
        <p className="mb-8 text-[15px] leading-relaxed text-[var(--text-dim)]">
          Enter your work email and we&rsquo;ll send you a one-click sign-in link, no password needed.
        </p>

        {linkError && !sent && (
          <p className="mb-6 text-sm text-[var(--danger)]">{linkError}</p>
        )}

        {sent ? (
          <p className="text-[15px] leading-relaxed text-[var(--text)]">{message}</p>
        ) : (
          <form onSubmit={submit} className="w-full space-y-4">
            <input
              type="email"
              required
              className="field-input"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoFocus
            />
            <button type="submit" disabled={pending} className="btn btn-primary w-full">
              {pending ? "Sending…" : "Send sign-in link"}
            </button>
            {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
          </form>
        )}

        <Link
          href="/company/onboarding"
          className="mt-8 text-xs font-medium text-[var(--text-faint)] hover:text-[var(--cyan)]"
        >
          New here? Create a profile →
        </Link>
      </div>
    </div>
  );
}
