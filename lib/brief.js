// Split out of lib/ai.js on purpose: this file must stay import-safe for
// client components. lib/ai.js pulls in server-only file-reading/parsing
// code (pdf-parse, mammoth) to build CV/document extractions, and any of
// that leaking into a browser bundle breaks the build (those libraries use
// Node built-ins with no browser equivalent). Client components (MatchCard,
// RepDashboard's DiscoverCard) only need what's here to know how to split a
// company brief into labeled sections — pulling it from here instead of
// from lib/ai.js keeps the server-only code out of its bundle entirely.
//
// Rendered as up to three distinct, labeled blocks (split on the blank line
// between paragraphs) rather than one dense wall of text. Both the template
// fallback and the AI prompt in lib/ai.js are written to produce exactly
// this shape so the two paths render identically.
export const BRIEF_SECTION_LABELS = ["The business", "Who you're pitching to", "The deal"];

// Shared by every place a company brief (or, as a one-paragraph fallback,
// a plain ICP string) needs to render as labeled sections instead of a
// single block of prose — see MatchCard.js and RepDashboard.js's
// DiscoverCard. Pairs each paragraph with its label when the shape matches
// exactly (the normal AI/template output); falls back to a single
// unlabeled section for anything that doesn't split cleanly into three
// (an older brief, a hand-edited one, or a plain one-paragraph ICP with no
// blank lines at all) so this never hides content.
export function briefSections(brief) {
  const paragraphs = (brief || "")
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (paragraphs.length === 0) return [];
  if (paragraphs.length === BRIEF_SECTION_LABELS.length) {
    return paragraphs.map((text, i) => ({ label: BRIEF_SECTION_LABELS[i], text }));
  }
  return paragraphs.map((text) => ({ label: null, text }));
}
