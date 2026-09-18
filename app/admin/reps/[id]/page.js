import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { reps } from "@/db/schema";
import { setRepStatus, updateRepTags } from "@/app/admin/actions";
import StatusBadge from "@/components/StatusBadge";
import TagEditor from "@/components/TagEditor";

export const dynamic = "force-dynamic";

export default async function AdminRepDetailPage({ params }) {
  const { id } = await params;
  const [rep] = await db.select().from(reps).where(eq(reps.id, id)).limit(1);
  if (!rep) notFound();

  return (
    <div className="max-w-2xl">
      <Link href="/admin/reps" className="mb-6 inline-block text-sm text-[var(--text-dim)] hover:text-[var(--cyan)]">
        ← Back to Reps
      </Link>

      <div className="card p-8">
        <div className="mb-6 flex items-start gap-5">
          <div className="h-20 w-20 shrink-0 overflow-hidden rounded-full border border-[var(--line)] bg-[var(--bg-raised)]">
            {rep.photoUrl ? (
              <img src={rep.photoUrl} alt={rep.fullName} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-xl font-semibold text-[var(--cyan)]">
                {rep.fullName[0]}
              </div>
            )}
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-semibold text-[var(--text)]">{rep.fullName}</h1>
            <p className="text-sm text-[var(--text-dim)]">{rep.email}</p>
            <div className="mt-2">
              <StatusBadge status={rep.status} />
            </div>
          </div>
        </div>

        <div className="mb-6 flex gap-2">
          <form action={setRepStatus.bind(null, rep.id, "approved")}>
            <button
              type="submit"
              disabled={rep.status === "approved"}
              className="btn btn-primary"
              style={{ padding: "10px 20px", fontSize: 14 }}
            >
              Approve
            </button>
          </form>
          <form action={setRepStatus.bind(null, rep.id, "rejected")}>
            <button
              type="submit"
              disabled={rep.status === "rejected"}
              className="btn btn-ghost"
              style={{ padding: "10px 20px", fontSize: 14 }}
            >
              Reject
            </button>
          </form>
        </div>

        <dl className="grid grid-cols-2 gap-x-6 gap-y-5">
          <Field label="LinkedIn" value={rep.linkedinUrl} />
          <Field label="Location" value={rep.location} />
          <Field
            label="Currently in sales"
            value={rep.inSales === true ? "Yes" : rep.inSales === false ? "No" : "-"}
          />
          <Field label="Job title" value={rep.jobTitle} />
          <Field label="Background" value={rep.notInSalesCategory} />
          <Field label="Deal size" value={rep.dealSize} />
          <Field label="OTE" value={rep.ote} />
          <Field label="Availability" value={rep.availability} />
          <Field label="Signed up" value={new Date(rep.createdAt).toLocaleString()} />
          <Field label="Industries" value={(rep.industries || []).join(", ")} span />
          <Field label="Tools" value={(rep.tools || []).join(", ")} span />
          <Field label="Bio" value={rep.bio} span />
        </dl>

        {rep.cvFileKey && (
          <div className="mt-6">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-faint)]">
              CV
            </div>
            <a
              href={`/api/files/${rep.cvFileKey}`}
              target="_blank"
              rel="noreferrer"
              className="text-sm font-semibold text-[var(--cyan)] hover:underline"
            >
              Open uploaded CV ↗
            </a>
          </div>
        )}

        <div className="mt-6">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-faint)]">
            Pitch video
          </div>
          <div className="card px-4 py-6 text-center text-sm text-[var(--text-dim)]">
            {rep.pitchVideoChoice === "record"
              ? "Recorded during onboarding (placeholder, MVP)"
              : rep.pitchVideoUrl
                ? "Video on file"
                : "Not uploaded yet"}
          </div>
        </div>

        <div className="mt-6">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-faint)]">
            Matching tags
          </div>
          <TagEditor action={updateRepTags} id={rep.id} selected={rep.tags || []} />
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, span }) {
  return (
    <div className={span ? "col-span-2" : ""}>
      <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-[var(--text-faint)]">
        {label}
      </div>
      <div className="text-sm text-[var(--text)]">{value || "-"}</div>
    </div>
  );
}
