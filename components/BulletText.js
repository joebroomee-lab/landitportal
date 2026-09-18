import { splitSentences } from "@/lib/text";

// Renders short AI-written (or templated) prose — a "why this could be a
// fit" reason, a brief section — as a tight, scannable list of points
// instead of a dense paragraph. Splits on sentence boundaries (see
// lib/text.js) and falls back to a plain paragraph for anything that's
// already just one sentence, so this never looks like a broken single-item
// list on short text.
//
// `tone` picks the text color rather than taking it via `className`, since
// two conflicting Tailwind text-color utilities can't be reliably ordered
// by string concatenation — "dim" (default) matches most body copy, "bright"
// matches the handful of spots (e.g. the cyan-tinted "why this company" box)
// that use the brighter --text color instead.
export default function BulletText({ text, className = "", tone = "dim" }) {
  if (!text) return null;
  const points = splitSentences(text);
  const toneClass = tone === "bright" ? "text-[var(--text)]" : "text-[var(--text-dim)]";

  if (points.length <= 1) {
    return <p className={`text-sm leading-relaxed ${toneClass} ${className}`}>{text}</p>;
  }

  return (
    <ul className={`space-y-2 ${className}`}>
      {points.map((point, i) => (
        <li key={i} className={`flex items-start gap-2.5 text-sm leading-relaxed ${toneClass}`}>
          <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-[var(--cyan)]" />
          <span>{point}</span>
        </li>
      ))}
    </ul>
  );
}
