import { cookies } from "next/headers";
import { eq, and, ne, isNull, gte, desc, asc, count } from "drizzle-orm";
import { db } from "@/db";
import { companies, matches, reps, meetings } from "@/db/schema";
import { COMPANY_COOKIE } from "@/lib/session";
import { COMPANY_DAILY_SWIPE_CAP } from "@/lib/constants";
import RepPendingScreen from "@/components/RepPendingScreen";
import CompanyDashboard from "@/components/CompanyDashboard";
import NoSession from "@/components/NoSession";

export const dynamic = "force-dynamic";
export const metadata = { title: "Your dashboard - LandIt" };

export default async function CompanyDashboardPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COMPANY_COOKIE)?.value;

  if (!token) {
    return (
      <NoSession
        heading="No company session found"
        body="If you've already got a profile, log back in. Otherwise, start onboarding to create one."
        href="/company/login"
        cta="Log in"
        secondaryHref="/company/onboarding"
        secondaryCta="New here? Start onboarding →"
      />
    );
  }

  const [company] = await db.select().from(companies).where(eq(companies.accessToken, token)).limit(1);

  if (!company) {
    return (
      <NoSession
        heading="Your session has expired"
        body="Log back in to pick up where you left off. If you're new here, start onboarding instead."
        href="/company/login"
        cta="Log in"
        secondaryHref="/company/onboarding"
        secondaryCta="New here? Start onboarding →"
      />
    );
  }

  if (company.status === "pending") {
    return (
      <RepPendingScreen
        heading="You're in. We're reviewing your profile."
        body="Please allow up to 12 hours for review. We'll email you as soon as we have your first match."
      />
    );
  }

  if (company.status === "rejected") {
    return (
      <RepPendingScreen
        heading="We're not able to move forward right now"
        body="Thanks for your interest in LandIt. Reach out to support if you think this was a mistake."
      />
    );
  }

  const matchRows = await db
    .select({ match: matches, rep: reps, meeting: meetings })
    .from(matches)
    .innerJoin(reps, eq(matches.repId, reps.id))
    .leftJoin(meetings, eq(meetings.matchId, matches.id))
    .where(
      and(
        eq(matches.companyId, company.id),
        ne(matches.status, "pending_review"),
        ne(matches.status, "rejected")
      )
    )
    .orderBy(desc(matches.createdAt));

  // Stage-A deck: reps who've already swiped interested on this company and
  // are waiting on a decision back, shown as photo+profile cards, no video
  // yet. Capped daily so it stays feeling curated rather than like a list —
  // see lib/constants.js.
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const [{ decidedTodayCount }] = await db
    .select({ decidedTodayCount: count() })
    .from(matches)
    .where(and(eq(matches.companyId, company.id), gte(matches.companyDecidedAt, startOfToday)));
  const remainingToday = Math.max(0, COMPANY_DAILY_SWIPE_CAP - Number(decidedTodayCount || 0));

  const stageADeck =
    remainingToday === 0
      ? []
      : await db
          .select({ match: matches, rep: reps })
          .from(matches)
          .innerJoin(reps, eq(matches.repId, reps.id))
          .where(
            and(
              eq(matches.companyId, company.id),
              eq(matches.repDecision, "interested"),
              isNull(matches.companyDecision)
            )
          )
          .orderBy(asc(matches.createdAt))
          .limit(remainingToday);

  return (
    <CompanyDashboard
      company={company}
      matches={matchRows}
      stageADeck={stageADeck}
      stageARemainingToday={remainingToday}
    />
  );
}
