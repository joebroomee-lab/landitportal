import { db } from "@/db";
import { reps, companies, matches } from "@/db/schema";

export const dynamic = "force-dynamic";

export default async function AdminStatsPage() {
  const [allReps, allCompanies, allMatches] = await Promise.all([
    db.select().from(reps),
    db.select().from(companies),
    db.select().from(matches),
  ]);

  const confirmedPlacements = allMatches.filter((m) => m.status === "hired").length;
  const pendingReview =
    allReps.filter((r) => r.status === "pending").length +
    allCompanies.filter((c) => c.status === "pending").length +
    allMatches.filter((m) => m.status === "pending_review").length;
  const activeMatches = allMatches.filter(
    (m) => m.status !== "hired" && m.status !== "rejected" && m.status !== "pending_review"
  ).length;

  const recent = [
    ...allReps.map((r) => ({
      name: r.fullName,
      type: "Rep",
      createdAt: r.createdAt,
    })),
    ...allCompanies.map((c) => ({
      name: c.companyName,
      type: "Company",
      createdAt: c.createdAt,
    })),
  ]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 5);

  const stats = [
    { label: "Total Reps", value: allReps.length },
    { label: "Total Companies", value: allCompanies.length },
    { label: "Pending Approval", value: pendingReview },
    { label: "Active Matches", value: activeMatches },
    { label: "Confirmed Placements", value: confirmedPlacements },
  ];

  return (
    <div>
      <h1 className="mb-8 text-2xl font-semibold text-[var(--text)]">Stats</h1>

      <div className="mb-10 grid grid-cols-2 gap-4 lg:grid-cols-5">
        {stats.map((s) => (
          <div key={s.label} className="card p-6">
            <div className="mb-1 text-3xl font-bold text-[var(--cyan)]">
              {s.value}
            </div>
            <div className="text-xs font-semibold uppercase tracking-wide text-[var(--text-faint)]">
              {s.label}
            </div>
          </div>
        ))}
      </div>

      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-[var(--text-faint)]">
        Most recent signups
      </h2>
      {recent.length === 0 ? (
        <div className="card px-6 py-12 text-center text-sm text-[var(--text-dim)]">
          No signups yet.
        </div>
      ) : (
        <div className="card divide-y divide-[var(--line-soft)]">
          {recent.map((r, i) => (
            <div key={i} className="flex items-center justify-between px-5 py-4">
              <div>
                <div className="text-sm font-medium text-[var(--text)]">{r.name}</div>
                <div className="text-xs text-[var(--text-faint)]">{r.type}</div>
              </div>
              <div className="text-xs text-[var(--text-dim)]">
                {new Date(r.createdAt).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
