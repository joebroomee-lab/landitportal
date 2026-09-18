import { cookies } from "next/headers";
import { eq, and, ne, isNull, gte, desc, asc, count } from "drizzle-orm";
import { db } from "@/db";
import { reps, matches, companies, meetings } from "@/db/schema";
import { REP_COOKIE } from "@/lib/session";
import { REP_DAILY_SWIPE_CAP } from "@/lib/constants";
import RepPendingScreen from "@/components/RepPendingScreen";
import RepDashboard from "@/components/RepDashboard";
import NoSession from "@/components/NoSession";

export const dynamic = "force-dynamic";

export const metadata = { title: "Your dashboard - LandIt" };

export default async function RepDashboardPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(REP_COOKIE)?.value;

  if (!token) {
    return (
      <NoSession
        heading="No rep session found"
        body="If you've already got a profile, log back in. Otherwise, start onboarding to create one."
        href="/rep/login"
        cta="Log in"
        secondaryHref="/rep/onboarding"
        secondaryCta="New here? Start onboarding →"
      />
    );
  }

  const [rep] = await db.select().from(reps).where(eq(reps.accessToken, token)).limit(1);

  if (!rep) {
    return (
      <NoSession
        heading="Your session has expired"
        body="Log back in to pick up where you left off. If you're new here, start onboarding instead."
        href="/rep/login"
        cta="Log in"
        secondaryHref="/rep/onboarding"
        secondaryCta="New here? Start onboarding →"
      />
    );
  }

  if (rep.status === "pending") {
    return (
      <RepPendingScreen
        heading="You're in. Your profile is under review."
        body="Please allow up to 12 hours for review. We'll email you (and text you, if we have your number) the moment you're approved and matched."
      />
    );
  }

  if (rep.status === "rejected") {
    return (
      <RepPendingScreen
        heading="Your application wasn't approved"
        body="Thanks for your interest in LandIt. Reach out to support if you think this was a mistake."
      />
    );
  }

  const matchRows = await db
    .select({
      match: matches,
      company: companies,
      meeting: meetings,
    })
    .from(matches)
    .innerJoin(companies, eq(matches.companyId, companies.id))
    .leftJoin(meetings, eq(meetings.matchId, matches.id))
    .where(
      and(
        eq(matches.repId, rep.id),
        ne(matches.status, "pending_review"),
        ne(matches.status, "rejected")
      )
    )
    .orderBy(desc(matches.createdAt));

  // Discover deck: pairs admin has created for this rep that they haven't
  // decided on yet, capped so only REP_DAILY_SWIPE_CAP fresh cards show per
  // day (see lib/constants.js). Oldest first, so nothing sits unseen forever
  // once the cap's been raised again tomorrow.
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const [{ decidedTodayCount }] = await db
    .select({ decidedTodayCount: count() })
    .from(matches)
    .where(and(eq(matches.repId, rep.id), gte(matches.repDecidedAt, startOfToday)));
  const remainingToday = Math.max(0, REP_DAILY_SWIPE_CAP - Number(decidedTodayCount || 0));

  const deckRows =
    remainingToday === 0
      ? []
      : await db
          .select({ match: matches, company: companies })
          .from(matches)
          .innerJoin(companies, eq(matches.companyId, companies.id))
          .where(and(eq(matches.repId, rep.id), eq(matches.status, "pending_review"), isNull(matches.repDecision)))
          .orderBy(asc(matches.createdAt))
          .limit(remainingToday);

  // Applications tab: everything the rep has actually applied to (swiped
  // interested on, video and all), regardless of what the company's decided
  // yet — this is the "did I hear back" view that the swipe-deck itself
  // can't answer once a card leaves it. Once matched it overlaps with
  // matchRows above (Feed keeps the deeper pipeline detail), so this list
  // is deliberately the wider one: any status, as long as the rep applied.
  const applicationRows = await db
    .select({ match: matches, company: companies })
    .from(matches)
    .innerJoin(companies, eq(matches.companyId, companies.id))
    .where(and(eq(matches.repId, rep.id), eq(matches.repDecision, "interested")))
    .orderBy(desc(matches.repDecidedAt));

  return (
    <RepDashboard
      rep={rep}
      matches={matchRows}
      deck={deckRows}
      deckRemainingToday={remainingToday}
      applications={applicationRows}
    />
  );
}
