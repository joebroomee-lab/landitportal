import Link from "next/link";
import { eq, desc, inArray } from "drizzle-orm";
import { db } from "@/db";
import { reps, companies } from "@/db/schema";
import MatchForm from "@/components/MatchForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Create match - LandIt Admin" };

export default async function NewMatchPage() {
  const [approvedReps, matchableCompanies] = await Promise.all([
    db
      .select()
      .from(reps)
      .where(eq(reps.status, "approved"))
      .orderBy(desc(reps.createdAt)),
    // Active AND still-pending companies — see the matching comment in
    // app/admin/page.js for why: admin can line up a company's match before
    // they're approved onto the platform, so it's already there the moment
    // they are.
    db
      .select()
      .from(companies)
      .where(inArray(companies.status, ["active", "pending"]))
      .orderBy(desc(companies.createdAt)),
  ]);

  return (
    <div className="max-w-2xl">
      <Link
        href="/admin/matches"
        className="mb-6 inline-block text-sm text-[var(--text-dim)] hover:text-[var(--cyan)]"
      >
        ← Back to Matches
      </Link>
      <h1 className="mb-1 text-2xl font-semibold text-[var(--text)]">Create a match</h1>
      <p className="mb-8 text-sm text-[var(--text-dim)]">
        Only approved reps are listed, but companies can be matched before they&rsquo;re approved
        too, it&rsquo;ll be waiting for them the moment they&rsquo;re accepted. Companies still
        awaiting review are marked (pending review) below.
      </p>
      <MatchForm reps={approvedReps} companies={matchableCompanies} />
    </div>
  );
}
