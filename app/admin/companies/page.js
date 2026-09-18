import Link from "next/link";
import { desc } from "drizzle-orm";
import { db } from "@/db";
import { companies } from "@/db/schema";
import { setCompanyStatus } from "@/app/admin/actions";
import StatusBadge from "@/components/StatusBadge";
import EmptyState from "@/components/EmptyState";

export const dynamic = "force-dynamic";

export default async function AdminCompaniesPage() {
  const allCompanies = await db.select().from(companies).orderBy(desc(companies.createdAt));
  const pendingCount = allCompanies.filter((c) => c.status === "pending").length;

  return (
    <div>
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="mb-1 text-2xl font-semibold text-[var(--text)]">Companies</h1>
          <p className="text-sm text-[var(--text-dim)]">
            {allCompanies.length} compan{allCompanies.length === 1 ? "y" : "ies"}
            {pendingCount > 0 && (
              <span className="text-amber-300"> · {pendingCount} awaiting your review</span>
            )}
          </p>
        </div>
        <Link href="/admin/companies/new" className="btn btn-primary shrink-0" style={{ padding: "10px 20px", fontSize: 14 }}>
          + Add company
        </Link>
      </div>

      {allCompanies.length === 0 ? (
        <EmptyState label="No companies yet, add your first one to start matching." />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--line)] text-xs uppercase tracking-wide text-[var(--text-faint)]">
                <th className="px-5 py-4 font-semibold">Company</th>
                <th className="px-5 py-4 font-semibold">Contact</th>
                <th className="px-5 py-4 font-semibold">Role</th>
                <th className="px-5 py-4 font-semibold">Status</th>
                <th className="px-5 py-4 font-semibold">Signed up</th>
                <th className="px-5 py-4 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {allCompanies.map((c) => (
                <tr key={c.id} className="border-b border-[var(--line-soft)] last:border-0">
                  <td className="px-5 py-4">
                    <Link
                      href={`/admin/companies/${c.id}`}
                      className="font-medium text-[var(--text)] hover:text-[var(--cyan)]"
                    >
                      {c.companyName}
                    </Link>
                  </td>
                  <td className="px-5 py-4 text-[var(--text-dim)]">{c.contactName}</td>
                  <td className="px-5 py-4 text-[var(--text-dim)]">{c.roleTitle || "-"}</td>
                  <td className="px-5 py-4">
                    <StatusBadge status={c.status} />
                  </td>
                  <td className="px-5 py-4 text-[var(--text-dim)]">
                    {new Date(c.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-5 py-4">
                    {c.status === "pending" ? (
                      <div className="flex gap-2">
                        <form action={setCompanyStatus.bind(null, c.id, "active")}>
                          <button
                            type="submit"
                            className="rounded-full border border-[var(--line)] px-3 py-1.5 text-xs font-semibold text-[var(--cyan)] transition hover:border-[var(--cyan)]"
                          >
                            Approve
                          </button>
                        </form>
                        <form action={setCompanyStatus.bind(null, c.id, "rejected")}>
                          <button
                            type="submit"
                            className="rounded-full border border-[var(--line)] px-3 py-1.5 text-xs font-semibold text-[var(--danger)] transition hover:border-[var(--danger)]"
                          >
                            Reject
                          </button>
                        </form>
                      </div>
                    ) : (
                      <Link
                        href={`/admin/companies/${c.id}`}
                        className="text-xs font-semibold text-[var(--text-faint)] hover:text-[var(--cyan)]"
                      >
                        View
                      </Link>
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
