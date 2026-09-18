import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { matches, reps, companies, meetings } from "@/db/schema";
import { REP_COOKIE, COMPANY_COOKIE } from "@/lib/session";
import { buildMeetingIcs } from "@/lib/ics";
import { getOrganizerIdentity } from "@/lib/email";

export const dynamic = "force-dynamic";

// Downloadable calendar invite for a confirmed interview. Gated to whichever
// of the two parties is actually logged in as the rep or company on this
// specific match — not admin-open like /api/files, since this carries both
// sides' real names and email addresses.
export async function GET(request, { params }) {
  const { matchId } = await params;

  const [row] = await db
    .select({ match: matches, rep: reps, company: companies, meeting: meetings })
    .from(matches)
    .innerJoin(reps, eq(matches.repId, reps.id))
    .innerJoin(companies, eq(matches.companyId, companies.id))
    .leftJoin(meetings, eq(meetings.matchId, matches.id))
    .where(eq(matches.id, matchId))
    .limit(1);

  if (!row || !row.meeting?.scheduledAt) {
    return NextResponse.json({ error: "No scheduled interview found." }, { status: 404 });
  }

  const cookieStore = await cookies();
  const repToken = cookieStore.get(REP_COOKIE)?.value;
  const companyToken = cookieStore.get(COMPANY_COOKIE)?.value;
  const isRep = repToken && repToken === row.rep.accessToken;
  const isCompany = companyToken && companyToken === row.company.accessToken;
  if (!isRep && !isCompany) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const { rep, company, match, meeting } = row;
  const repFirstName = rep.fullName?.split(" ")[0] || "Rep";
  const organizer = getOrganizerIdentity();

  const ics = buildMeetingIcs({
    uid: `landit-meeting-${meeting.id}@trylandit.io`,
    scheduledAt: meeting.scheduledAt,
    summary: `LandIt intro: ${company.companyName} × ${repFirstName}`,
    description: [
      `Interview between ${company.companyName} and ${rep.fullName} for the ${match.roleTitle || company.roleTitle || "role"} role, set up via LandIt.`,
      "",
      "Video call link: to be confirmed. LandIt will follow up with the link before the call.",
      meeting.notes ? `Note: ${meeting.notes}` : null,
    ]
      .filter(Boolean)
      .join("\n"),
    companyName: company.contactName ? `${company.contactName} (${company.companyName})` : company.companyName,
    companyEmail: company.workEmail,
    repName: rep.fullName,
    repEmail: rep.email,
    organizerName: organizer.name,
    organizerEmail: organizer.email,
  });

  return new NextResponse(ics, {
    status: 200,
    headers: {
      "content-type": "text/calendar; charset=utf-8",
      "content-disposition": `attachment; filename="landit-interview-${matchId}.ics"`,
    },
  });
}
