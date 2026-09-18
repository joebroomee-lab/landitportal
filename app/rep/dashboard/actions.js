"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { reps, matches, meetings, companies, reports, blockedPairs } from "@/db/schema";
import { REP_COOKIE } from "@/lib/session";
import { zonedTimeToUtc } from "@/lib/timezones";
import { sendEmail, pitchReadyEmailForCompany } from "@/lib/email";
import { sendInterviewConfirmedInvites } from "@/lib/meetings";

const URL_RE = /^https?:\/\/.+/i;

async function getSessionRep() {
  const cookieStore = await cookies();
  const token = cookieStore.get(REP_COOKIE)?.value;
  if (!token) return null;
  const [rep] = await db.select().from(reps).where(eq(reps.accessToken, token)).limit(1);
  return rep || null;
}

async function getOwnedMatch(matchId, repId) {
  const [match] = await db
    .select()
    .from(matches)
    .where(and(eq(matches.id, matchId), eq(matches.repId, repId)))
    .limit(1);
  return match || null;
}

export async function logoutRep() {
  const cookieStore = await cookies();
  cookieStore.delete(REP_COOKIE);
  redirect("/rep/login");
}

// Self-serve account deletion (App Store guideline 5.1.1(v): apps that
// support account creation must also let users initiate deletion from
// within the app, not just point at a web form or support email). Deleting
// the rep row cascades at the DB level to matches.repId (onDelete:
// "cascade") and, through that, to meetings.matchId (also cascade) — see
// db/schema.js — so this one delete is genuinely everything, no manual
// cleanup queries needed. Called directly from a client event handler
// (not a <form action>), so it returns a result object instead of
// redirecting itself; the caller clears the session cookie via logout
// semantics by hitting /rep/login after the redirect below runs.
export async function deleteRepAccount() {
  const rep = await getSessionRep();
  if (!rep) return { success: false, message: "You're not logged in." };

  await db.delete(reps).where(eq(reps.id, rep.id));

  const cookieStore = await cookies();
  cookieStore.delete(REP_COOKIE);
  redirect("/rep/login");
}

// The rep's half of the swipe deck — see db/schema.js's comment on
// repDecision/companyDecision. Swiping interested doesn't create a real
// match yet, it just releases this card (now with the rep's video already
// attached, see videoUrl below) into the company's own deck; only once the
// company also swipes interested does it become a real pipeline match (see
// companySwipeStageA in app/company/dashboard/actions.js).
//
// videoUrl is REQUIRED when decision is "interested" — the swipe deck
// records a mandatory ~60s application video at the moment of applying (no
// skipping), so the company's Stage A deck always has a video to watch
// alongside the profile, rather than a separate step after they've also
// said yes. Passing is exempt, obviously no video needed to decline.
export async function repSwipe(matchId, decision, videoUrl) {
  if (decision !== "interested" && decision !== "passed") {
    return { success: false, message: "Unknown decision." };
  }

  const trimmedVideo = (videoUrl || "").trim();
  if (decision === "interested" && !URL_RE.test(trimmedVideo)) {
    return { success: false, message: "A video is required to apply, record or upload one first." };
  }

  const rep = await getSessionRep();
  if (!rep) return { success: false, message: "Your session has expired, please log in again." };

  // Only a card still awaiting the rep's own decision can be swiped — guards
  // against a double-tap re-deciding something, or a stale deck card whose
  // match id no longer belongs in this rep's queue.
  const [match] = await db
    .select()
    .from(matches)
    .where(and(eq(matches.id, matchId), eq(matches.repId, rep.id), eq(matches.status, "pending_review")))
    .limit(1);
  if (!match || match.repDecision) {
    return { success: false, message: "That one's already been decided." };
  }

  const patch = { repDecision: decision, repDecidedAt: new Date(), updatedAt: new Date() };
  if (decision === "passed") {
    patch.status = "rejected";
  } else {
    patch.repVideoUrl = trimmedVideo;
    patch.repVideoUpdatedAt = new Date();
  }

  await db.update(matches).set(patch).where(eq(matches.id, matchId));
  revalidatePath("/rep/dashboard");
  return { success: true };
}

export async function submitMatchVideo(matchId, videoUrl) {
  const cookieStore = await cookies();
  const token = cookieStore.get(REP_COOKIE)?.value;
  if (!token) {
    return { success: false, message: "Your session has expired, please log in again." };
  }

  const trimmed = (videoUrl || "").trim();
  if (!URL_RE.test(trimmed)) {
    return { success: false, message: "That doesn't look like a valid link, paste a full URL." };
  }

  const [rep] = await db.select().from(reps).where(eq(reps.accessToken, token)).limit(1);
  if (!rep) {
    return { success: false, message: "Your session has expired, please log in again." };
  }

  // Ownership check: this match must actually belong to the calling rep,
  // otherwise anyone with a match id could overwrite someone else's video.
  const [match] = await db
    .select()
    .from(matches)
    .where(and(eq(matches.id, matchId), eq(matches.repId, rep.id)))
    .limit(1);
  if (!match) {
    return { success: false, message: "We couldn't find that match." };
  }

  await db
    .update(matches)
    .set({ repVideoUrl: trimmed, repVideoUpdatedAt: new Date(), updatedAt: new Date() })
    .where(eq(matches.id, matchId));

  const [company] = await db.select().from(companies).where(eq(companies.id, match.companyId)).limit(1);
  if (company) {
    const { subject, html, text } = pitchReadyEmailForCompany({
      contactName: company.contactName,
      companyName: company.companyName,
    });
    await sendEmail({ to: company.workEmail, subject, html, text }).catch(() => {});
  }

  revalidatePath("/rep/dashboard");
  return { success: true };
}

// --- Trust & safety (App Store guideline 1.2) -----------------------------
// Mirrors reportRep/blockRep in app/company/dashboard/actions.js — see the
// comments there for why reporting and blocking are separate actions, and
// db/schema.js for the reports/blockedPairs tables.
export async function reportCompany(matchId, reason) {
  const rep = await getSessionRep();
  if (!rep) return { success: false, message: "Your session has expired, please log in again." };

  const match = await getOwnedMatch(matchId, rep.id);
  if (!match) return { success: false, message: "We couldn't find that match." };

  await db.insert(reports).values({
    matchId,
    reportedBy: "rep",
    reason: (reason || "").trim() || "No reason given.",
  });

  return { success: true };
}

export async function blockCompany(matchId, reason) {
  const rep = await getSessionRep();
  if (!rep) return { success: false, message: "Your session has expired, please log in again." };

  const match = await getOwnedMatch(matchId, rep.id);
  if (!match) return { success: false, message: "We couldn't find that match." };

  await db
    .update(matches)
    .set({ repDecision: "passed", repDecidedAt: new Date(), status: "rejected", updatedAt: new Date() })
    .where(eq(matches.id, matchId));

  await db
    .insert(blockedPairs)
    .values({ repId: rep.id, companyId: match.companyId, blockedBy: "rep", reason: (reason || "").trim() || null })
    .onConflictDoNothing();

  revalidatePath("/rep/dashboard");
  revalidatePath("/company/dashboard");
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
    await db.insert(meetings).values({ matchId, scheduledAt, status: "proposed", proposedBy, notes: notes || null });
  }

  await db
    .update(matches)
    .set({ status: "interview_proposed", updatedAt: new Date() })
    .where(eq(matches.id, matchId));

  return { success: true };
}

// Rep counter-proposing a different time — same shape as the company's
// proposeInterview action, just the other side of the same conversation.
export async function proposeInterviewTime(matchId, payload) {
  const rep = await getSessionRep();
  if (!rep) return { success: false, message: "Your session has expired, please log in again." };

  const match = await getOwnedMatch(matchId, rep.id);
  if (!match) return { success: false, message: "We couldn't find that match." };

  const result = await upsertProposedMeeting(matchId, payload, "rep");
  if (result.success) {
    revalidatePath("/rep/dashboard");
    revalidatePath("/company/dashboard");
  }
  return result;
}

export async function confirmInterview(matchId) {
  const rep = await getSessionRep();
  if (!rep) return { success: false, message: "Your session has expired, please log in again." };

  const match = await getOwnedMatch(matchId, rep.id);
  if (!match) return { success: false, message: "We couldn't find that match." };

  const [meeting] = await db.select().from(meetings).where(eq(meetings.matchId, matchId)).limit(1);
  if (!meeting || meeting.proposedBy !== "company") {
    return { success: false, message: "There's no proposed time from the company to confirm yet." };
  }

  await db.update(meetings).set({ status: "confirmed", updatedAt: new Date() }).where(eq(meetings.matchId, matchId));
  await db.update(matches).set({ status: "interviewing", updatedAt: new Date() }).where(eq(matches.id, matchId));

  const [company] = await db.select().from(companies).where(eq(companies.id, match.companyId)).limit(1);
  if (company) {
    await sendInterviewConfirmedInvites({ match, rep, company, meeting: { ...meeting, status: "confirmed" } });
  }

  revalidatePath("/rep/dashboard");
  revalidatePath("/company/dashboard");
  return { success: true };
}
