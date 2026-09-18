"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { eq, and, gt } from "drizzle-orm";
import { db } from "@/db";
import { reps } from "@/db/schema";
import { newLoginToken, loginTokenExpiry, REP_COOKIE } from "@/lib/session";
import { sendEmail, loginLinkEmail } from "@/lib/email";
import { getSiteUrl } from "@/lib/site-url";

// Always returns the same generic {success: true, message} whether or not
// the email belongs to a rep — this page must not be usable to check who
// has a LandIt profile (email enumeration). The actual email is only ever
// sent when a matching rep is found.
export async function requestLoginLink(email) {
  const cleaned = (email || "").trim().toLowerCase();
  if (!cleaned) {
    return { success: false, message: "Please enter your email address." };
  }

  try {
    const [rep] = await db.select().from(reps).where(eq(reps.email, cleaned)).limit(1);

    if (rep) {
      const token = newLoginToken();
      await db
        .update(reps)
        .set({ loginToken: token, loginTokenExpiresAt: loginTokenExpiry() })
        .where(eq(reps.id, rep.id));

      const siteUrl = await getSiteUrl();
      const verifyUrl = `${siteUrl}/rep/login/verify?token=${token}`;
      const { subject, html, text } = loginLinkEmail({ verifyUrl });
      await sendEmail({ to: rep.email, subject, html, text });
    }
  } catch (e) {
    // Never let a lookup/send failure reveal whether the email exists, and
    // never block the generic response below.
    console.error("requestLoginLink: failed", e);
  }

  return {
    success: true,
    message: "If that email is registered with us, we've sent a sign-in link. Check your inbox.",
  };
}

// Actually consumes the token and signs the rep in. Deliberately NOT run as
// a side effect of the GET on /rep/login/verify — email clients (Gmail in
// particular) prefetch links in emails to scan them for safety, which would
// silently burn a single-use token before the person ever taps it. Instead
// the verify page only *checks* the token (read-only) and renders a button;
// this action — only reachable by an actual click — is what clears the
// token, sets the cookie, and redirects.
export async function confirmRepLogin(token) {
  if (!token) {
    return { success: false, message: "That link is missing its token." };
  }

  const [rep] = await db
    .select()
    .from(reps)
    .where(and(eq(reps.loginToken, token), gt(reps.loginTokenExpiresAt, new Date())))
    .limit(1);

  if (!rep) {
    return {
      success: false,
      message: "That link has expired or was already used. Request a new one below.",
    };
  }

  // Single-use: clear the token immediately so this link can't be replayed.
  await db
    .update(reps)
    .set({ loginToken: null, loginTokenExpiresAt: null })
    .where(eq(reps.id, rep.id));

  const cookieStore = await cookies();
  cookieStore.set(REP_COOKIE, rep.accessToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });

  redirect("/rep/dashboard");
}
