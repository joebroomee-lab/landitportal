import { desc, eq, ne, and, inArray } from "drizzle-orm";
import { db } from "@/db";
import { reps, companies, matches, meetings } from "@/db/schema";
import AdminDashboard from "@/components/AdminDashboard";

export const dynamic = "force-dynamic";
export const metadata = { title: "Dashboard - LandIt Admin" };

export default async function AdminHomePage() {
  const [approvedReps, matchableCompanies, matchRows, pendingRows] = await Promise.all([
    db.select().from(reps).where(eq(reps.status, "approved")).orderBy(desc(reps.createdAt)),
    // Active AND still-pending companies — admin can line up a company's
    // first match(es) before approving them, so the moment they're accepted
    // onto the platform they land straight in their dashboard with reps
    // already waiting, rather than approve-then-wait-to-be-matched. See
    // CompanyCard's pending badge for how this is flagged in the picker.
    db
      .select()
      .from(companies)
      .where(inArray(companies.status, ["active", "pending"]))
      .orderBy(desc(companies.createdAt)),
    db
      .select({ match: matches, rep: reps, company: companies, meeting: meetings })
      .from(matches)
      .innerJoin(reps, eq(matches.repId, reps.id))
      .innerJoin(companies, eq(matches.companyId, companies.id))
      .leftJoin(meetings, eq(meetings.matchId, matches.id))
      .where(and(ne(matches.status, "pending_review"), ne(matches.status, "rejected")))
      .orderBy(desc(matches.createdAt)),
    // Pairs created but not yet through both swipe decisions — see
    // db/schema.js's comment on repDecision/companyDecision. Shown as a
    // separate "Awaiting decision" list so it's obvious these aren't real
    // pipeline matches yet.
    db
      .select({ match: matches, rep: reps, company: companies })
      .from(matches)
      .innerJoin(reps, eq(matches.repId, reps.id))
      .innerJoin(companies, eq(matches.companyId, companies.id))
      .where(eq(matches.status, "pending_review"))
      .orderBy(desc(matches.createdAt)),
  ]);

  return (
    <AdminDashboard reps={approvedReps} companies={matchableCompanies} matches={matchRows} pendingMatches={pendingRows} />
  );
}
