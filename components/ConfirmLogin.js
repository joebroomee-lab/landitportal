"use client";

import { useState, useTransition } from "react";
import Link from "next/link";

// Shared by the rep and company verify pages. `confirmAction` is a server
// action (confirmRepLogin / confirmCompanyLogin) passed straight through
// from the server component — clicking the button is the only thing that
// actually consumes the login token.
export default function ConfirmLogin({ token, valid, name, confirmAction, loginHref }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  const confirm = () => {
    setError("");
    startTransition(async () => {
      const result = await confirmAction(token);
      // A successful confirm redirect()s server-side and never returns here.
      if (result && !result.success) {
        setError(result.message);
      }
    });
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <div className="dot-grid" />
      <div className="card fade-up relative z-10 flex w-full max-w-md flex-col items-center rounded-[24px] px-10 py-14">
        {valid && !error ? (
          <>
            <h1 className="mb-3 text-2xl font-semibold text-[var(--text)]">
              {name ? `Welcome back, ${name.split(" ")[0]}` : "Confirm sign-in"}
            </h1>
            <p className="mb-8 text-[15px] leading-relaxed text-[var(--text-dim)]">
              Click below to finish signing in to LandIt.
            </p>
            <button onClick={confirm} disabled={pending} className="btn btn-primary w-full">
              {pending ? "Signing you in…" : "Confirm sign-in"}
            </button>
            {error && <p className="mt-4 text-sm text-[var(--danger)]">{error}</p>}
          </>
        ) : (
          <>
            <h1 className="mb-3 text-2xl font-semibold text-[var(--text)]">Link expired</h1>
            <p className="mb-8 text-[15px] leading-relaxed text-[var(--text-dim)]">
              {error || "That link has expired or was already used. Request a new one."}
            </p>
            <Link href={loginHref} className="btn btn-primary w-full">
              Back to log in
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
