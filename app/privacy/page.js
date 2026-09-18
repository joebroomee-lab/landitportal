import Link from "next/link";

export const metadata = {
  title: "Privacy Policy — LandIt",
};

export default function PrivacyPage() {
  return (
    <div className="relative flex min-h-screen flex-col items-center px-6 py-16">
      <div className="dot-grid" />
      <div className="card fade-up relative z-10 w-full max-w-2xl rounded-[24px] px-8 py-10 sm:px-12 sm:py-14">
        <Link href="/" className="serif mb-8 inline-block text-[15px] font-semibold text-[var(--text)] hover:text-[var(--cyan)]">
          LandIt
        </Link>

        <h1 className="mb-2 text-3xl">Privacy Policy</h1>
        <p className="mb-8 text-[13px] text-[var(--text-faint)]">
          Last updated: 17 September 2026 · This is a draft prepared for LandIt and is not legal advice.
          Have a solicitor review it before it governs live use of the product.
        </p>

        <div className="space-y-6 text-[15px] leading-relaxed text-[var(--text-dim)]">
          <section>
            <h2 className="mb-2 text-lg text-[var(--text)]">1. Who we are</h2>
            <p>
              LandIt (&ldquo;LandIt&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;) operates a matching platform
              connecting UK B2B sales representatives (&ldquo;reps&rdquo;) with companies hiring sales talent
              (&ldquo;companies&rdquo;). This policy explains what personal data we collect, why, and what
              rights you have over it.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg text-[var(--text)]">2. What we collect</h2>
            <p>Depending on whether you sign up as a rep or a company, we collect:</p>
            <p>
              From reps: full name, email address, phone number (if provided), CV/résumé, a short
              introduction video, work history, sales track record and target sector preferences,
              on-target-earnings expectations, and any messages exchanged as part of the matching and
              interview process.
            </p>
            <p>
              From companies: contact name, work email, company name, role details, and any messages
              exchanged as part of the matching and interview process.
            </p>
            <p>
              We also automatically collect basic technical data (IP address, browser type, device
              information) through standard web server and analytics logging.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg text-[var(--text)]">3. Why we process it</h2>
            <p>
              We use your data to operate the matching service: creating your profile, generating
              matches, scheduling interviews and sending calendar invites, and allowing reps and
              companies to evaluate one another. We rely on performance of a contract (our terms of
              use) and, in limited cases, legitimate interest (such as basic security logging) as our
              legal bases for processing.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg text-[var(--text)]">4. Who we share it with</h2>
            <p>
              A rep&rsquo;s profile, video, and work history are shared with companies considering
              matching with them, and vice versa &mdash; that visibility is the core of the product. We
              also use a small number of service providers to run LandIt: a hosting provider, a database
              provider, and a transactional email provider used to send match notifications and calendar
              invites. We do not sell personal data to third parties.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg text-[var(--text)]">5. How long we keep it</h2>
            <p>
              We retain your data for as long as your account is active. If you delete your account, we
              delete your profile, matches, and meeting records. Some records may be retained briefly
              in backups before they are cycled out, and we may retain minimal records where we are
              required to by law.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg text-[var(--text)]">6. Your rights</h2>
            <p>
              If you are in the UK or EEA, you have the right to access, correct, or delete your
              personal data, to object to or restrict certain processing, and to data portability. You
              can delete your own account and data at any time from your dashboard, or contact us at{" "}
              <a href="mailto:support@trylandit.io" className="text-[var(--cyan)] hover:underline">
                support@trylandit.io
              </a>{" "}
              for anything account deletion doesn&rsquo;t cover. You also have the right to lodge a
              complaint with the UK Information Commissioner&rsquo;s Office (ICO).
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg text-[var(--text)]">7. Contact</h2>
            <p>
              Questions about this policy or your data can be sent to{" "}
              <a href="mailto:support@trylandit.io" className="text-[var(--cyan)] hover:underline">
                support@trylandit.io
              </a>
              .
            </p>
          </section>
        </div>

        <div className="mt-10 flex gap-4 text-[13px] font-medium text-[var(--text-faint)]">
          <Link href="/terms" className="hover:text-[var(--cyan)]">Terms of Use</Link>
          <Link href="/support" className="hover:text-[var(--cyan)]">Support</Link>
        </div>
      </div>
    </div>
  );
}
