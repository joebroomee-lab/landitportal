import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { matches, reps, companies } from "@/db/schema";
import { setMatchStatus } from "@/app/admin/actions";
import { approveMatch, rejectMatch } from "@/app/admin/matches/actions";
import StatusBadge from "@/components/StatusBadge";
import EmptyState from "@/components/EmptyState";

export const dynamic = "force-dynamic";

const STATUSES = ["matched", "intro_requested", "interviewing", "hired"];

export default async function AdminMatchesPage() {
  const rows = await db
    .select({
      id: matches.id,
      status: matches.status,
      roleTitle: matches.roleTitle,
      companyRoleTitle: companies.roleTitle,
      createdAt: matches.createdAt,
      repFullName: reps.fullName,
      companyName: companies.companyName,
    })
    .from(matches)
    .leftJoin(reps, eq(matches.repId, reps.id))
    .leftJoin(companies, eq(matches.companyId, companies.id))
    .orderBy(desc(matches.createdAt));

  const pendingCount = rows.filter((m) => m.status === "pending_review").length;

  return (
    <div>
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="mb-1 text-2xl font-semibold text-[var(--text)]">Matches</h1>
          <p className="text-sm text-[var(--text-dim)]">
            {rows.length} match{rows.length === 1 ? "" : "es"}
            {pendingCount > 0 && (
              <span className="text-amber-300"> · {pendingCount} still going through the swipe deck</span>
            )}
          </p>
          <p className="mt-1 text-xs text-[var(--text-faint)]">
            To create a new one, use the Match button on the main Dashboard, it generates the AI reasoning
            for you first.
          </p>
        </div>
        <Link href="/admin/matches/new" className="btn btn-primary shrink-0" style={{ padding: "10px 20px", fontSize: 14 }}>
          + Create match
        </Link>
      </div>

      {rows.length === 0 ? (
        <EmptyState label="No matches yet, create one to pair a rep with a company." />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--line)] text-xs uppercase tracking-wide text-[var(--text-faint)]">
                <th className="px-5 py-4 font-semibold">Rep</th>
                <th className="px-5 py-4 font-semibold">Company</th>
                <th className="px-5 py-4 font-semibold">Role</th>
                <th className="px-5 py-4 font-semibold">Status</th>
                <th className="px-5 py-4 font-semibold">Matched</th>
                <th className="px-5 py-4 font-semibold">{" "}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((m) => (
                <tr key={m.id} className="border-b border-[var(--line-soft)] last:border-0">
                  <td className="px-5 py-4 text-[var(--text)]">
                    <Link href={`/admin/matches/${m.id}`} className="hover:text-[var(--cyan)]">
                      {m.repFullName?.split(" ")[0] || "-"}
                    </Link>
                  </td>
                  <td className="px-5 py-4 text-[var(--text-dim)]">{m.companyName || "-"}</td>
                  <td className="px-5 py-4 text-[var(--text-dim)]">
                    {m.roleTitle || m.companyRoleTitle || "-"}
                  </td>
                  <td className="px-5 py-4">
                    <StatusBadge status={m.status} />
                  </td>
                  <td className="px-5 py-4 text-[var(--text-dim)]">
                    {new Date(m.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-5 py-4">
                    {m.status === "pending_review" ? (
                      <div className="flex flex-wrap items-center gap-1">
                        <Link
                          href={`/admin/matches/${m.id}`}
                          className="text-[11px] font-semibold text-[var(--text-faint)] hover:text-[var(--cyan)]"
                        >
                          View
                        </Link>
                        <form action={approveMatch.bind(null, m.id)}>
                          <button
                            type="submit"
                            title="Skips the rep/company swipe decks and marks it matched immediately"
                            className="rounded-full border border-[var(--cyan)]/40 px-2.5 py-1 text-[11px] font-semibold text-[var(--cyan)] transition hover:border-[var(--cyan)]"
                          >
                            Force match
                          </button>
                        </form>
                        <form action={rejectMatch.bind(null, m.id)}>
                          <button
                            type="submit"
                            className="rounded-full border border-[var(--line)] px-2.5 py-1 text-[11px] font-semibold text-[var(--text-dim)] transition hover:border-[var(--danger)] hover:text-[var(--danger)]"
                          >
                            Reject
                          </button>
                        </form>
                      </div>
                    ) : m.status === "rejected" ? (
                      <Link
                        href={`/admin/matches/${m.id}`}
                        className="text-[11px] font-semibold text-[var(--text-faint)] hover:text-[var(--cyan)]"
                      >
                        View
                      </Link>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {STATUSES.map((s) => (
                          <form key={s} action={setMatchStatus.bind(null, m.id, s)}>
                            <button
                              type="submit"
                              disabled={m.status === s}
                              className="rounded-full border border-[var(--line)] px-2.5 py-1 text-[11px] font-semibold text-[var(--text-dim)] transition hover:border-[var(--cyan)] hover:text-[var(--cyan)] disabled:opacity-30"
                            >
                              {s === "intro_requested" ? "Intro Req." : s[0].toUpperCase() + s.slice(1)}
                            </button>
                          </form>
                        ))}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
