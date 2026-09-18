"use server";

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { reps } from "@/db/schema";
import { newLoginToken, loginTokenExpiry } from "@/lib/session";
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
