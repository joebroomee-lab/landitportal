import { NextResponse } from "next/server";
import { getFile } from "@/lib/storage";

export const dynamic = "force-dynamic";

// Lets admin open an onboarding upload (CV, JD, logo, etc) directly by its
// storage key — e.g. linked from the rep/company detail page. Keys are
// random UUIDs with no directory listing, so this isn't locked behind admin
// auth for the same reason the rest of /admin isn't yet (see delivery notes
// on that gap) — anyone with a specific key can fetch that one file, nothing
// else.
export async function GET(request, { params }) {
  const { key } = await params;
  const file = await getFile(key);
  if (!file) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return new NextResponse(file.buffer, {
    headers: {
      "content-type": file.contentType,
      "cache-control": "private, max-age=3600",
    },
  });
}
