import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { companies } from "@/db/schema";
import { setCompanyStatus, updateCompanyTags } from "@/app/admin/actions";
import StatusBadge from "@/components/StatusBadge";
import TagEditor from "@/components/TagEditor";

export const dynamic = "force-dynamic";

export default async function AdminCompanyDetailPage({ params }) {
  const { id } = await params;
  const [company] = await db.select().from(companies).where(eq(companies.id, id)).limit(1);
  if (!company) notFound();

  const isPending = company.status === "pending";

  return (
    <div className="max-w-2xl">
      <Link
        href="/admin/companies"
        className="mb-6 inline-block text-sm text-[var(--text-dim)] hover:text-[var(--cyan)]"
      >
        ← Back to Companies
      </Link>

      <div className="card p-8">
        <div className="mb-6 flex items-start gap-5">
          <div className="h-20 w-20 shrink-0 overflow-hidden rounded-[var(--radius-sm)] border border-[var(--line)] bg-[var(--bg-raised)]">
            {company.logoUrl ? (
              <img src={company.logoUrl} alt={company.companyName} className="h-full w-full object-contain p-1.5" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-xl font-semibold text-[var(--cyan)]">
                {company.companyName[0]}
              </div>
            )}
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-semibold text-[var(--text)]">{company.companyName}</h1>
            <p className="text-sm text-[var(--text-dim)]">
              {company.contactName} - {company.workEmail}
            </p>
            <div className="mt-2">
              <StatusBadge status={company.status} />
            </div>
          </div>
        </div>

        {isPending && (
          <div className="mb-6 flex gap-2">
            <form action={setCompanyStatus.bind(null, company.id, "active")}>
              <button type="submit" className="btn btn-primary" style={{ padding: "10px 20px", fontSize: 14 }}>
                Approve
              </button>
            </form>
            <form action={setCompanyStatus.bind(null, company.id, "rejected")}>
              <button type="submit" className="btn btn-ghost" style={{ padding: "10px 20px", fontSize: 14 }}>
                Reject
              </button>
            </form>
          </div>
        )}
        {!isPending && company.status !== "rejected" && (
          <div className="mb-6">
            <form action={setCompanyStatus.bind(null, company.id, "rejected")}>
              <button type="submit" className="btn btn-ghost" style={{ padding: "10px 20px", fontSize: 14 }}>
                Reject
              </button>
            </form>
          </div>
        )}
        {company.status === "rejected" && (
          <div className="mb-6">
            <form action={setCompanyStatus.bind(null, company.id, "active")}>
              <button type="submit" className="btn btn-primary" style={{ padding: "10px 20px", fontSize: 14 }}>
                Reinstate
              </button>
            </form>
          </div>
        )}

        <dl className="grid grid-cols-2 gap-x-6 gap-y-5">
          <Field label="Company size" value={company.companySize} />
          <Field label="Industry" value={company.industry} />
          <Field label="Role hiring for" value={company.roleTitle} />
          <Field label="Seniority" value={company.seniority} />
          <Field label="Deal size" value={company.dealSize} />
          <Field label="OTE" value={company.ote} />
          <Field label="Hiring timeline" value={company.timeline} />
          <Field label="Signed up" value={new Date(company.createdAt).toLocaleString()} />
          <Field label="Tools" value={(company.tools || []).join(", ")} span />
          <Field label="Ideal customer profile (ICP)" value={company.icp} span />
          <Field label="Notes" value={company.notes} span />
        </dl>

        {(company.sourceFileKeys || []).length > 0 && (
          <div className="mt-6">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-faint)]">
              Uploaded at onboarding
            </div>
            <div className="flex flex-wrap gap-2">
              {company.sourceFileKeys.map((key) => (
                <a
                  key={key}
                  href={`/api/files/${key}`}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full border border-[var(--line)] px-3 py-1.5 text-xs font-semibold text-[var(--cyan)] hover:border-[var(--cyan)]"
                >
                  Open file ↗
                </a>
              ))}
            </div>
          </div>
        )}

        <div className="mt-6">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-faint)]">
            Matching tags
          </div>
          <TagEditor action={updateCompanyTags} id={company.id} selected={company.tags || []} />
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, span }) {
  return (
    <div className={span ? "col-span-2" : ""}>
      <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-[var(--text-faint)]">{label}</div>
      <div className="text-sm text-[var(--text)]">{value || "-"}</div>
    </div>
  );
}
