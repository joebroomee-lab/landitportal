"use server";

import { eq, and } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { matches, companies, reps, meetings, blockedPairs } from "@/db/schema";
import { generateCompanySummary, generateMatchReasons } from "@/lib/ai";
import { overlapTags, sanitizeTags } from "@/lib/tags";
import { PIPELINE_STAGE_KEYS } from "@/lib/pipeline";

export async function createMatch(prevState, formData) {
  const repId = formData.get("repId")?.toString();
  const companyId = formData.get("companyId")?.toString();

  if (!repId || !companyId) {
    return { success: false, message: "Pick both a rep and a company." };
  }

  const [company] = await db.select().from(companies).where(eq(companies.id, companyId)).limit(1);
  const [rep] = await db.select().from(reps).where(eq(reps.id, repId)).limit(1);

  // Guideline 1.2 (App Store): once a rep or company blocks the other side,
  // LandIt has to actually honour that going forward, not just hide the old
  // match — refuse to create a new one between the same pair. See
  // db/schema.js's comment on blockedPairs.
  const [blocked] = await db
    .select()
    .from(blockedPairs)
    .where(and(eq(blockedPairs.repId, repId), eq(blockedPairs.companyId, companyId)))
    .limit(1);
  if (blocked) {
    return { success: false, message: "One of these has blocked the other — they can't be matched again." };
  }

  let companyBrief = formData.get("companyBrief")?.toString().trim();
  if (!companyBrief && company) {
    // Falls back to a plain-template brief internally if no AI key is
    // configured — never blocks match creation either way.
    companyBrief = await generateCompanySummary(company);
  }

  // Starting point for the rep/company-facing "why you matched" chips —
  // whatever tags they already share. Admin can add to or trim this from the
  // match detail page afterwards.
  const matchTags = overlapTags(rep?.tags, company?.tags);

  let created;
  try {
    [created] = await db
      .insert(matches)
      .values({
        repId,
        companyId,
        roleTitle: formData.get("roleTitle")?.toString() || null,
        matchReason: formData.get("matchReason")?.toString() || null,
        companyBrief: companyBrief || null,
        matchTags,
      })
      .returning();
  } catch (e) {
    console.error("createMatch failed", e);
    return { success: false, message: "Something went wrong creating the match. Please try again." };
  }

  revalidatePath("/admin/matches");
  redirect(`/admin/matches/${created.id}`);
}

// Used by the /admin 3-column dashboard's "Match" button — step 1 of 2. Just
// asks the AI to draft the two swipe-card reasons for a candidate pair, no DB
// write yet, so admin can read it, regenerate it, or back out before
// anything is created. Called as a plain function from a client component
// (not a <form action>), so it takes real args and returns data.
export async function previewMatchReasons(repId, companyId) {
  if (!repId || !companyId) return { success: false, message: "Pick both a rep and a company." };

  const [company] = await db.select().from(companies).where(eq(companies.id, companyId)).limit(1);
  const [rep] = await db.select().from(reps).where(eq(reps.id, repId)).limit(1);
  if (!company || !rep) return { success: false, message: "Couldn't find that rep or company." };

  const { reasonForRep, reasonForCompany } = await generateMatchReasons(rep, company);
  return { success: true, reasonForRep, reasonForCompany };
}

// Step 2 of 2 — actually creates the match, using whatever reasoning text
// admin ended up with (the AI draft, or their own edit of it). This does NOT
// go straight to "matched": it starts at "pending_review" with both
// repDecision and companyDecision null, which is what makes it show up in
// the rep's Discover deck first — see db/schema.js's comment on those
// columns for the full sequencing. No emails yet either, since nothing real
// has happened for either side until they've both swiped interested (see
// companySwipeStageA in app/company/dashboard/actions.js, which sends the
// existing "you've been matched" emails at that point instead).
export async function createPendingMatch(repId, companyId, reasonForRep, reasonForCompany) {
  if (!repId || !companyId) return { success: false, message: "Pick both a rep and a company." };

  const [company] = await db.select().from(companies).where(eq(companies.id, companyId)).limit(1);
  const [rep] = await db.select().from(reps).where(eq(reps.id, repId)).limit(1);
  if (!company || !rep) return { success: false, message: "Couldn't find that rep or company." };

  const companyBrief = await generateCompanySummary(company);
  const matchTags = overlapTags(rep.tags, company.tags);

  let created;
  try {
    [created] = await db
      .insert(matches)
      .values({
        repId,
        companyId,
        roleTitle: company.roleTitle || null,
        companyBrief: companyBrief || null,
        matchTags,
        matchReasonForRep: (reasonForRep || "").trim() || null,
        matchReasonForCompany: (reasonForCompany || "").trim() || null,
      })
      .returning();
  } catch (e) {
    console.error("createPendingMatch failed", e);
    return { success: false, message: "Something went wrong creating the match. Please try again." };
  }

  revalidatePath("/admin");
  revalidatePath("/admin/matches");

  return {
    success: true,
    match: created,
    rep: { id: rep.id, fullName: rep.fullName, photoUrl: rep.photoUrl },
    company: { id: company.id, companyName: company.companyName, logoUrl: company.logoUrl },
  };
}

export async function approveMatch(id) {
  await db
    .update(matches)
    .set({ status: "matched", updatedAt: new Date() })
    .where(eq(matches.id, id));
  revalidatePath("/admin/matches");
  revalidatePath(`/admin/matches/${id}`);
}

export async function rejectMatch(id) {
  await db
    .update(matches)
    .set({ status: "rejected", updatedAt: new Date() })
    .where(eq(matches.id, id));
  revalidatePath("/admin/matches");
  revalidatePath(`/admin/matches/${id}`);
}

export async function setPipelineStage(id, stage) {
  if (!PIPELINE_STAGE_KEYS.includes(stage)) return { success: false, message: "Unknown stage." };

  const patch = { pipelineStage: stage, updatedAt: new Date() };
  // Reaching the end of the admin pipeline is also what marks the match
  // "hired" for the rep/company-facing dashboards, which key off `status`
  // rather than `pipelineStage`. Moving off "hired" again (a correction)
  // reopens it as "matched" so it doesn't vanish from either dashboard.
  if (stage === "hired") patch.status = "hired";
  else if (stage !== "hired") {
    const [existing] = await db.select({ status: matches.status }).from(matches).where(eq(matches.id, id)).limit(1);
    if (existing?.status === "hired") patch.status = "matched";
  }

  await db.update(matches).set(patch).where(eq(matches.id, id));
  revalidatePath("/admin");
  revalidatePath("/admin/matches");
  revalidatePath(`/admin/matches/${id}`);
  revalidatePath("/company/dashboard");
  revalidatePath("/rep/dashboard");
  return { success: true };
}

export async function updateCompanyBrief(id, formData) {
  const companyBrief = formData.get("companyBrief")?.toString() || null;
  await db.update(matches).set({ companyBrief, updatedAt: new Date() }).where(eq(matches.id, id));
  revalidatePath(`/admin/matches/${id}`);
}

export async function updateMatchReasons(id, formData) {
  const matchReasonForRep = formData.get("matchReasonForRep")?.toString() || null;
  const matchReasonForCompany = formData.get("matchReasonForCompany")?.toString() || null;
  await db.update(matches).set({ matchReasonForRep, matchReasonForCompany, updatedAt: new Date() }).where(eq(matches.id, id));
  revalidatePath(`/admin/matches/${id}`);
}

export async function updateMatchTags(id, formData) {
  const matchTags = sanitizeTags(formData.getAll("tags"));
  await db.update(matches).set({ matchTags, updatedAt: new Date() }).where(eq(matches.id, id));
  revalidatePath(`/admin/matches/${id}`);
}

export async function scheduleMeeting(matchId, formData) {
  const scheduledAtRaw = formData.get("scheduledAt")?.toString();
  const scheduledAt = scheduledAtRaw ? new Date(scheduledAtRaw) : null;
  const notetakerRequested = formData.get("notetakerRequested") === "on";
  const notes = formData.get("notes")?.toString() || null;

  const [existing] = await db.select().from(meetings).where(eq(meetings.matchId, matchId)).limit(1);

  if (existing) {
    await db
      .update(meetings)
      .set({ scheduledAt, status: "confirmed", notetakerRequested, notes, updatedAt: new Date() })
      .where(eq(meetings.matchId, matchId));
  } else {
    await db.insert(meetings).values({
      matchId,
      scheduledAt,
      status: "confirmed",
      notetakerRequested,
      notes,
    });
  }

  // A scheduled meeting is a reasonable signal to move the pipeline stage
  // forward automatically, saving a click — admin can still override via the
  // status buttons.
  await db
    .update(matches)
    .set({ status: "interviewing", updatedAt: new Date() })
    .where(eq(matches.id, matchId));

  revalidatePath(`/admin/matches/${matchId}`);
  revalidatePath("/admin/matches");
}
