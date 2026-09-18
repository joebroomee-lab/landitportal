import Link from "next/link";

export const metadata = {
  title: "Terms of Use — LandIt",
};

export default function TermsPage() {
  return (
    <div className="relative flex min-h-screen flex-col items-center px-6 py-16">
      <div className="dot-grid" />
      <div className="card fade-up relative z-10 w-full max-w-2xl rounded-[24px] px-8 py-10 sm:px-12 sm:py-14">
        <Link href="/" className="serif mb-8 inline-block text-[15px] font-semibold text-[var(--text)] hover:text-[var(--cyan)]">
          LandIt
        </Link>

        <h1 className="mb-2 text-3xl">Terms of Use</h1>
        <p className="mb-8 text-[13px] text-[var(--text-faint)]">
          Last updated: 17 September 2026 · This is a draft prepared for LandIt and is not legal advice.
          Have a solicitor review it before it governs live use of the product.
        </p>

        <div className="space-y-6 text-[15px] leading-relaxed text-[var(--text-dim)]">
          <section>
            <h2 className="mb-2 text-lg text-[var(--text)]">1. Acceptance</h2>
            <p>
              By creating a profile or account on LandIt, whether as a rep or a company, you agree to
              these terms. If you don&rsquo;t agree, please don&rsquo;t use LandIt.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg text-[var(--text)]">2. What LandIt does</h2>
            <p>
              LandIt is a matching platform that introduces UK B2B sales representatives to companies
              hiring sales talent. We facilitate introductions and interview scheduling. We are not a
              recruitment agency and do not employ, and are not the employer of, any rep. Any employment
              or contracting relationship formed is strictly between the rep and the company.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg text-[var(--text)]">3. Your account</h2>
            <p>
              You must provide accurate information when creating your profile and keep it up to date.
              You are responsible for anything that happens under your account, and for the accuracy of
              anything you submit, including your CV, video, and work history.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg text-[var(--text)]">4. Acceptable use</h2>
            <p>You agree not to, on or through LandIt:</p>
            <p>
              Upload content that is false, misleading, abusive, harassing, discriminatory, sexually
              explicit, or otherwise unlawful; impersonate another person or company; attempt to
              circumvent the matching process to solicit or transact outside the platform in bad faith;
              scrape, harvest, or misuse other users&rsquo; data; or use LandIt for any purpose other than
              legitimate sales hiring and job seeking.
            </p>
            <p>
              We review video and profile submissions before they go live, and any user can report or
              block another user directly from the app. We may remove content or suspend accounts that
              violate these terms.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg text-[var(--text)]">5. Content ownership</h2>
            <p>
              You retain ownership of the content you submit (CV, video, profile information). By
              submitting it, you grant LandIt a licence to display it to prospective matches as part of
              operating the service.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg text-[var(--text)]">6. Termination</h2>
            <p>
              You can delete your account at any time from your dashboard, which permanently removes
              your profile, matches, and meeting records. We may suspend or terminate accounts that
              violate these terms.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg text-[var(--text)]">7. Disclaimers &amp; liability</h2>
            <p>
              LandIt is provided &ldquo;as is&rdquo;. We don&rsquo;t guarantee that any match will result in
              an interview, an offer, or an employment relationship, or vouch for the accuracy of any
              user&rsquo;s submitted content. To the fullest extent permitted by law, LandIt is not liable
              for indirect or consequential losses arising from your use of the platform.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg text-[var(--text)]">8. Governing law</h2>
            <p>These terms are governed by the laws of England and Wales.</p>
          </section>

          <section>
            <h2 className="mb-2 text-lg text-[var(--text)]">9. Contact</h2>
            <p>
              Questions about these terms can be sent to{" "}
              <a href="mailto:support@trylandit.io" className="text-[var(--cyan)] hover:underline">
                support@trylandit.io
              </a>
              .
            </p>
          </section>
        </div>

        <div className="mt-10 flex gap-4 text-[13px] font-medium text-[var(--text-faint)]">
          <Link href="/privacy" className="hover:text-[var(--cyan)]">Privacy Policy</Link>
          <Link href="/support" className="hover:text-[var(--cyan)]">Support</Link>
        </div>
      </div>
    </div>
  );
}
