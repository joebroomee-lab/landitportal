import { buildMeetingIcs } from "@/lib/ics";
import { sendEmail, interviewConfirmedEmail, getOrganizerIdentity } from "@/lib/email";

// Fires the moment an interview time gets CONFIRMED (not just proposed) —
// called from both app/company/dashboard/actions.js's confirmInterview and
// app/rep/dashboard/actions.js's confirmInterview, since either side can be
// the one who taps "Confirm".
//
// This is a real calendar invite, not a file to download: each email's
// text/calendar attachment carries METHOD:REQUEST, which is what Gmail,
// Outlook and Apple Mail key off to render their native "Yes / No / Maybe"
// invite bar and offer to add the event straight to the recipient's
// calendar — no separate download-and-import step. The ORGANIZER is
// LandIt's own sending identity (see getOrganizerIdentity, tied to
// EMAIL_FROM's domain), and both the rep and the company contact are listed
// as ATTENDEEs on the exact same event (same UID), so it's one shared
// meeting on both calendars, not two independently-created ones.
export async function sendInterviewConfirmedInvites({ match, rep, company, meeting }) {
  if (!meeting?.scheduledAt) return;

  const repFirstName = rep.fullName?.split(" ")[0] || "there";
  const companyContactFirstName = company.contactName?.split(" ")[0] || "there";
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

  const attachments = [
    {
      filename: "invite.ics",
      content: Buffer.from(ics, "utf-8").toString("base64"),
      content_type: "text/calendar; charset=utf-8; method=REQUEST",
    },
  ];

  const repEmail = interviewConfirmedEmail({
    recipientFirstName: repFirstName,
    otherPartyName: company.companyName,
    scheduledAt: meeting.scheduledAt,
  });
  const companyEmail = interviewConfirmedEmail({
    recipientFirstName: companyContactFirstName,
    otherPartyName: repFirstName,
    scheduledAt: meeting.scheduledAt,
  });

  await Promise.all([
    sendEmail({ to: rep.email, ...repEmail, attachments, replyTo: organizer.email }).catch(() => {}),
    sendEmail({ to: company.workEmail, ...companyEmail, attachments, replyTo: organizer.email }).catch(() => {}),
  ]);
}
