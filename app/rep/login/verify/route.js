import { NextResponse } from "next/server";
import { eq, and, gt } from "drizzle-orm";
import { db } from "@/db";
import { reps } from "@/db/schema";
import { REP_COOKIE } from "@/lib/session";

export const dynamic = "force-dynamic";

// Magic-link verification has to be a Route Handler, not a page. Next.js
// only allows cookies() to be mutated inside a Server Action or a Route
// Handler — a plain Server Component (page.js) rendered on GET navigation
// throws "Cookies can only be modified in a Server Action or Route Handler"
// the moment it tries to set the session cookie. So this does the lookup +
// cookie-set itself and redirects to a page, rather than being a page.
export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const token = searchParams.get("token");

  if (!token) {
    return NextResponse.redirect(`${origin}/rep/login?error=missing`);
  }

  const [rep] = await db
    .select()
    .from(reps)
    .where(and(eq(reps.loginToken, token), gt(reps.loginTokenExpiresAt, new Date())))
    .limit(1);

  if (!rep) {
    return NextResponse.redirect(`${origin}/rep/login?error=expired`);
  }

  // Single-use: clear the token immediately so this link can't be replayed.
  await db
    .update(reps)
    .set({ loginToken: null, loginTokenExpiresAt: null })
    .where(eq(reps.id, rep.id));

  const response = NextResponse.redirect(`${origin}/rep/dashboard`);
  response.cookies.set(REP_COOKIE, rep.accessToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return response;
}
