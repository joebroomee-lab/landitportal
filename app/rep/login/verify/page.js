import { and, eq, gt } from "drizzle-orm";
import { db } from "@/db";
import { reps } from "@/db/schema";
import ConfirmLogin from "@/components/ConfirmLogin";
import { confirmRepLogin } from "@/app/rep/login/actions";

export const dynamic = "force-dynamic";

export const metadata = { title: "Confirm sign-in - LandIt" };

// Read-only by design — this page must NOT clear the token itself. Email
// clients (Gmail especially) prefetch links to scan them for safety, and if
// simply loading this URL burned the single-use token, the real click from
// the real person would always find it already gone. So this only checks
// whether the token still looks valid and renders a button; the actual
// consume-and-sign-in happens in the confirmRepLogin server action, which
// only runs when a person clicks it.
export default async function RepLoginVerifyPage({ searchParams }) {
  const { token } = await searchParams;

  let valid = false;
  let name = "";

  if (token) {
    const [rep] = await db
      .select({ id: reps.id, fullName: reps.fullName })
      .from(reps)
      .where(and(eq(reps.loginToken, token), gt(reps.loginTokenExpiresAt, new Date())))
      .limit(1);
    if (rep) {
      valid = true;
      name = rep.fullName;
    }
  }

  return (
    <ConfirmLogin
      token={token || ""}
      valid={valid}
      name={name}
      confirmAction={confirmRepLogin}
      loginHref="/rep/login"
    />
  );
}
