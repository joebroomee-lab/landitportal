import { pgTable, text, boolean, jsonb, timestamp, unique } from "drizzle-orm/pg-core";

const id = () =>
  text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID());

export const reps = pgTable("reps", {
  id: id(),
  fullName: text("full_name").notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone"),
  photoUrl: text("photo_url"),
  linkedinUrl: text("linkedin_url"),
  inSales: boolean("in_sales"),
  jobTitle: text("job_title"),
  notInSalesCategory: text("not_in_sales_category"),
  industries: jsonb("industries").$type().default([]),
  dealSize: text("deal_size"),
  tools: jsonb("tools").$type().default([]),
  ote: text("ote"),
  location: text("location"),
  availability: text("availability"),
  bio: text("bio"),
  pitchVideoChoice: text("pitch_video_choice"), // 'record' | 'later'
  pitchVideoUrl: text("pitch_video_url"),
  status: text("status").notNull().default("pending"), // pending | approved | rejected
  accessToken: text("access_token").notNull().unique(),
  // Magic-link sign-in: a fresh code/token is generated each time a rep
  // requests a login link and is single-use + short-lived (see lib/session.js
  // for the expiry window). Nulled out after a successful verification so a
  // stale email link can't be replayed.
  loginToken: text("login_token"),
  loginTokenExpiresAt: timestamp("login_token_expires_at"),
  // Set once onboarding's confirmation email successfully sends, and again
  // when the approval email sends — lets us tell "we never tried" apart from
  // "we tried and it failed" in the admin view / logs, without re-sending on
  // every page revalidation.
  welcomeEmailSentAt: timestamp("welcome_email_sent_at"),
  approvedEmailSentAt: timestamp("approved_email_sent_at"),
  // Fixed-vocabulary tags (see lib/tags.js) describing this rep's sales
  // motion/segment/style — either confirmed from their CV during onboarding
  // or picked manually. Compared against a company's tags to compute the
  // rep/company-facing "why you matched" chips on a match.
  tags: jsonb("tags").$type().default([]),
  // Storage key (see lib/storage.js) for the CV they uploaded at onboarding,
  // if any — lets admin open the original file from the rep detail page.
  cvFileKey: text("cv_file_key"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const companies = pgTable("companies", {
  id: id(),
  companyName: text("company_name").notNull(),
  contactName: text("contact_name").notNull(),
  workEmail: text("work_email").notNull().unique(),
  companySize: text("company_size"),
  industry: text("industry"),
  roleTitle: text("role_title"),
  seniority: text("seniority"),
  dealSize: text("deal_size"),
  ote: text("ote"),
  tools: jsonb("tools").$type().default([]),
  timeline: text("timeline"),
  notes: text("notes"),
  // Who this company actually sells its product to — their ideal customer
  // profile. Distinct from `industry` (what sector the company itself is
  // in): this is used to brief the matched rep on how to pitch the business,
  // since the rep's match video is a pitch to this company's ICP, not a
  // pitch about themselves. See lib/ai.js's generateCompanySummary.
  icp: text("icp"),
  // The company's public site — collected without an extra onboarding
  // question by deriving it from the work-email domain (see
  // deriveWebsite() in app/company/onboarding/actions.js); left null when
  // that domain is a generic personal-email provider. Shown to the rep as
  // a "visit their site" link before they record a pitch.
  website: text("website"),
  logoUrl: text("logo_url"),
  // Fixed-vocabulary tags (see lib/tags.js), same purpose as reps.tags.
  tags: jsonb("tags").$type().default([]),
  // Storage keys (see lib/storage.js) for whatever the company dropped in at
  // onboarding (job description, company info, hiring thesis, articles) —
  // kept for admin's reference, not shown to reps.
  sourceFileKeys: jsonb("source_file_keys").$type().default([]),
  // active: created directly by admin (today's manual add-a-company flow) —
  // visible for matching immediately, no review gate.
  // pending: submitted by the company themselves via public self-serve
  // onboarding — held for admin review before it can be used in a match,
  // mirroring reps' pending -> approved gate.
  // rejected: reviewed and declined.
  status: text("status").notNull().default("active"),
  accessToken: text("access_token").notNull().unique(),
  // Magic-link sign-in, same pattern as reps.loginToken above — lets a
  // company get back into their dashboard from any browser by requesting a
  // fresh emailed link, rather than relying solely on the accessToken
  // cookie set once at onboarding. Single-use + short-lived, nulled out
  // after a successful verify. See app/company/login/.
  loginToken: text("login_token"),
  loginTokenExpiresAt: timestamp("login_token_expires_at"),
  // Set once the "you're approved, see your matches" email successfully
  // sends (mirrors reps.approvedEmailSentAt) — lets setCompanyStatus tell
  // "never tried" apart from "tried and failed" without re-sending on every
  // status re-save or pending/active toggle.
  approvedEmailSentAt: timestamp("approved_email_sent_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const matches = pgTable("matches", {
  id: id(),
  repId: text("rep_id")
    .notNull()
    .references(() => reps.id, { onDelete: "cascade" }),
  companyId: text("company_id")
    .notNull()
    .references(() => companies.id, { onDelete: "cascade" }),
  roleTitle: text("role_title"),
  matchReason: text("match_reason"),
  // pending_review | matched | intro_requested | interviewing | hired | rejected
  //
  // pending_review: created by an admin (or, later, an auto-matcher) but not
  // yet approved — invisible to the rep. approving flips it to "matched",
  // which is the trigger that surfaces it in the rep's Feed and prompts them
  // to record a bespoke video for that company. Keeping an explicit review
  // step here (even though today a human creates AND approves every match)
  // means a future auto-suggestion engine can drop rows straight into
  // pending_review and the existing approval step just keeps working.
  status: text("status").notNull().default("pending_review"),
  // Admin-facing CRM progress, independent of `status` above (which drives
  // what reps/companies actually see and do — the interview-scheduling
  // flow's automatic transitions). This is a manually-advanced pipeline
  // admin uses to track a match on its way to a hire:
  // matched | first_interview | further_interviews | formal_offer | hired
  // Reaching "hired" here also sets status to "hired" (see
  // setPipelineStage in app/admin/matches/actions.js) so the existing
  // rep/company "Hired" sections keep working; every earlier stage is
  // purely a label layered on top and doesn't touch `status`.
  pipelineStage: text("pipeline_stage").notNull().default("matched"),
  // A short, rep-facing brief on the company/role — written by admin, or
  // auto-drafted from the company's profile (see lib/ai.js) when left blank.
  // Shown to the rep alongside the video recorder so they know who they're
  // talking to before they hit record.
  companyBrief: text("company_brief"),
  // The rep's bespoke "why me for this company" video for this specific
  // match (distinct from reps.pitchVideoUrl, which is their one general
  // intro video). MVP stores this as a link (Loom/YouTube/Vimeo/direct file)
  // rather than an in-app recording+upload pipeline — see delivery notes.
  repVideoUrl: text("rep_video_url"),
  repVideoUpdatedAt: timestamp("rep_video_updated_at"),
  // The rep-and-company-facing "why you matched" chips — defaults to the
  // overlap between the rep's and company's tags (see lib/tags.js) when a
  // match is created, editable by admin from there. Distinct from
  // matchReason above, which is admin-only and never shown to either side.
  matchTags: jsonb("match_tags").$type().default([]),
  // --- Swipe deck gating (pre-match stage) ---------------------------------
  // A match starts life invisible to both sides except the rep's Discover
  // deck. Admin creates it (with matchReasonForRep/matchReasonForCompany
  // already AI-drafted) at status "pending_review" with both decisions null.
  // The rep sees it first, as a company card with matchReasonForRep; only if
  // they swipe interested does it move into the company's own deck, shown as
  // a photo+profile card (no video yet) with matchReasonForCompany. Only once
  // the company also swipes interested does `status` flip to "matched" and
  // the match enters the existing pipeline (rep prompted to record their
  // bespoke video, etc) completely unchanged from how that already works. A
  // "passed" decision on either side sets `status` to "rejected" and the row
  // drops out of both decks for good.
  repDecision: text("rep_decision"), // null | interested | passed
  repDecidedAt: timestamp("rep_decided_at"),
  companyDecision: text("company_decision"), // null | interested | passed
  companyDecidedAt: timestamp("company_decided_at"),
  // AI-drafted (admin previews and can regenerate before creating the match)
  // one-or-two-sentence reasons shown on each side's swipe card — distinct
  // from companyBrief above, which is longer and only shown once truly
  // matched, to help the rep actually pitch the product.
  matchReasonForRep: text("match_reason_for_rep"),
  matchReasonForCompany: text("match_reason_for_company"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const meetings = pgTable("meetings", {
  id: id(),
  matchId: text("match_id")
    .notNull()
    .unique()
    .references(() => matches.id, { onDelete: "cascade" }),
  scheduledAt: timestamp("scheduled_at"),
  // proposed | confirmed | completed | cancelled
  status: text("status").notNull().default("proposed"),
  // Whether a LandIt notetaker should join and produce notes. Defaults on
  // per the product vision; the actual bot/calendar integration is a
  // separate follow-up build (needs a notetaker vendor + calendar auth
  // decided first) — this flag just keeps the intent wired through the data
  // model so turning it on later is a UI change, not a schema change.
  notetakerRequested: boolean("notetaker_requested").notNull().default(true),
  notes: text("notes"),
  // Who most recently proposed the current scheduledAt — 'company' | 'rep' —
  // so each side's dashboard knows whether it's showing "waiting on the
  // other side" or "your move" (confirm / propose a different time). Null
  // for meetings created the old way (admin sets a confirmed time directly).
  proposedBy: text("proposed_by"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const messages = pgTable("messages", {
  id: id(),
  matchId: text("match_id")
    .notNull()
    .references(() => matches.id, { onDelete: "cascade" }),
  senderType: text("sender_type").notNull(), // 'rep' | 'company'
  body: text("body").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// --- Trust & safety (App Store guideline 1.2, user-generated content) -----
// Reports are a lightweight paper trail, not a moderation queue with its
// own UI yet — reviewed directly via psql for now (see delivery notes), a
// dedicated admin view is a reasonable near-term follow-up once report
// volume justifies one. matchId cascades: if the underlying match (or the
// rep/company behind it) is later deleted, the report goes with it rather
// than dangling on a row that no longer exists.
export const reports = pgTable("reports", {
  id: id(),
  matchId: text("match_id")
    .notNull()
    .references(() => matches.id, { onDelete: "cascade" }),
  reportedBy: text("reported_by").notNull(), // 'rep' | 'company' — who filed it
  reason: text("reason").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Blocking is the harder stop: it ends the current match immediately (see
// blockMatch in the respective dashboard actions.js) and, unlike a report,
// is actively enforced going forward — createMatch in
// app/admin/matches/actions.js checks this table and refuses to create a
// new match between a rep/company pair that appears here. repId/companyId
// both cascade so a blocked pair's row disappears cleanly if either account
// is later deleted, rather than blocking a rep/company id that no longer
// exists against nothing.
export const blockedPairs = pgTable(
  "blocked_pairs",
  {
    id: id(),
    repId: text("rep_id")
      .notNull()
      .references(() => reps.id, { onDelete: "cascade" }),
    companyId: text("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    blockedBy: text("blocked_by").notNull(), // 'rep' | 'company' — who initiated it
    reason: text("reason"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [unique("blocked_pairs_rep_company_unique").on(table.repId, table.companyId)]
);
