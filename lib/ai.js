import { INDUSTRIES, TOOLS, DEAL_SIZES, OTE_RANGES, COMPANY_SIZES, SENIORITY_LEVELS, HIRING_TIMELINES } from "@/lib/constants";
import { TAG_LIBRARY, sanitizeTags, overlapTags } from "@/lib/tags";
import { docxToText, pdfToText } from "@/lib/file-text";
import { BRIEF_SECTION_LABELS } from "@/lib/brief";

// Claude 3.5 Sonnet/Haiku (the models this file originally targeted) have
// since been retired on the standard API — these are their current
// replacements. Both support native PDF + image input via the Messages API.
const EXTRACT_MODEL = "claude-sonnet-5"; // higher-accuracy structured extraction from documents
const BRIEF_MODEL = "claude-haiku-4-5"; // cheap, text-only, low stakes

// ---------------------------------------------------------------------------
// Company brief — shown to the rep before they record their bespoke video.
// ---------------------------------------------------------------------------
// BRIEF_SECTION_LABELS itself now lives in lib/brief.js, not here — see that
// file for why. Both the template fallback below and the AI prompt further
// down are written to produce exactly the 3-paragraph shape that constant
// describes, so the two paths render identically in MatchCard.

function templateBrief(company) {
  const article = /^[aeiou]/i.test(company.roleTitle || "") ? "an" : "a";
  const business = [
    `${company.companyName} is hiring${company.roleTitle ? ` ${article} ${company.roleTitle}` : ""}${
      company.seniority && company.seniority !== company.roleTitle ? ` (${company.seniority})` : ""
    }.`,
    company.industry ? `They operate in ${company.industry}.` : "",
    company.notes || "",
  ]
    .filter(Boolean)
    .join(" ");

  const icp = company.icp
    ? `${company.icp}`
    : "No ICP details on file yet, ask your LandIt contact before you record.";

  const deal = [
    company.dealSize ? `Typical deal size: ${company.dealSize}.` : "",
    company.ote ? `OTE for this role: ${company.ote}.` : "",
  ]
    .filter(Boolean)
    .join(" ") || "No deal-size details on file yet.";

  return [business, icp, deal].join("\n\n");
}

// If ANTHROPIC_API_KEY isn't set, or the call fails for any reason, this
// falls back to a plain template built from the same fields — match
// creation never breaks and the field is never left empty, it just isn't
// AI-written until the key is added.
export async function generateCompanySummary(company) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return templateBrief(company);

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: BRIEF_MODEL,
        max_tokens: 320,
        messages: [
          {
            role: "user",
            content: `Write a brief for a B2B salesperson who has just been matched with this company for a role. Their next step is to record a 60-second video PITCHING THIS COMPANY'S PRODUCT to its ideal customer (not pitching themselves for the job), so the brief has to give them enough to actually sell it.\n\nReturn EXACTLY three short paragraphs, in this order, separated by a single blank line, and nothing else (no headers, no labels, no bullet points, no markdown):\n1. One or two sentences on who the company is and what they sell.\n2. Two or three sentences on who the rep is pitching to (the ICP), what that buyer's job looks like and what they're frustrated by. This is the most important paragraph; write it like a briefing note, not a summary.\n3. One short sentence on deal size and OTE for this role, if known.\n\nWriting style: plain sentences only. Never use an em dash (—) or en dash (–) anywhere — use a comma, full stop, or plain hyphen instead.\n\nCompany details:\nName: ${company.companyName}\nIndustry: ${company.industry || "n/a"}\nRole being hired: ${company.roleTitle || "n/a"}\nWho they sell to (ICP): ${company.icp || "n/a"}\nDeal size: ${company.dealSize || "n/a"}\nOTE: ${company.ote || "n/a"}\nInternal notes: ${company.notes || "n/a"}`,
          },
        ],
      }),
    });
    if (!res.ok) return templateBrief(company);
    const data = await res.json();
    const text = data?.content?.find((b) => b.type === "text")?.text?.trim();
    return text ? stripDashes(text) : templateBrief(company);
  } catch {
    return templateBrief(company);
  }
}

// Belt-and-suspenders on top of the "don't use dashes" prompt instructions
// used everywhere AI-generated text reaches a screen: models don't always
// follow style instructions perfectly, and an em/en dash slipping through
// reads immediately as "AI wrote this" — so every generated string gets run
// through this before it's returned, regardless of what the prompt asked
// for. Em dash becomes a comma (closest to how it's usually used
// mid-sentence); en dash becomes a plain hyphen (its usual role in ranges).
function stripDashes(text) {
  if (typeof text !== "string") return text;
  return text.replace(/\s*—\s*/g, ", ").replace(/–/g, "-");
}

// ---------------------------------------------------------------------------
// Match reasoning — the short "why you matched" text admin previews before
// creating a match, then shown on each side's swipe card (see matches.
// matchReasonForRep / matchReasonForCompany in db/schema.js). Distinct from
// generateCompanySummary above, which is longer and only shown once a match
// is confirmed, to help the rep actually pitch the product.
// ---------------------------------------------------------------------------

function templateMatchReasons(rep, company) {
  const repFirstName = rep.fullName?.split(" ")[0] || "This rep";
  const shared = overlapTags(rep.tags, company.tags);
  const roleTitle = company.roleTitle || "this role";

  const repBits = [
    rep.dealSize ? `experience closing ${rep.dealSize} deals` : "",
    (rep.industries || [])[0] ? `time selling into ${rep.industries[0]}` : "",
  ].filter(Boolean);
  const reasonForRep = [
    `${company.companyName} is hiring for ${roleTitle}${company.industry ? ` in ${company.industry}` : ""}.`,
    repBits.length ? `Your ${repBits.join(" and ")} lines up well with what they need.` : "",
    shared.length ? `You both share: ${shared.slice(0, 3).join(", ")}.` : "",
  ]
    .filter(Boolean)
    .join(" ");

  const companyBits = [
    rep.dealSize ? `${rep.dealSize} deals` : "",
    (rep.industries || [])[0] || "",
  ].filter(Boolean);
  const reasonForCompany = [
    `${repFirstName} has ${rep.jobTitle ? `background as ${rep.jobTitle.toLowerCase()}` : "relevant sales experience"}${
      companyBits.length ? `, with ${companyBits.join(" and ")}` : ""
    }.`,
    shared.length ? `Shared strengths: ${shared.slice(0, 3).join(", ")}.` : "",
  ]
    .filter(Boolean)
    .join(" ");

  return { reasonForRep, reasonForCompany };
}

const MATCH_REASON_SCHEMA = {
  type: "object",
  properties: {
    reasonForRep: {
      type: "string",
      description:
        "2-3 short, punchy sentences, written directly to the rep (second person, 'you'), explaining specifically why this company/role could be a great fit for their background. Each sentence stands on its own as a distinct reason, since this renders as a bullet list, one point per sentence.",
    },
    reasonForCompany: {
      type: "string",
      description:
        "2-3 short, punchy sentences, written directly to the company (second person, 'you'), explaining specifically why this rep could be a great fit for their role. Each sentence stands on its own as a distinct reason, since this renders as a bullet list, one point per sentence.",
    },
  },
  required: ["reasonForRep", "reasonForCompany"],
};

// Admin generates this once per pair, previews it, and can regenerate before
// actually creating the match — see previewMatchReasons in
// app/admin/matches/actions.js. Falls back to a plain template built from
// shared tags/fields if no API key is set or the call fails, same fail-safe
// pattern as generateCompanySummary.
export async function generateMatchReasons(rep, company) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return templateMatchReasons(rep, company);

  const summary = `Rep profile:\nName: ${rep.fullName}\nCurrent/recent role: ${rep.jobTitle || rep.notInSalesCategory || "n/a"}\nDeal size: ${rep.dealSize || "n/a"}\nOTE: ${rep.ote || "n/a"}\nIndustries sold into: ${(rep.industries || []).join(", ") || "n/a"}\nTools: ${(rep.tools || []).join(", ") || "n/a"}\nTags: ${(rep.tags || []).join(", ") || "n/a"}\nBio: ${rep.bio || "n/a"}\n\nCompany profile:\nName: ${company.companyName}\nIndustry: ${company.industry || "n/a"}\nRole being hired: ${company.roleTitle || "n/a"}\nSeniority: ${company.seniority || "n/a"}\nDeal size: ${company.dealSize || "n/a"}\nOTE: ${company.ote || "n/a"}\nWho they sell to (ICP): ${company.icp || "n/a"}\nTools: ${(company.tools || []).join(", ") || "n/a"}\nTags: ${(company.tags || []).join(", ") || "n/a"}`;

  const result = await callExtractTool({
    toolName: "match_reasons",
    description: "Writes two short, specific explanations for why a sales rep and a hiring company are a good match for each other.",
    schema: MATCH_REASON_SCHEMA,
    contentBlocks: [{ type: "text", text: summary }],
    instructions:
      "Based on the rep and company profiles above, write two short, specific, plain-English reasons this could be a good match, one addressed to the rep and one addressed to the company. Reference actual specifics from their profiles (deal size, industry, tools, tags) rather than generic praise. Write 2-3 short sentences each, one distinct reason per sentence, since this is shown to the reader as a bullet list (one bullet per sentence), not a paragraph, so avoid long compound sentences joined with commas or 'and'; keep each sentence short enough to read as a single point at a glance. Never use an em dash (—) or en dash (–) anywhere, use a comma, full stop, or plain hyphen instead.",
  });

  if (!result.ok) return templateMatchReasons(rep, company);

  const d = result.data;
  const fallback = templateMatchReasons(rep, company);
  return {
    reasonForRep: typeof d.reasonForRep === "string" && d.reasonForRep.trim() ? stripDashes(d.reasonForRep.trim()) : fallback.reasonForRep,
    reasonForCompany:
      typeof d.reasonForCompany === "string" && d.reasonForCompany.trim() ? stripDashes(d.reasonForCompany.trim()) : fallback.reasonForCompany,
  };
}

// ---------------------------------------------------------------------------
// Onboarding file -> draft profile extraction (CVs for reps; JDs/company
// info/decks/etc for companies). Shared plumbing, two thin wrappers below.
// ---------------------------------------------------------------------------

// Returns both the content blocks for the Claude prompt AND a plain-text
// concatenation of everything readable (rawText) — the latter isn't sent
// anywhere, it's kept purely as a deterministic backstop (see
// findContactInfo below) for fields a regex can find more reliably than a
// model can be trusted to always surface.
async function buildContentBlocks(files) {
  const blocks = [];
  const rawTextParts = [];
  for (const f of files) {
    if (f.contentType === "application/pdf") {
      blocks.push({
        type: "document",
        source: { type: "base64", media_type: "application/pdf", data: f.buffer.toString("base64") },
      });
      const text = await pdfToText(f.buffer);
      if (text.trim()) rawTextParts.push(text);
    } else if (f.contentType.startsWith("image/")) {
      blocks.push({
        type: "image",
        source: { type: "base64", media_type: f.contentType, data: f.buffer.toString("base64") },
      });
      // No text-layer equivalent for a photo/scan — the model is the only
      // way to read one, so there's no regex backstop for this file type.
    } else if (
      f.contentType === "application/msword" ||
      f.contentType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
      let text = "";
      try {
        text = await docxToText(f.buffer);
      } catch (e) {
        console.error(`buildContentBlocks: couldn't read "${f.filename}" as a Word doc`, e);
      }
      if (text.trim()) {
        blocks.push({ type: "text", text: `--- File: ${f.filename} ---\n${text}` });
        rawTextParts.push(text);
      }
    } else {
      // text/plain, text/markdown
      const text = f.buffer.toString("utf8");
      blocks.push({ type: "text", text: `--- File: ${f.filename} ---\n${text}` });
      rawTextParts.push(text);
    }
  }
  return { blocks, rawText: rawTextParts.join("\n\n") };
}

// Deterministic backstop for a rep's email/phone: a model occasionally
// leaves these off a CV extraction even when they're right there in a
// header (contact details on someone else's document seem to get treated
// with more caution than the rest of a CV) — but an email address and a
// phone number both follow predictable-enough patterns that a plain regex
// finds them far more reliably than asking a model to. This never overrides
// a value the model DID return (see extractRepProfileFromFiles) — it only
// fills the gap when the model came back empty-handed.
function findContactInfo(rawText) {
  if (!rawText) return { email: null, phone: null };
  const emailMatch = rawText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  // UK-leaning (the app is UK-only today) but permissive enough to also
  // catch a +44 written out, or a plain 11-digit mobile with spaces/dashes.
  const phoneMatch = rawText.match(/(?:\+44\s?|0)(?:[\d][\s-]?){9,10}\d/);
  return {
    email: emailMatch ? emailMatch[0] : null,
    phone: phoneMatch ? phoneMatch[0].trim() : null,
  };
}

async function callExtractTool({ toolName, description, schema, contentBlocks, instructions }) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error("callExtractTool: ANTHROPIC_API_KEY is not set in this function's environment");
    return { ok: false, reason: "no_api_key" };
  }
  if (contentBlocks.length === 0) {
    console.error("callExtractTool: buildContentBlocks() returned zero blocks — nothing to send");
    return { ok: false, reason: "no_readable_content" };
  }

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: EXTRACT_MODEL,
        max_tokens: 1200,
        tools: [{ name: toolName, description, input_schema: schema }],
        tool_choice: { type: "tool", name: toolName },
        messages: [
          {
            role: "user",
            content: [...contentBlocks, { type: "text", text: instructions }],
          },
        ],
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error(`callExtractTool: Anthropic returned ${res.status}`, body);
      return { ok: false, reason: "provider_error" };
    }

    const data = await res.json();
    const toolUse = data?.content?.find((b) => b.type === "tool_use" && b.name === toolName);
    if (!toolUse) {
      console.error("callExtractTool: no tool_use block in Anthropic's response", JSON.stringify(data));
      return { ok: false, reason: "no_tool_use" };
    }
    return { ok: true, data: toolUse.input || {} };
  } catch (e) {
    console.error("callExtractTool: request failed", e);
    return { ok: false, reason: "network_error" };
  }
}

// Only keeps a value if it's actually one of the allowed options — guards
// against the model drifting off the enum despite the schema constraint.
function pickEnum(value, allowed) {
  return typeof value === "string" && allowed.includes(value) ? value : null;
}

const REP_TOOL_SCHEMA = {
  type: "object",
  properties: {
    fullName: { type: "string" },
    email: { type: "string", description: "Their email address, if one appears on the CV" },
    phone: { type: "string", description: "Their phone number, if one appears on the CV" },
    jobTitle: { type: "string", description: "Their current or most recent job title" },
    inSales: { type: "boolean", description: "True if their most recent role is a B2B sales role" },
    location: { type: "string" },
    linkedinUrl: { type: "string" },
    industries: { type: "array", items: { type: "string", enum: INDUSTRIES } },
    tools: { type: "array", items: { type: "string", enum: TOOLS } },
    dealSize: { type: "string", enum: DEAL_SIZES },
    bio: {
      type: "string",
      description: "A sharp 2-3 sentence first-person-style bio for their profile, written from the CV",
    },
    tags: { type: "array", items: { type: "string", enum: TAG_LIBRARY } },
  },
};

export async function extractRepProfileFromFiles(files) {
  const { blocks: contentBlocks, rawText } = await buildContentBlocks(files);
  const result = await callExtractTool({
    toolName: "extract_rep_profile",
    description: "Extracts a sales rep's profile fields from their CV/resume.",
    schema: REP_TOOL_SCHEMA,
    contentBlocks,
    instructions:
      "This is a candidate's own CV/resume, which they've voluntarily uploaded to pre-fill their own profile on a B2B sales talent marketplace they're signing up for — extracting their contact details back to them is expected and required, not a privacy concern. Extract every field you can. Always include their email address and phone number if either appears anywhere on the CV (e.g. a header or contact section) — don't skip these, they're the most important fields to get right. Only choose from the allowed enum options given in the schema. For `tools`: note that \"Apollo\" in the list means the sales tool Apollo.io — never match it against a company name like \"Apollo GraphQL\"; if no tool is explicitly named but the role is a quota-carrying B2B/SaaS sales job, it's reasonable to infer the most likely CRM (usually Salesforce or HubSpot) rather than leaving it blank, since this is just a draft the candidate reviews and can correct. For `tags`, pick 3-6 from the given list that best describe their sales motion, segment, deal shape and style — infer from strong indirect evidence (e.g. heavy cold-calling and quota language implies \"Hunter\" and \"Competitive / target-driven\"; selling a technical product to engineers implies \"Technical product\"), not only exact keyword matches, but don't invent anything the CV doesn't support. Never use an em dash (—) or en dash (–) anywhere in the bio text you write — use a comma, full stop, or plain hyphen instead.",
  });

  // A model can leave email/phone off a CV extraction even when they're
  // right there in the header — contact details on someone else's document
  // seem to get treated with more caution than the rest of a CV. Since
  // those two fields follow predictable patterns, a plain regex over the
  // file's raw text is run as a backstop regardless of whether the AI call
  // itself succeeded, and only fills in what the model didn't already find.
  const contact = findContactInfo(rawText);

  if (!result.ok) {
    const fields = { email: contact.email, phone: contact.phone };
    const foundSomething = Boolean(contact.email || contact.phone);
    return { fields, ok: foundSomething, reason: result.reason };
  }

  const d = result.data;
  // Loosely validated rather than trusted outright — the model can
  // occasionally hallucinate a plausible-looking value here, and a wrong
  // email/phone silently overwriting what the rep types is worse than just
  // leaving the field for them to fill in.
  const aiEmail = typeof d.email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email.trim()) ? d.email.trim() : null;
  const aiPhone = typeof d.phone === "string" && d.phone.replace(/[^0-9]/g, "").length >= 7 ? d.phone.trim() : null;

  return {
    ok: true,
    fields: {
      fullName: typeof d.fullName === "string" ? d.fullName : null,
      email: aiEmail || contact.email,
      phone: aiPhone || contact.phone,
      jobTitle: typeof d.jobTitle === "string" ? d.jobTitle : null,
      inSales: typeof d.inSales === "boolean" ? d.inSales : null,
      location: typeof d.location === "string" ? d.location : null,
      linkedinUrl: typeof d.linkedinUrl === "string" ? d.linkedinUrl : null,
      industries: Array.isArray(d.industries) ? d.industries.filter((v) => INDUSTRIES.includes(v)) : [],
      tools: Array.isArray(d.tools) ? d.tools.filter((v) => TOOLS.includes(v)) : [],
      dealSize: pickEnum(d.dealSize, DEAL_SIZES),
      bio: typeof d.bio === "string" ? stripDashes(d.bio) : null,
      tags: sanitizeTags(d.tags),
    },
  };
}

const COMPANY_TOOL_SCHEMA = {
  type: "object",
  properties: {
    companyName: { type: "string" },
    industry: { type: "string", enum: INDUSTRIES },
    companySize: { type: "string", enum: COMPANY_SIZES },
    roleTitle: { type: "string", description: "The role they're hiring for, if a job description was included" },
    seniority: { type: "string", enum: SENIORITY_LEVELS },
    dealSize: { type: "string", enum: DEAL_SIZES },
    ote: { type: "string", enum: OTE_RANGES },
    tools: { type: "array", items: { type: "string", enum: TOOLS } },
    timeline: { type: "string", enum: HIRING_TIMELINES },
    icp: {
      type: "string",
      description: "Who this company sells to — their ideal customer profile, 1-2 sentences",
    },
    notes: {
      type: "string",
      description: "A synthesized summary of their hiring thesis, values, and anything useful for matching a rep to them — a short paragraph",
    },
    tags: { type: "array", items: { type: "string", enum: TAG_LIBRARY } },
  },
};

export async function extractCompanyProfileFromFiles(files) {
  const { blocks: contentBlocks } = await buildContentBlocks(files);
  const result = await callExtractTool({
    toolName: "extract_company_profile",
    description: "Extracts a hiring company's profile fields from their uploaded documents.",
    schema: COMPANY_TOOL_SCHEMA,
    contentBlocks,
    instructions:
      "These are documents from a company signing up to hire a B2B sales rep through a matching marketplace, which could include a job description, company overview, hiring thesis, values doc, or articles about the company. Extract their profile fields. Only choose from the allowed enum options given in the schema, and if nothing fits well, omit that field rather than guessing. Pay special attention to `icp` (who they actually sell their product to) since that's used later to brief the matched rep on how to pitch the business. For tags, pick 2-6 from the given list that best describe this company's sales motion, segment, deal shape and culture, inferring from strong indirect evidence where reasonable, not only exact keyword matches. Never use an em dash (—) or en dash (–) anywhere in the text you write, such as `notes` or `icp` — use a comma, full stop, or plain hyphen instead.",
  });

  if (!result.ok) return { fields: {}, ok: false, reason: result.reason };

  const d = result.data;
  return {
    ok: true,
    fields: {
      companyName: typeof d.companyName === "string" ? d.companyName : null,
      industry: pickEnum(d.industry, INDUSTRIES),
      companySize: pickEnum(d.companySize, COMPANY_SIZES),
      roleTitle: typeof d.roleTitle === "string" ? d.roleTitle : null,
      seniority: pickEnum(d.seniority, SENIORITY_LEVELS),
      dealSize: pickEnum(d.dealSize, DEAL_SIZES),
      ote: pickEnum(d.ote, OTE_RANGES),
      tools: Array.isArray(d.tools) ? d.tools.filter((v) => TOOLS.includes(v)) : [],
      timeline: pickEnum(d.timeline, HIRING_TIMELINES),
      icp: typeof d.icp === "string" ? stripDashes(d.icp) : null,
      notes: typeof d.notes === "string" ? stripDashes(d.notes) : null,
      tags: sanitizeTags(d.tags),
    },
  };
}
