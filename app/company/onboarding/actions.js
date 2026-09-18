"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { companies } from "@/db/schema";
import { COMPANY_COOKIE, newAccessToken } from "@/lib/session";
import { getFile } from "@/lib/storage";
import { extractCompanyProfileFromFiles } from "@/lib/ai";
import { sendEmail, companyWelcomeEmail } from "@/lib/email";

// Called once the company has uploaded whatever they're dropping in (job
// description, company info, hiring thesis, values, articles) and hits
// Continue on that step. Reads each file back out of storage, sends them all
// to Claude in one call, and returns a draft profile the wizard pre-fills —
// every field stays editable on the following steps. Returns { ok: false }
// (never throws) if there's no API key configured, nothing was readable, or
// the model call fails — the wizard just falls back to a blank manual flow.
export async function extractCompanyProfile(fileKeys) {
  if (!Array.isArray(fileKeys) || fileKeys.length === 0) return { ok: false, reason: "no_files" };

  const files = [];
  for (const key of fileKeys) {
    const file = await getFile(key);
    if (file) files.push({ buffer: file.buffer, contentType: file.contentType, filename: key });
  }
  if (files.length === 0) {
    console.error(`extractCompanyProfile: none of ${fileKeys.length} file key(s) were readable`, fileKeys);
    return { ok: false, reason: "no_readable_files" };
  }

  return extractCompanyProfileFromFiles(files);
}

// There's no "what's your name" step in the wizard anymore — work email is
// enough to get started, so we derive a first-name-style greeting from the
// email's local part (e.g. "jamie.lee@acme.com" -> "Jamie Lee") for the
// welcome email. Falls back to "there" if the local part isn't name-shaped.
function deriveContactName(workEmail) {
  const local = workEmail?.split("@")[0] || "";
  const cleaned = local.replace(/[._+-]+/g, " ").trim();
  if (!cleaned || /\d/.test(cleaned)) return "";
  return cleaned
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");
}

// Same idea as deriveContactName above, one field over: rather than add a
// "what's your website" question to the wizard, take a free guess from the
// work email's domain. Skipped for generic personal-email providers, where
// the domain obviously isn't the company's own site.
const PERSONAL_EMAIL_DOMAINS = new Set([
  "gmail.com",
  "googlemail.com",
  "outlook.com",
  "hotmail.com",
  "live.com",
  "yahoo.com",
  "icloud.com",
  "me.com",
  "aol.com",
  "proton.me",
  "protonmail.com",
]);

function deriveWebsite(workEmail) {
  const domain = workEmail?.split("@")[1]?.trim().toLowerCase();
  if (!domain || PERSONAL_EMAIL_DOMAINS.has(domain)) return "";
  return `https://${domain}`;
}

// Same error-handling shape as app/rep/onboarding/actions.js's
// submitRepOnboarding — see the comment there for why this returns a plain
// object instead of throwing.
export async function submitCompanyOnboarding(data) {
  if (!data.companyName?.trim() || !data.workEmail?.trim()) {
    return {
      success: false,
      code: "invalid",
      message: "Please fill in your company name and work email before submitting.",
    };
  }

  const accessToken = newAccessToken();
  // contact_name is NOT NULL in the DB — "there" is also companyWelcomeEmail's
  // own fallback, so this only matters for what shows in the admin list.
  const contactName = data.contactName?.trim() || deriveContactName(data.workEmail) || "there";
  let created;

  try {
    [created] = await db
      .insert(companies)
      .values({
        companyName: data.companyName.trim(),
        contactName,
        workEmail: data.workEmail.trim().toLowerCase(),
        companySize: data.companySize || null,
        industry: data.industry || null,
        roleTitle: data.roleTitle || null,
        seniority: data.seniority || null,
        dealSize: data.dealSize || null,
        ote: data.ote || null,
        tools: data.tools || [],
        timeline: data.timeline || null,
        notes: data.notes || null,
        icp: data.icp || null,
        website: deriveWebsite(data.workEmail) || null,
        // No logo step in onboarding — it's pure friction for a company
        // signing up, and every avatar spot already falls back to the
        // company's initial when this is null. Can still be set later
        // (e.g. from admin) if it turns out to matter.
        logoUrl: null,
        tags: data.tags || [],
        sourceFileKeys: data.fileKeys || [],
        status: "pending",
        accessToken,
      })
      .returning();
  } catch (e) {
    const pgCode = e?.cause?.code || e?.code;
    if (pgCode === "23505") {
      return {
        success: false,
        code: "duplicate",
        message: "A company with that work email already exists.",
      };
    }
    console.error("submitCompanyOnboarding: insert failed", e);
    return {
      success: false,
      code: "unknown",
      message: "Something went wrong submitting your profile. Please try again.",
      debug: e?.cause?.message || e?.message || String(e),
    };
  }

  try {
    const { subject, html, text } = companyWelcomeEmail({
      companyName: created.companyName,
      contactName: created.contactName,
    });
    await sendEmail({ to: created.workEmail, subject, html, text });
  } catch (e) {
    console.error("submitCompanyOnboarding: welcome email failed", e);
  }

  const cookieStore = await cookies();
  cookieStore.set(COMPANY_COOKIE, accessToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });

  redirect("/company/dashboard");
}
