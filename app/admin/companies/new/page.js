import Link from "next/link";
import CompanyForm from "@/components/CompanyForm";

export const metadata = { title: "Add company - LandIt Admin" };

export default function NewCompanyPage() {
  return (
    <div className="max-w-2xl">
      <Link
        href="/admin/companies"
        className="mb-6 inline-block text-sm text-[var(--text-dim)] hover:text-[var(--cyan)]"
      >
        ← Back to Companies
      </Link>
      <h1 className="mb-1 text-2xl font-semibold text-[var(--text)]">Add a company</h1>
      <p className="mb-8 text-sm text-[var(--text-dim)]">
        Company self-signup is coming in a later phase. For now, add companies here as you bring
        them on so you can start matching them with reps.
      </p>
      <CompanyForm />
    </div>
  );
}
