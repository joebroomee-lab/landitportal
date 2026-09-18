import { Suspense } from "react";
import CompanyLoginForm from "@/components/CompanyLoginForm";

export const metadata = { title: "Log in - LandIt" };

export default function CompanyLoginPage() {
  return (
    <Suspense>
      <CompanyLoginForm />
    </Suspense>
  );
}
