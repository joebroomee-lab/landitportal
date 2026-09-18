// Splits short AI-written (or templated) prose into clean, scannable bullet
// points, used wherever a "why this matches" reason or brief paragraph would
// otherwise read as a dense wall of text (see BulletText.js). Deliberately a
// simple heuristic, not a full sentence tokenizer, since it only ever runs on
// short, plain-sentence copy: every AI prompt that feeds this content is
// already instructed to write "plain sentences only" (see lib/ai.js), so
// splitting on sentence-ending punctuation followed by a capital letter,
// digit, or currency symbol is reliable enough in practice.
export function splitSentences(text) {
  if (typeof text !== "string") return [];
  const trimmed = text.trim();
  if (!trimmed) return [];
  const parts = trimmed
    .split(/(?<=[.!?])\s+(?=[A-Z0-9£$])/)
    .map((s) => s.trim())
    .filter(Boolean);
  return parts.length > 0 ? parts : [trimmed];
}
