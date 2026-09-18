"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { reps, companies, matches } from "@/db/schema";
import { sendEmail, approvedEmail, companyApprovedEmail } from "@/lib/email";
import { getSiteUrl } from "@/lib/site-url";
import { sanitizeTags } from "@/lib/tags";

export async function setRepStatus(id, status) {
  const [before] = await db.select().from(reps).where(eq(reps.id, id)).limit(1);

  await db.update(reps).set({ status }).where(eq(reps.id, id));

  // Only fire the "you're approved" email on the actual pending/rejected →
  // approved transition, and only once — re-saving an already-approved rep
  // (or toggling back and forth) must never re-send it.
  if (before && before.status !== "approved" && status === "approved" && !before.approvedEmailSentAt) {
    try {
      const siteUrl = await getSiteUrl();
      const { subject, html, text } = approvedEmail({
        fullName: before.fullName,
        loginUrl: `${siteUrl}/rep/login`,
      });
      const result = await sendEmail({ to: before.email, subject, html, text });
      if (result.sent) {
        await db.update(reps).set({ approvedEmailSentAt: new Date() }).where(eq(reps.id, id));
      }
    } catch (e) {
      console.error("setRepStatus: approval email failed", e);
    }
  }

  revalidatePath("/admin/reps");
  revalidatePath(`/admin/reps/${id}`);
  revalidatePath("/admin/stats");
}

export async function setCompanyStatus(id, status) {
  const [before] = await db.select().from(companies).where(eq(companies.id, id)).limit(1);

  await db.update(companies).set({ status }).where(eq(companies.id, id));

  // Same pattern as setRepStatus above: only fire "you're approved" on the
  // actual pending/rejected → active transition, and only once ever.
  if (before && before.status !== "active" && status === "active" && !before.approvedEmailSentAt) {
    try {
      const siteUrl = await getSiteUrl();
      const { subject, html, text } = companyApprovedEmail({
        companyName: before.companyName,
        contactName: before.contactName,
        loginUrl: `${siteUrl}/company/login`,
      });
      const result = await sendEmail({ to: before.workEmail, subject, html, text });
      if (result.sent) {
        await db.update(companies).set({ approvedEmailSentAt: new Date() }).where(eq(companies.id, id));
      }
    } catch (e) {
      console.error("setCompanyStatus: approval email failed", e);
    }
  }

  revalidatePath("/admin/companies");
  revalidatePath(`/admin/companies/${id}`);
  revalidatePath("/admin/stats");
}

export async function updateRepTags(id, formData) {
  const tags = sanitizeTags(formData.getAll("tags"));
  await db.update(reps).set({ tags }).where(eq(reps.id, id));
  revalidatePath(`/admin/reps/${id}`);
}

export async function updateCompanyTags(id, formData) {
  const tags = sanitizeTags(formData.getAll("tags"));
  await db.update(companies).set({ tags }).where(eq(companies.id, id));
  revalidatePath(`/admin/companies/${id}`);
}

export async function setMatchStatus(id, status) {
  await db
    .update(matches)
    .set({ status, updatedAt: new Date() })
    .where(eq(matches.id, id));
  revalidatePath("/admin/matches");
  revalidatePath("/admin/stats");
}
