// The fixed tag library used for "why you matched" on both the rep and
// company side. Keeping this as a closed list (rather than letting the AI
// invent free-form tags per profile) means a rep's tags and a company's tags
// actually line up with each other, so we can compute a real overlap for a
// match instead of two piles of near-duplicate wording ("Outbound-focused"
// vs "Outbound-heavy" vs "Does outbound").
//
// Deliberately complementary to the existing structured fields (industries,
// tools, deal size, OTE) rather than duplicating them — this covers sales
// motion, segment, deal shape, team culture and rep style, which aren't
// captured anywhere else today.
export const TAG_GROUPS = [
  {
    label: "Sales motion",
    tags: ["Outbound-heavy", "Inbound-heavy", "Channel & partnerships", "Product-led growth"],
  },
  {
    label: "Segment",
    tags: ["Enterprise", "Mid-market", "SMB", "Startup-stage"],
  },
  {
    label: "Deal shape",
    tags: [
      "Short sales cycle",
      "Long sales cycle",
      "Transactional deals",
      "Complex / consultative deals",
      "Technical product",
    ],
  },
  {
    label: "Team & culture",
    tags: [
      "Founder-led sales",
      "Remote-first",
      "Hybrid",
      "In-office",
      "Fast-paced startup",
      "Established scale-up",
    ],
  },
  {
    label: "Rep style",
    tags: [
      "Hunter",
      "Farmer / account management",
      "Relationship builder",
      "Consultative seller",
      "Competitive / target-driven",
      "Self-starter",
      "Coachable / early-career",
    ],
  },
  {
    label: "Other",
    tags: ["Regulated industry experience", "International / cross-border"],
  },
];

export const TAG_LIBRARY = TAG_GROUPS.flatMap((g) => g.tags);

// Filters a list of candidate tags (e.g. from an AI extraction) down to only
// ones that are actually in the fixed library — guards against a model
// hallucinating a tag that isn't in the closed vocabulary, which would
// otherwise silently break the "shared vocabulary" guarantee this whole
// system depends on.
export function sanitizeTags(candidates) {
  if (!Array.isArray(candidates)) return [];
  const valid = new Set(TAG_LIBRARY);
  return [...new Set(candidates.filter((t) => valid.has(t)))];
}

// The tags a rep's profile and a company's profile have in common — the
// default, editable starting point for a match's rep/company-facing
// "why you matched" chips.
export function overlapTags(tagsA = [], tagsB = []) {
  const setB = new Set(tagsB || []);
  return (tagsA || []).filter((t) => setB.has(t));
}
