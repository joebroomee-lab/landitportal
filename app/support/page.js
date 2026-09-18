import Link from "next/link";

export const metadata = {
  title: "Support — LandIt",
};

export default function SupportPage() {
  return (
    <div className="relative flex min-h-screen flex-col items-center px-6 py-16">
      <div className="dot-grid" />
      <div className="card fade-up relative z-10 w-full max-w-2xl rounded-[24px] px-8 py-10 sm:px-12 sm:py-14">
        <Link href="/" className="serif mb-8 inline-block text-[15px] font-semibold text-[var(--text)] hover:text-[var(--cyan)]">
          LandIt
        </Link>

        <h1 className="mb-2 text-3xl">Support</h1>
        <p className="mb-8 text-[15px] leading-relaxed text-[var(--text-dim)]">
          Need help, spotted a bug, or want to report something on the platform? We&rsquo;re here.
        </p>

        <div className="space-y-6 text-[15px] leading-relaxed text-[var(--text-dim)]">
          <section>
            <h2 className="mb-2 text-lg text-[var(--text)]">Contact us</h2>
            <p>
              Email{" "}
              <a href="mailto:support@trylandit.io" className="text-[var(--cyan)] hover:underline">
                support@trylandit.io
              </a>{" "}
              and we&rsquo;ll get back to you, usually within one business day.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg text-[var(--text)]">Report or block someone</h2>
            <p>
              If a rep or company you&rsquo;re matched with has behaved inappropriately, or a profile
              looks wrong or fake, you can report it directly from the match card in your dashboard
              &mdash; look for &ldquo;Report&rdquo; or &ldquo;Block&rdquo; next to their profile. Blocking
              immediately ends that match and stops LandIt from matching you with them again. Reports go
              straight to our team for review. You can also email us directly at{" "}
              <a href="mailto:support@trylandit.io" className="text-[var(--cyan)] hover:underline">
                support@trylandit.io
              </a>{" "}
              with details.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg text-[var(--text)]">Delete your account</h2>
            <p>
              You can permanently delete your account and all associated data at any time from your
              dashboard &mdash; reps from the Profile tab, companies from the account menu. This removes
              your profile, matches, and meeting history right away and can&rsquo;t be undone.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg text-[var(--text)]">Common questions</h2>
            <p>
              <strong className="text-[var(--text)]">I didn&rsquo;t get my sign-in link.</strong>{" "}
              Check your spam folder, and make sure you&rsquo;re using the same email you signed up with.
              Links expire after 15 minutes, so request a fresh one if it&rsquo;s been a while.
            </p>
            <p>
              <strong className="text-[var(--text)]">Can I edit my profile after submitting it?</strong>{" "}
              Reach out to support and we&rsquo;ll help you update it.
            </p>
            <p>
              <strong className="text-[var(--text)]">How do interviews get scheduled?</strong>{" "}
              Once a company expresses interest, they propose a time directly in the app. You&rsquo;ll
              get an email with a calendar invite once it&rsquo;s confirmed.
            </p>
          </section>
        </div>

        <div className="mt-10 flex gap-4 text-[13px] font-medium text-[var(--text-faint)]">
          <Link href="/privacy" className="hover:text-[var(--cyan)]">Privacy Policy</Link>
          <Link href="/terms" className="hover:text-[var(--cyan)]">Terms of Use</Link>
        </div>
      </div>
    </div>
  );
}
