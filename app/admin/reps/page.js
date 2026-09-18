import Link from "next/link";
import { desc } from "drizzle-orm";
import { db } from "@/db";
import { reps } from "@/db/schema";
import { setRepStatus } from "@/app/admin/actions";
import StatusBadge from "@/components/StatusBadge";
import EmptyState from "@/components/EmptyState";

export const dynamic = "force-dynamic";

export default async function AdminRepsPage() {
  const allReps = await db.select().from(reps).orderBy(desc(reps.createdAt));

  return (
    <div>
      <h1 className="mb-1 text-2xl font-semibold text-[var(--text)]">Reps</h1>
      <p className="mb-8 text-sm text-[var(--text-dim)]">
        {allReps.length} signup{allReps.length === 1 ? "" : "s"}
      </p>

      {allReps.length === 0 ? (
        <EmptyState label="No rep signups yet." />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--line)] text-xs uppercase tracking-wide text-[var(--text-faint)]">
                <th className="px-5 py-4 font-semibold">Name</th>
                <th className="px-5 py-4 font-semibold">Email</th>
                <th className="px-5 py-4 font-semibold">Title</th>
                <th className="px-5 py-4 font-semibold">Location</th>
                <th className="px-5 py-4 font-semibold">Availability</th>
                <th className="px-5 py-4 font-semibold">Status</th>
                <th className="px-5 py-4 font-semibold">Signed up</th>
                <th className="px-5 py-4 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {allReps.map((rep) => (
                <tr key={rep.id} className="border-b border-[var(--line-soft)] last:border-0">
                  <td className="px-5 py-4">
                    <Link
                      href={`/admin/reps/${rep.id}`}
                      className="font-medium text-[var(--text)] hover:text-[var(--cyan)]"
                    >
                      {rep.fullName}
                    </Link>
                  </td>
                  <td className="px-5 py-4 text-[var(--text-dim)]">{rep.email}</td>
                  <td className="px-5 py-4 text-[var(--text-dim)]">
                    {rep.jobTitle || rep.notInSalesCategory || "-"}
                  </td>
                  <td className="px-5 py-4 text-[var(--text-dim)]">{rep.location || "-"}</td>
                  <td className="px-5 py-4 text-[var(--text-dim)]">{rep.availability || "-"}</td>
                  <td className="px-5 py-4">
                    <StatusBadge status={rep.status} />
                  </td>
                  <td className="px-5 py-4 text-[var(--text-dim)]">
                    {new Date(rep.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex gap-2">
                      <form action={setRepStatus.bind(null, rep.id, "approved")}>
                        <button
                          type="submit"
                          disabled={rep.status === "approved"}
                          className="rounded-full border border-[var(--line)] px-3 py-1.5 text-xs font-semibold text-[var(--cyan)] transition hover:border-[var(--cyan)] disabled:opacity-30"
                        >
                          Approve
                        </button>
                      </form>
                      <form action={setRepStatus.bind(null, rep.id, "rejected")}>
                        <button
                          type="submit"
                          disabled={rep.status === "rejected"}
                          className="rounded-full border border-[var(--line)] px-3 py-1.5 text-xs font-semibold text-[var(--danger)] transition hover:border-[var(--danger)] disabled:opacity-30"
                        >
                          Reject
                        </button>
                      </form>
                    </div>
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
