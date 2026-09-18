import { TAG_GROUPS } from "@/lib/tags";

// Plain server-rendered checkbox form for editing a rep's or company's fixed
// tag set from an admin detail page — same "chip:has(input:checked)"
// checkbox-as-chip trick CompanyForm already uses for its tools field, so no
// client component/JS is needed here.
export default function TagEditor({ action, id, selected = [] }) {
  return (
    <form action={action.bind(null, id)} className="space-y-4">
      {TAG_GROUPS.map((group) => (
        <div key={group.label}>
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-faint)]">
            {group.label}
          </div>
          <div className="flex flex-wrap gap-2">
            {group.tags.map((tag) => (
              <label key={tag} className="chip cursor-pointer">
                <input type="checkbox" name="tags" value={tag} defaultChecked={selected.includes(tag)} className="hidden" />
                {tag}
              </label>
            ))}
          </div>
        </div>
      ))}
      <button type="submit" className="btn btn-ghost" style={{ padding: "8px 18px", fontSize: 13 }}>
        Save tags
      </button>
    </form>
  );
}
