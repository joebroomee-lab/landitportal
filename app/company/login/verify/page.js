import { and, eq, gt } from "drizzle-orm";
import { db } from "@/db";
import { companies } from "@/db/schema";
import ConfirmLogin from "@/components/ConfirmLogin";
import { confirmCompanyLogin } from "@/app/company/login/actions";

export const dynamic = "force-dynamic";

export const metadata = { title: "Confirm sign-in - LandIt" };

// Mirrors app/rep/login/verify/page.js — see that file's comment for why
// this is a read-only check with a click-triggered confirm action, rather
// than the GET itself consuming the token.
export default async function CompanyLoginVerifyPage({ searchParams }) {
  const { token } = await searchParams;

  let valid = false;
  let name = "";

  if (token) {
    const [company] = await db
      .select({ id: companies.id, companyName: companies.companyName })
      .from(companies)
      .where(and(eq(companies.loginToken, token), gt(companies.loginTokenExpiresAt, new Date())))
      .limit(1);
    if (company) {
      valid = true;
      name = company.companyName;
    }
  }

  return (
    <ConfirmLogin
      token={token || ""}
      valid={valid}
      name={name}
      confirmAction={confirmCompanyLogin}
      loginHref="/company/login"
    />
  );
}
