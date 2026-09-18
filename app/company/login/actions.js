"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { eq, and, gt } from "drizzle-orm";
import { db } from "@/db";
import { companies } from "@/db/schema";
import { newLoginToken, loginTokenExpiry, COMPANY_COOKIE } from "@/lib/session";
import { sendEmail, loginLinkEmail } from "@/lib/email";
import { getSiteUrl } from "@/lib/site-url";

// Mirrors app/rep/login/actions.js's requestLoginLink — same generic
// {success: true, message} whether or not the email belongs to a company
// (email enumeration), same single-use short-lived token pattern. Matches
// against workEmail, the field companies actually sign up with.
export async function requestCompanyLoginLink(email) {
  const cleaned = (email || "").trim().toLowerCase();
  if (!cleaned) {
    return { success: false, message: "Please enter your email address." };
  }

  try {
    const [company] = await db.select().from(companies).where(eq(companies.workEmail, cleaned)).limit(1);

    if (company) {
      const token = newLoginToken();
      await db
        .update(companies)
        .set({ loginToken: token, loginTokenExpiresAt: loginTokenExpiry() })
        .where(eq(companies.id, company.id));

      const siteUrl = await getSiteUrl();
      const verifyUrl = `${siteUrl}/company/login/verify?token=${token}`;
      const { subject, html, text } = loginLinkEmail({ verifyUrl });
      await sendEmail({ to: company.workEmail, subject, html, text });
    }
  } catch (e) {
    console.error("requestCompanyLoginLink: failed", e);
  }

  return {
    success: true,
    message: "If that email is registered with us, we've sent a sign-in link. Check your inbox.",
  };
}

// Mirrors app/rep/login/actions.js's confirmRepLogin — see that file's
// comment for why this has to be a separate, click-triggered action rather
// than something the GET on /company/login/verify does automatically.
export async function confirmCompanyLogin(token) {
  if (!token) {
    return { success: false, message: "That link is missing its token." };
  }

  const [company] = await db
    .select()
    .from(companies)
    .where(and(eq(companies.loginToken, token), gt(companies.loginTokenExpiresAt, new Date())))
    .limit(1);

  if (!company) {
    return {
      success: false,
      message: "That link has expired or was already used. Request a new one below.",
    };
  }

  // Single-use: clear the token immediately so this link can't be replayed.
  await db
    .update(companies)
    .set({ loginToken: null, loginTokenExpiresAt: null })
    .where(eq(companies.id, company.id));

  const cookieStore = await cookies();
  cookieStore.set(COMPANY_COOKIE, company.accessToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });

  redirect("/company/dashboard");
}
