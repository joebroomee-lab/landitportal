import { NextResponse } from "next/server";
import { newFileKey, putFile } from "@/lib/storage";

export const dynamic = "force-dynamic";

// Onboarding uploads (CVs, job descriptions, company decks, logos, articles)
// go through this single endpoint rather than being embedded in a Server
// Action's own payload. Server Actions ship their whole argument as one JSON
// body through the same function-invocation path everything else on Netlify
// uses, which has a real request-size ceiling — a couple of PDFs would blow
// past it easily, worse once base64-encoded into JSON. A plain multipart
// POST avoids that encoding overhead and keeps each file's upload
// independent, so one big file failing doesn't take the others down with it.
const MAX_BYTES = 8 * 1024 * 1024; // 8MB per file

const ALLOWED_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/png",
  "image/jpeg",
  "image/webp",
  "text/plain",
  "text/markdown",
]);

export async function POST(request) {
  let formData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Couldn't read the upload." }, { status: 400 });
  }

  const file = formData.get("file");
  if (!file || typeof file === "string") {
    return NextResponse.json({ error: "No file provided." }, { status: 400 });
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: `"${file.name}" is over the 8MB limit, try a smaller file.` },
      { status: 413 }
    );
  }

  const contentType = file.type || "application/octet-stream";
  // Some browsers/OSes send a blank or generic type for .docx/.md — fall
  // back to sniffing the extension so a real file isn't rejected on a
  // technicality.
  const ext = (file.name?.split(".").pop() || "").toLowerCase();
  const extFallback = { doc: "application/msword", docx: ALLOWED_TYPES.has(contentType) ? contentType : "application/vnd.openxmlformats-officedocument.wordprocessingml.document", md: "text/markdown", txt: "text/plain" };

  const resolvedType = ALLOWED_TYPES.has(contentType) ? contentType : extFallback[ext];

  if (!resolvedType || !ALLOWED_TYPES.has(resolvedType)) {
    return NextResponse.json(
      { error: `"${file.name}" isn't a supported file type. Use PDF, Word, an image, or a text file.` },
      { status: 415 }
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const key = newFileKey(file.name);

  try {
    await putFile(key, buffer, resolvedType);
  } catch (e) {
    console.error("upload: putFile failed", e);
    return NextResponse.json({ error: "Upload failed, please try again." }, { status: 500 });
  }

  return NextResponse.json({
    key,
    filename: file.name,
    contentType: resolvedType,
    size: buffer.length,
  });
}
