import Link from "next/link";

// Small, quiet legal/support footer — shared across the homepage and both
// dashboards so Privacy/Terms/Support are reachable from anywhere in the
// app, not just linked to each other in a loop. Kept out of onboarding
// (OnboardingShell is a focused, one-thing-at-a-time flow) but present
// everywhere someone actually spends time in the product.
export default function SiteFooter() {
  return (
    <footer className="relative z-10 mx-auto mt-auto w-full max-w-3xl px-6 pb-8 pt-4">
      <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs font-medium text-[var(--text-faint)]">
        <Link href="/privacy" className="hover:text-[var(--cyan)]">Privacy</Link>
        <Link href="/terms" className="hover:text-[var(--cyan)]">Terms</Link>
        <Link href="/support" className="hover:text-[var(--cyan)]">Support</Link>
      </div>
    </footer>
  );
}
