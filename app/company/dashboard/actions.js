"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { companies, matches, meetings, reps, reports, blockedPairs } from "@/db/schema";
import { COMPANY_COOKIE } from "@/lib/session";
import { zonedTimeToUtc } from "@/lib/timezones";
import { sendEmail, interviewProposedEmailForRep } from "@/lib/email";
import { sendInterviewConfirmedInvites } from "@/lib/meetings";

export async function logoutCompany() {
  const cookieStore = await cookies();
  cookieStore.delete(COMPANY_COOKIE);
  redirect("/company/onboarding");
}

// Self-serve account deletion (App Store guideline 5.1.1(v)) — mirrors
// deleteRepAccount in app/rep/dashboard/actions.js. companies.id cascades
// to matches.companyId and, through that, to meetings.matchId (see
// db/schema.js), so nothing else needs manual cleanup.
export async function deleteCompanyAccount() {
  const company = await getSessionCompany();
  if (!company) return { success: false, message: "You're not logged in." };

  await db.delete(companies).where(eq(companies.id, company.id));

  const cookieStore = await cookies();
  cookieStore.delete(COMPANY_COOKIE);
  redirect("/company/onboarding");
}

async function getSessionCompany() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COMPANY_COOKIE)?.value;
  if (!token) return null;
  const [company] = await db.select().from(companies).where(eq(companies.accessToken, token)).limit(1);
  return company || null;
}

// Ownership check shared by every action below: the match must actually
// belong to the calling company, otherwise anyone with a match id could act
// on someone else's candidate.
async function getOwnedMatch(matchId, companyId) {
  const [match] = await db
    .select()
    .from(matches)
    .where(and(eq(matches.id, matchId), eq(matches.companyId, companyId)))
    .limit(1);
  return match || null;
}

// The company's half of the pre-video swipe deck — a rep who has already
// swiped interested shows up here as a photo+profile card with their pitch
// video already attached. Passing here is a final decision, rejecting the
// match outright. Swiping interested is handled separately, by
// companyMatchAndProposeInterview below, since saying yes always comes
// bundled with proposing a first interview time — see db/schema.js's comment
// on repDecision/companyDecision.
export async function companySwipeStageA(matchId, decision) {
  if (decision !== "passed") {
    return { success: false, message: "Unknown decision." };
  }

  const company = await getSessionCompany();
  if (!company) return { success: false, message: "Your session has expired, please refresh." };

  const [match] = await db
    .select()
    .from(matches)
    .where(
      and(
        eq(matches.id, matchId),
        eq(matches.companyId, company.id),
        eq(matches.repDecision, "interested"),
      )
    )
    .limit(1);
  if (!match || match.companyDecision) {
    return { success: false, message: "That one's already been decided." };
  }

  await db
    .update(matches)
    .set({ companyDecision: "passed", companyDecidedAt: new Date(), status: "rejected", updatedAt: new Date() })
    .where(eq(matches.id, matchId));

  revalidatePath("/company/dashboard");
  revalidatePath("/rep/dashboard");
  return { success: true };
}

async function upsertProposedMeeting(matchId, { date, time, timeZone, notes }, proposedBy) {
  const scheduledAt = zonedTimeToUtc(date, time, timeZone);
  if (!scheduledAt || Number.isNaN(scheduledAt.getTime())) {
    return { success: false, message: "That date/time didn't parse, try again." };
  }

  const [existing] = await db.select().from(meetings).where(eq(meetings.matchId, matchId)).limit(1);
  if (existing) {
    await db
      .update(meetings)
      .set({ scheduledAt, status: "proposed", proposedBy, notes: notes || null, updatedAt: new Date() })
      .where(eq(meetings.matchId, matchId));
  } else {
    await db.insert(meetings).values({
      matchId,
      scheduledAt,
      status: "proposed",
      proposedBy,
      notes: notes || null,
    });
  }

  await db
    .update(matches)
    .set({ status: "interview_proposed", updatedAt: new Date() })
    .where(eq(matches.id, matchId));

  return { success: true, scheduledAt };
}

// The real "it's a match" moment: the company swipes interested on a Stage A
// candidate AND proposes a first interview time in one step (there's no
// separate "matched, waiting to hear back" state to sit in — the rep already
// has a pitch video attached, so saying yes and proposing a time is one
// motion). Jumps the match straight to "interview_proposed", skipping the old
// "matched"/"intro_requested" states, and reuses the same meetings row /
// propose-confirm mechanism the rep uses to accept or counter-propose.
export async function companyMatchAndProposeInterview(matchId, payload) {
  const company = await getSessionCompany();
  if (!company) return { success: false, message: "Your session has expired, please refresh." };

  const [match] = await db
    .select()
    .from(matches)
    .where(
      and(
        eq(matches.id, matchId),
        eq(matches.companyId, company.id),
        eq(matches.repDecision, "interested"),
      )
    )
    .limit(1);
  if (!match || match.companyDecision) {
    return { success: false, message: "That one's already been decided." };
  }

  const meetingResult = await upsertProposedMeeting(matchId, payload, "company");
  if (!meetingResult.success) return meetingResult;

  await db
    .update(matches)
    .set({ companyDecision: "interested", companyDecidedAt: new Date(), updatedAt: new Date() })
    .where(eq(matches.id, matchId));

  const [rep] = await db.select().from(reps).where(eq(reps.id, match.repId)).limit(1);
  if (rep) {
    const email = interviewProposedEmailForRep({
      fullName: rep.fullName,
      companyName: company.companyName,
      scheduledAt: meetingResult.scheduledAt,
    });
    await sendEmail({ to: rep.email, ...email }).catch(() => {});
  }

  revalidatePath("/company/dashboard");
  revalidatePath("/rep/dashboard");
  return { success: true };
}

// --- Trust & safety (App Store guideline 1.2) -----------------------------
// Filing a report doesn't change the match itself — it's a paper trail for
// LandIt to review (see db/schema.js's comment on the reports table). A
// company that actually wants the rep gone from their deck should block,
// not just report.
export async function reportRep(matchId, reason) {
  const company = await getSessionCompany();
  if (!company) return { success: false, message: "Your session has expired, please refresh." };

  const match = await getOwnedMatch(matchId, company.id);
  if (!match) return { success: false, message: "We couldn't find that match." };

  await db.insert(reports).values({
    matchId,
    reportedBy: "company",
    reason: (reason || "").trim() || "No reason given.",
  });

  return { success: true };
}

// Blocking ends this match immediately (mirrors a "passed" decision) and
// records the rep/company pair so createMatch (app/admin/matches/actions.js)
// refuses to ever match them again. onConflictDoNothing covers a company
// blocking the same rep twice (the unique constraint on repId+companyId
// would otherwise throw).
export async function blockRep(matchId, reason) {
  const company = await getSessionCompany();
  if (!company) return { success: false, message: "Your session has expired, please refresh." };

  const match = await getOwnedMatch(matchId, company.id);
  if (!match) return { success: false, message: "We couldn't find that match." };

  await db
    .update(matches)
    .set({ companyDecision: "passed", companyDecidedAt: new Date(), status: "rejected", updatedAt: new Date() })
    .where(eq(matches.id, matchId));

  await db
    .insert(blockedPairs)
    .values({ repId: match.repId, companyId: company.id, blockedBy: "company", reason: (reason || "").trim() || null })
    .onConflictDoNothing();

  revalidatePath("/company/dashboard");
  revalidatePath("/rep/dashboard");
  return { success: true };
}

export async function proposeInterview(matchId, payload) {
  const company = await getSessionCompany();
  if (!company) return { success: false, message: "Your session has expired, please refresh." };

  const match = await getOwnedMatch(matchId, company.id);
  if (!match) return { success: false, message: "We couldn't find that match." };

  const result = await upsertProposedMeeting(matchId, payload, "company");
  if (result.success) {
    revalidatePath("/company/dashboard");
    revalidatePath("/rep/dashboard");
  }
  return result;
}

export async function confirmInterview(matchId) {
  const company = await getSessionCompany();
  if (!company) return { success: false, message: "Your session has expired, please refresh." };

  const match = await getOwnedMatch(matchId, company.id);
  if (!match) return { success: false, message: "We couldn't find that match." };

  const [meeting] = await db.select().from(meetings).where(eq(meetings.matchId, matchId)).limit(1);
  if (!meeting || meeting.proposedBy !== "rep") {
    return { success: false, message: "There's no proposed time from the rep to confirm yet." };
  }

  await db
    .update(meetings)
    .set({ status: "confirmed", updatedAt: new Date() })
    .where(eq(meetings.matchId, matchId));
  await db.update(matches).set({ status: "interviewing", updatedAt: new Date() }).where(eq(matches.id, matchId));

  const [rep] = await db.select().from(reps).where(eq(reps.id, match.repId)).limit(1);
  if (rep) {
    await sendInterviewConfirmedInvites({ match, rep, company, meeting: { ...meeting, status: "confirmed" } });
  }

  revalidatePath("/company/dashboard");
  revalidatePath("/rep/dashboard");
  return { success: true };
}
