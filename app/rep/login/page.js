import { Suspense } from "react";
import RepLoginForm from "@/components/RepLoginForm";

export const metadata = { title: "Log in - LandIt" };

export default function RepLoginPage() {
  return (
    <Suspense>
      <RepLoginForm />
    </Suspense>
  );
}
