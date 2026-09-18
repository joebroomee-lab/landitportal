"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { reps } from "@/db/schema";
import { REP_COOKIE, newAccessToken } from "@/lib/session";
import { sendEmail, welcomeEmail } from "@/lib/email";
import { getFile } from "@/lib/storage";
import { extractRepProfileFromFiles } from "@/lib/ai";

// Called right after a CV upload finishes (see FileDropzone + the "cv" step
// in RepOnboardingWizard). Reads the file back out of storage by its key,
// sends it to Claude, and returns a draft set of profile fields the wizard
// pre-fills — every field stays editable afterwards, this just saves typing.
// Returns { ok: false } (never throws) if there's no API key configured yet,
// the file couldn't be read, or the model call fails — the wizard falls back
// to a fully manual flow in that case, same as if no CV had been uploaded.
export async function extractRepProfileFromCV(fileKey) {
  if (!fileKey) return { ok: false, reason: "no_file" };

  const file = await getFile(fileKey);
  if (!file) return { ok: false, reason: "file_not_found" };

  return extractRepProfileFromFiles([
    { buffer: file.buffer, contentType: file.contentType, filename: "cv" },
  ]);
}

// IMPORTANT: Next.js redacts thrown errors that escape a Server Action before
// they reach the client in production (stripping .message/.cause/.code and
// replacing them with a generic message + .digest). That makes it impossible
// for the browser to tell a duplicate-email failure from any other failure,
// and hides real errors from us entirely. So this action never throws for
// expected/handled failures — it returns a plain {success, code, message}
// object instead, which Next.js does NOT redact. redirect() is kept
// completely outside of any try/catch: redirect() works by internally
// throwing a special NEXT_REDIRECT signal, and if that throw were caught by
// a try/catch here it would break navigation on the success path.
export async function submitRepOnboarding(data) {
  if (!data.fullName?.trim() || !data.email?.trim() || !data.phone?.trim()) {
    return {
      success: false,
      code: "invalid",
      message: "Please fill in your name, email and phone number before submitting.",
    };
  }

  const accessToken = newAccessToken();
  let created;

  try {
    [created] = await db
      .insert(reps)
      .values({
        fullName: data.fullName.trim(),
        email: data.email.trim().toLowerCase(),
        phone: data.phone.trim(),
        photoUrl: data.photoUrl || null,
        linkedinUrl: data.linkedinUrl || null,
        inSales: data.inSales ?? null,
        jobTitle: data.jobTitle || null,
        notInSalesCategory: data.notInSalesCategory || null,
        industries: data.industries || [],
        dealSize: data.dealSize || null,
        tools: data.tools || [],
        ote: data.ote || null,
        location: data.location || null,
        availability: data.availability || null,
        bio: data.bio || null,
        pitchVideoChoice: data.pitchVideoChoice || null,
        pitchVideoUrl: data.pitchVideoUrl || null,
        tags: data.tags || [],
        cvFileKey: data.cvFileKey || null,
        accessToken,
      })
      .returning();
  } catch (e) {
    const pgCode = e?.cause?.code || e?.code;
    if (pgCode === "23505") {
      return {
        success: false,
        code: "duplicate",
        message: "That email is already registered.",
      };
    }
    // Surface the real reason in the returned object (not thrown) so it
    // reaches the client intact instead of being redacted. Still logged
    // server-side for the Netlify function logs too.
    console.error("submitRepOnboarding: insert failed", e);
    return {
      success: false,
      code: "unknown",
      message: "Something went wrong submitting your profile. Please try again.",
      debug: e?.cause?.message || e?.message || String(e),
    };
  }

  // Best-effort confirmation email — never blocks or fails the submission.
  // Deliberately kept inside its own try/catch (not just relying on
  // sendEmail's internal one) so a bug in the email content itself can't
  // take down onboarding either.
  try {
    const { subject, html, text } = welcomeEmail({ fullName: created.fullName });
    const result = await sendEmail({ to: created.email, subject, html, text });
    if (result.sent) {
      await db.update(reps).set({ welcomeEmailSentAt: new Date() }).where(eq(reps.id, created.id));
    }
  } catch (e) {
    console.error("submitRepOnboarding: welcome email failed", e);
  }

  const cookieStore = await cookies();
  cookieStore.set(REP_COOKIE, accessToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });

  redirect("/rep/dashboard");
}
