import Link from "next/link";

export default function NoSession({ heading, body, href, cta, secondaryHref, secondaryCta }) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center px-6">
      <div className="dot-grid" />
      <div className="card fade-up relative z-10 flex max-w-md flex-col items-center rounded-[24px] px-10 py-14 text-center">
        <h1 className="mb-4 text-[22px] font-semibold text-[var(--text)]">{heading}</h1>
        <p className="mb-8 text-[15px] leading-relaxed text-[var(--text-dim)]">{body}</p>
        <Link href={href} className="btn btn-primary">
          {cta}
        </Link>
        {secondaryHref && (
          <Link
            href={secondaryHref}
            className="mt-4 text-xs font-medium text-[var(--text-faint)] hover:text-[var(--cyan)]"
          >
            {secondaryCta}
          </Link>
        )}
      </div>
    </div>
  );
}
