// Pulls plain text out of a Word doc so it can go into a Claude prompt as a
// text block. Claude reads PDFs and images natively via the Messages API's
// document/image content blocks (see lib/ai.js) so this isn't needed to
// build the prompt itself — but there's no equivalent native support for
// .doc/.docx, so those need converting to text first. mammoth is pure JS (no
// native/binary deps), which matters here since this runs inside a Netlify
// Function.
export async function docxToText(buffer) {
  const mammoth = await import("mammoth");
  const result = await mammoth.extractRawText({ buffer });
  return result.value || "";
}

// Separately, a plain-text copy of a PDF is used as a deterministic backstop
// for a handful of fields (email, phone — see findContactInfo in lib/ai.js)
// that a plain regex can find far more reliably than asking a model to
// transcribe them, and which models occasionally omit from CV extractions
// even when clearly present (contact details on a stranger's document seem
// to sometimes get treated with more caution than other CV fields). Best
// effort: returns "" on any failure rather than throwing, since this is a
// backstop, not the primary extraction path.
export async function pdfToText(buffer) {
  try {
    // Deliberately pinned to pdf-parse@1.x rather than the current major:
    // the newer version pulls in pdfjs-dist's worker-thread architecture,
    // which tries to load a worker script by path at runtime — that path
    // doesn't survive Next.js's bundling (Turbopack/webpack rewrite module
    // paths into chunks), so it fails inside the actual app even though it
    // works fine as a standalone Node script. 1.x parses synchronously on
    // the main thread with no worker file to resolve, which is exactly what
    // a short-lived serverless function needs anyway.
    // Importing "pdf-parse" itself (its index.js) is deliberately avoided:
    // that file has a `!module.parent` check meant to detect "was this run
    // directly, not required as a dependency" and, if so, runs a debug demo
    // that opens a hardcoded sample PDF from its own test fixtures. Under
    // Next.js's bundler that check misfires (bundled modules don't have a
    // normal CommonJS parent chain), so it always took the debug branch and
    // crashed looking for a file that doesn't exist here. Importing the
    // inner implementation module directly skips that check entirely.
    const pdfParseModule = await import("pdf-parse/lib/pdf-parse.js");
    const pdfParse = pdfParseModule.default || pdfParseModule;
    const result = await pdfParse(buffer);
    return result?.text || "";
  } catch (e) {
    console.error("pdfToText: failed to extract text from PDF", e);
    return "";
  }
}
