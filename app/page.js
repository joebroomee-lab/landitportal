import Link from "next/link";
import SiteFooter from "@/components/SiteFooter";

export default function Home() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <div className="dot-grid" />
      <div className="fade-up relative z-10 flex max-w-lg flex-col items-center">
        <h1 className="mb-3 text-4xl">
          LandIt <em>Portal</em>
        </h1>
        <p className="mb-12 text-[15px] text-[var(--text-dim)]">
          Where UK B2B reps and companies get matched.
        </p>

        <div className="grid w-full gap-4 sm:grid-cols-2">
          <Link href="/rep/onboarding" className="select-card">
            <div className="mb-1 text-[16px] font-semibold text-[var(--text)]">
              I&rsquo;m a Rep
            </div>
            <div className="text-[13px] text-[var(--text-dim)]">
              Build your profile and get matched with companies hiring now.
            </div>
          </Link>

          <Link href="/company/onboarding" className="select-card">
            <div className="mb-1 text-[16px] font-semibold text-[var(--text)]">
              I&rsquo;m a Company
            </div>
            <div className="text-[13px] text-[var(--text-dim)]">
              Post a role and see your first curated matches.
            </div>
          </Link>
        </div>

        <div className="mt-10 flex items-center gap-4 text-[13px] font-medium text-[var(--text-dim)]">
          <span>Already have a profile?</span>
          <Link href="/rep/login" className="hover:text-[var(--cyan)]">
            Rep log in →
          </Link>
          <Link href="/company/login" className="hover:text-[var(--cyan)]">
            Company log in →
          </Link>
        </div>

        <Link
          href="/admin"
          className="mt-6 text-xs font-medium text-[var(--text-faint)] hover:text-[var(--cyan)]"
        >
          Admin →
        </Link>
      </div>

      <div className="absolute bottom-0 left-0 right-0">
        <SiteFooter />
      </div>
    </div>
  );
}
