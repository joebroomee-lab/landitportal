import { NextResponse } from "next/server";
import { eq, and, gt } from "drizzle-orm";
import { db } from "@/db";
import { companies } from "@/db/schema";
import { COMPANY_COOKIE } from "@/lib/session";

export const dynamic = "force-dynamic";

// Mirrors app/rep/login/verify/route.js — see that file's comment for why
// this has to be a Route Handler rather than a page.
export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const token = searchParams.get("token");

  if (!token) {
    return NextResponse.redirect(`${origin}/company/login?error=missing`);
  }

  const [company] = await db
    .select()
    .from(companies)
    .where(and(eq(companies.loginToken, token), gt(companies.loginTokenExpiresAt, new Date())))
    .limit(1);

  if (!company) {
    return NextResponse.redirect(`${origin}/company/login?error=expired`);
  }

  // Single-use: clear the token immediately so this link can't be replayed.
  await db
    .update(companies)
    .set({ loginToken: null, loginTokenExpiresAt: null })
    .where(eq(companies.id, company.id));

  const response = NextResponse.redirect(`${origin}/company/dashboard`);
  response.cookies.set(COMPANY_COOKIE, company.accessToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return response;
}
