"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { companies } from "@/db/schema";
import { newAccessToken } from "@/lib/session";

export async function createCompany(prevState, formData) {
  const companyName = formData.get("companyName")?.toString().trim();
  const contactName = formData.get("contactName")?.toString().trim();
  const workEmail = formData.get("workEmail")?.toString().trim().toLowerCase();

  if (!companyName || !contactName || !workEmail) {
    return { success: false, message: "Company name, contact name, and work email are required." };
  }

  try {
    await db.insert(companies).values({
      companyName,
      contactName,
      workEmail,
      companySize: formData.get("companySize")?.toString() || null,
      industry: formData.get("industry")?.toString() || null,
      roleTitle: formData.get("roleTitle")?.toString() || null,
      seniority: formData.get("seniority")?.toString() || null,
      dealSize: formData.get("dealSize")?.toString() || null,
      ote: formData.get("ote")?.toString() || null,
      tools: formData.getAll("tools").filter(Boolean),
      timeline: formData.get("timeline")?.toString() || null,
      notes: formData.get("notes")?.toString() || null,
      icp: formData.get("icp")?.toString() || null,
      accessToken: newAccessToken(),
    });
  } catch (e) {
    const pgCode = e?.cause?.code || e?.code;
    if (pgCode === "23505") {
      return { success: false, message: "A company with that work email already exists." };
    }
    console.error("createCompany failed", e);
    return { success: false, message: "Something went wrong creating the company. Please try again." };
  }

  revalidatePath("/admin/companies");
  redirect("/admin/companies");
}
