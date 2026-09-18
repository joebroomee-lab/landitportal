export default function RepPendingScreen({ heading, body }) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center px-6">
      <div className="dot-grid" />
      <div className="pulse-glow glow-border fade-up relative z-10 flex max-w-lg flex-col items-center rounded-[24px] bg-[var(--bg-card)] px-10 py-14 text-center">
        <div className="glow-ring mb-8 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--cyan-soft)]">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
            <path
              d="M5 12.5l4.5 4.5L19 7"
              stroke="var(--cyan)"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <h1 className="glow-text mb-4 text-[26px] font-semibold text-[var(--text)] sm:text-[30px]">
          {heading}
        </h1>
        <p className="text-[15px] leading-relaxed text-[var(--text-dim)]">{body}</p>
      </div>
    </div>
  );
}
