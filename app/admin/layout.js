import Link from "next/link";

const NAV = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/reps", label: "Reps" },
  { href: "/admin/companies", label: "Companies" },
  { href: "/admin/matches", label: "Matches" },
  { href: "/admin/stats", label: "Stats" },
];

export const metadata = { title: "Admin - LandIt" };

export default function AdminLayout({ children }) {
  return (
    <div className="relative flex min-h-screen">
      <div className="dot-grid" />
      <aside className="relative z-10 hidden w-56 shrink-0 border-r border-[var(--line)] bg-[var(--bg-raised)] px-5 py-8 sm:block">
        <div className="mb-10 px-2">
          <div className="logo">
            <span className="logo-dot"></span>LandIt
            <span className="ml-1 font-normal text-[var(--text-faint)]">Admin</span>
          </div>
        </div>
        <nav className="flex flex-col gap-1">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-lg px-3 py-2.5 text-sm font-medium text-[var(--text-dim)] transition hover:bg-[var(--cyan-soft)] hover:text-[var(--cyan)]"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="relative z-10 flex-1 px-6 py-8 sm:px-10">{children}</main>
    </div>
  );
}
