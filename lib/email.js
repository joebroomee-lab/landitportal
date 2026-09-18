import { formatMeetingTime } from "@/lib/format";

// Sends transactional email via Resend's plain REST API (no SDK dependency
// needed — it's one JSON POST). Requires RESEND_API_KEY as an env var
// (Netlify → Site configuration → Environment variables). Until that's set,
// every call here just logs and returns — it never throws, so a missing or
// misconfigured email provider can never break onboarding or admin approval,
// the same fail-safe pattern used for lib/ai.js.
//
// EMAIL_FROM defaults to Resend's own shared sandbox address
// (onboarding@resend.dev), which Resend lets any account send from — to any
// recipient — with zero setup. That means emails work the moment an API key
// is added, before a custom domain is verified. Once a domain is verified in
// Resend, set EMAIL_FROM to something like "LandIt <hello@yourdomain.com>"
// to send from that domain instead.
const DEFAULT_FROM = "LandIt <onboarding@resend.dev>";

// The identity that "sends" the app's mail, reused as the ORGANIZER on
// calendar invites too (see lib/ics.js's buildMeetingIcs and
// lib/meetings.js) — so the invite genuinely comes from the same
// address/domain the email itself was sent from, rather than a separate
// hardcoded identity that doesn't match. Once EMAIL_FROM is pointed at a
// verified custom domain (see the comment on DEFAULT_FROM below), both the
// email's From: header and every calendar invite's organizer automatically
// move to that domain together — one setting, not two to keep in sync.
export function getOrganizerIdentity() {
  const from = process.env.EMAIL_FROM || DEFAULT_FROM;
  const match = from.match(/<([^>]+)>/);
  const email = match ? match[1] : from.trim();
  return { name: "LandIt", email };
}

// `attachments`, when passed, is Resend's own shape:
// [{ filename, content: <base64 string>, content_type? }] — used for
// attaching a calendar invite (.ics) to the interview-confirmed email, see
// lib/meetings.js's sendInterviewConfirmedInvites. `replyTo`, when passed, is
// forwarded as Resend's `reply_to` — set to the same organizer address the
// invite uses, so a reply-all or an RSVP-by-reply from an older mail client
// actually reaches someone rather than bouncing off the sandbox sender.
export async function sendEmail({ to, subject, html, text, attachments, replyTo }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn(
      `sendEmail: RESEND_API_KEY not set — skipping email "${subject}" to ${to}`
    );
    return { sent: false, reason: "no_api_key" };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM || DEFAULT_FROM,
        to,
        subject,
        html,
        text,
        ...(attachments && attachments.length ? { attachments } : {}),
        ...(replyTo ? { reply_to: replyTo } : {}),
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error(`sendEmail: Resend returned ${res.status} for "${subject}" to ${to}`, body);
      return { sent: false, reason: "provider_error", status: res.status };
    }

    return { sent: true };
  } catch (e) {
    console.error(`sendEmail: failed to send "${subject}" to ${to}`, e);
    return { sent: false, reason: "network_error" };
  }
}

function wrapper(bodyHtml) {
  return `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;color:#1a1a1a;">
    <div style="font-size:20px;font-weight:700;letter-spacing:-0.02em;margin-bottom:24px;">LandIt</div>
    ${bodyHtml}
    <p style="margin-top:40px;font-size:12px;color:#8a8a8a;">LandIt: UK B2B sales talent, matched.</p>
  </div>`;
}

export function welcomeEmail({ fullName }) {
  const firstName = (fullName || "").split(" ")[0] || "there";
  return {
    subject: "Thanks for signing up, your profile is being reviewed",
    html: wrapper(`
      <p style="font-size:15px;line-height:1.6;">Hi ${firstName},</p>
      <p style="font-size:15px;line-height:1.6;">Thanks for creating your LandIt profile. We're reviewing it now. This usually takes up to 12 hours.</p>
      <p style="font-size:15px;line-height:1.6;">Once you're approved, we'll email you (and text you, if we have your number) so you can log in and see your matches.</p>
      <p style="font-size:15px;line-height:1.6;">Speak soon,<br/>The LandIt team</p>
    `),
    text: `Hi ${firstName},\n\nThanks for creating your LandIt profile. We're reviewing it now. This usually takes up to 12 hours.\n\nOnce you're approved, we'll email you so you can log in and see your matches.\n\nThe LandIt team`,
  };
}

export function companyWelcomeEmail({ companyName, contactName }) {
  const firstName = (contactName || "").split(" ")[0] || "there";
  return {
    subject: "Thanks for signing up to LandIt, we're reviewing your profile",
    html: wrapper(`
      <p style="font-size:15px;line-height:1.6;">Hi ${firstName},</p>
      <p style="font-size:15px;line-height:1.6;">Thanks for setting up ${companyName || "your company"}&rsquo;s profile on LandIt. We're reviewing it now. This usually takes up to 12 hours.</p>
      <p style="font-size:15px;line-height:1.6;">Once you're approved we'll start matching you with reps and be in touch by email to introduce your first match.</p>
      <p style="font-size:15px;line-height:1.6;">Speak soon,<br/>The LandIt team</p>
    `),
    text: `Hi ${firstName},\n\nThanks for setting up ${companyName || "your company"}'s profile on LandIt. We're reviewing it now. This usually takes up to 12 hours.\n\nOnce you're approved we'll start matching you with reps and be in touch by email to introduce your first match.\n\nThe LandIt team`,
  };
}

export function approvedEmail({ fullName, loginUrl }) {
  const firstName = (fullName || "").split(" ")[0] || "there";
  return {
    subject: "You're approved, log in to see your matches",
    html: wrapper(`
      <p style="font-size:15px;line-height:1.6;">Hi ${firstName},</p>
      <p style="font-size:15px;line-height:1.6;">Good news: your LandIt profile has been approved.</p>
      <p style="margin:28px 0;"><a href="${loginUrl}" style="background:#111;color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">Log in to see your matches</a></p>
      <p style="font-size:13px;line-height:1.6;color:#666;">Enter your email on that page and we'll send you a one-click sign-in link, no password needed.</p>
      <p style="font-size:15px;line-height:1.6;">Speak soon,<br/>The LandIt team</p>
    `),
    text: `Hi ${firstName},\n\nGood news: your LandIt profile has been approved. Log in here to see your matches: ${loginUrl}\n\nEnter your email and we'll send you a one-click sign-in link, no password needed.\n\nThe LandIt team`,
  };
}

// Mirrors approvedEmail above, one field over — sent when setCompanyStatus
// flips a company from pending/rejected to active (see app/admin/actions.js).
export function companyApprovedEmail({ companyName, contactName, loginUrl }) {
  const firstName = (contactName || "").split(" ")[0] || "there";
  return {
    subject: "You're approved, see your matches on LandIt",
    html: wrapper(`
      <p style="font-size:15px;line-height:1.6;">Hi ${firstName},</p>
      <p style="font-size:15px;line-height:1.6;">Good news: ${companyName || "your"}&rsquo;s LandIt profile has been approved.</p>
      <p style="margin:28px 0;"><a href="${loginUrl}" style="background:#111;color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">Log in to see your matches</a></p>
      <p style="font-size:13px;line-height:1.6;color:#666;">Enter your work email on that page and we'll send you a one-click sign-in link, no password needed.</p>
      <p style="font-size:15px;line-height:1.6;">Speak soon,<br/>The LandIt team</p>
    `),
    text: `Hi ${firstName},\n\nGood news: ${companyName || "your"}'s LandIt profile has been approved. Log in here to see your matches: ${loginUrl}\n\nEnter your work email and we'll send you a one-click sign-in link, no password needed.\n\nThe LandIt team`,
  };
}

// Sent the moment a company swipes interested on a Stage A candidate and
// proposes a first interview time in the same step — see
// companyMatchAndProposeInterview in app/company/dashboard/actions.js. There's
// no separate "you've been matched, go record a pitch" email anymore: the rep
// already recorded their pitch before the company ever saw them (see
// db/schema.js's repDecision/companyDecision comment), so the company saying
// yes always comes bundled with a proposed time.
export function interviewProposedEmailForRep({ fullName, companyName, scheduledAt }) {
  const firstName = (fullName || "").split(" ")[0] || "there";
  const when = scheduledAt ? formatMeetingTime(scheduledAt) : "";
  return {
    subject: `${companyName} proposed an interview time`,
    html: wrapper(`
      <p style="font-size:15px;line-height:1.6;">Hi ${firstName},</p>
      <p style="font-size:15px;line-height:1.6;">Good news: <strong>${companyName}</strong> would like to move forward${when ? ` and has proposed <strong>${when}</strong> (UK time) for a first interview` : " and would like to set up a first interview"}.</p>
      <p style="font-size:15px;line-height:1.6;">Log in to LandIt to confirm it, or suggest a different time if that doesn't work.</p>
      <p style="font-size:15px;line-height:1.6;">Speak soon,<br/>The LandIt team</p>
    `),
    text: `Hi ${firstName},\n\nGood news: ${companyName} would like to move forward${when ? ` and has proposed ${when} (UK time) for a first interview` : " and would like to set up a first interview"}.\n\nLog in to LandIt to confirm it, or suggest a different time if that doesn't work.\n\nThe LandIt team`,
  };
}

// Sent to BOTH sides the moment either one confirms a proposed interview
// time — see sendInterviewConfirmedInvites in lib/meetings.js, which sends
// this once to the rep and once to the company contact (same event, two
// personalized copies) with the same .ics attached to each. That's the
// actual calendar invite; this email is just the human-readable wrapper
// around it.
export function interviewConfirmedEmail({ recipientFirstName, otherPartyName, scheduledAt }) {
  const firstName = recipientFirstName || "there";
  const when = scheduledAt ? formatMeetingTime(scheduledAt) : "";
  return {
    subject: `Interview confirmed with ${otherPartyName}`,
    html: wrapper(`
      <p style="font-size:15px;line-height:1.6;">Hi ${firstName},</p>
      <p style="font-size:15px;line-height:1.6;">Your interview with <strong>${otherPartyName}</strong> is confirmed${when ? ` for <strong>${when}</strong> (UK time)` : ""}. This email is also a calendar invite, both of you are on it, so it should show up as an event on your calendar automatically (accept it below if your calendar app asks).</p>
      <p style="font-size:15px;line-height:1.6;">Speak soon,<br/>The LandIt team</p>
    `),
    text: `Hi ${firstName},\n\nYour interview with ${otherPartyName} is confirmed${when ? ` for ${when} (UK time)` : ""}. This email is also a calendar invite, both of you are on it, so it should show up as an event on your calendar automatically (accept it if your calendar app asks).\n\nThe LandIt team`,
  };
}

export function pitchReadyEmailForCompany({ contactName, companyName }) {
  const firstName = (contactName || "").split(" ")[0] || "there";
  return {
    subject: "Your candidate's pitch is ready to review",
    html: wrapper(`
      <p style="font-size:15px;line-height:1.6;">Hi ${firstName},</p>
      <p style="font-size:15px;line-height:1.6;">Your matched candidate just submitted their pitch. Log in to LandIt to watch it and decide if you'd like to move forward.</p>
      <p style="font-size:15px;line-height:1.6;">Speak soon,<br/>The LandIt team</p>
    `),
    text: `Hi ${firstName},\n\nYour matched candidate just submitted their pitch. Log in to LandIt to watch it and decide if you'd like to move forward.\n\nThe LandIt team`,
  };
}

export function loginLinkEmail({ verifyUrl }) {
  return {
    subject: "Your LandIt sign-in link",
    html: wrapper(`
      <p style="font-size:15px;line-height:1.6;">Here's your one-click sign-in link, it expires in 15 minutes.</p>
      <p style="margin:28px 0;"><a href="${verifyUrl}" style="background:#111;color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">Log in to LandIt</a></p>
      <p style="font-size:13px;line-height:1.6;color:#666;">If you didn't request this, you can safely ignore this email.</p>
    `),
    text: `Here's your one-click sign-in link, it expires in 15 minutes: ${verifyUrl}\n\nIf you didn't request this, you can safely ignore this email.`,
  };
}
