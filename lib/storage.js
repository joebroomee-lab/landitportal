import { randomUUID } from "crypto";

// File storage for onboarding uploads (CVs, job descriptions, logos, etc).
// On Netlify, @netlify/blobs works with zero config — the Next.js Runtime
// injects the site context automatically, no env vars to set up. Locally
// (this sandbox, or anyone running `next dev`/`next start` outside Netlify)
// that context doesn't exist and getStore() throws, so we fall back to
// writing straight to disk under .local-blobs/ — same fallback pattern used
// for the database (db/index.js) and email (lib/email.js): local dev stays
// fully testable without any extra setup, production just works once
// deployed.
const LOCAL_DIR = process.cwd() + "/.local-blobs";

async function getBlobStore() {
  const { getStore } = await import("@netlify/blobs");
  return getStore({ name: "uploads", consistency: "strong" });
}

export function newFileKey(filename) {
  const ext = (filename?.split(".").pop() || "").toLowerCase().slice(0, 10);
  const id = randomUUID();
  return ext ? `${id}.${ext}` : id;
}

export async function putFile(key, buffer, contentType) {
  try {
    const store = await getBlobStore();
    await store.set(key, buffer, { metadata: { contentType } });
    return { backend: "blobs" };
  } catch (e) {
    // Falls back to local disk whenever Netlify Blobs isn't configured
    // (i.e. we're not actually running on Netlify) — never blocks an
    // upload either way. NOTE: on Netlify itself, disk here is the
    // function's own ephemeral /tmp-like filesystem — it is NOT shared
    // between separate function invocations/containers, so a file written
    // via this fallback in production may not be readable back later. If
    // this branch is hit in production logs, that's the real bug: Blobs
    // isn't configuring itself the way it's supposed to.
    console.error(`putFile: @netlify/blobs getStore()/set() failed for key "${key}", using disk fallback`, e);
    const fs = await import("fs/promises");
    await fs.mkdir(LOCAL_DIR, { recursive: true });
    await fs.writeFile(`${LOCAL_DIR}/${key}`, buffer);
    await fs.writeFile(`${LOCAL_DIR}/${key}.meta.json`, JSON.stringify({ contentType }));
    return { backend: "disk" };
  }
}

export async function getFile(key) {
  try {
    const store = await getBlobStore();
    const result = await store.getWithMetadata(key, { type: "arrayBuffer" });
    if (!result) {
      console.error(`getFile: no blob found for key "${key}" (store returned null)`);
      return null;
    }
    return {
      buffer: Buffer.from(result.data),
      contentType: result.metadata?.contentType || "application/octet-stream",
    };
  } catch (e) {
    console.error(`getFile: blobs read threw for key "${key}", falling back to disk`, e);
    try {
      const fs = await import("fs/promises");
      const buffer = await fs.readFile(`${LOCAL_DIR}/${key}`);
      let contentType = "application/octet-stream";
      try {
        const meta = JSON.parse(await fs.readFile(`${LOCAL_DIR}/${key}.meta.json`, "utf8"));
        contentType = meta.contentType || contentType;
      } catch {
        // no sidecar metadata file — fall back to the generic content type
      }
      return { buffer, contentType };
    } catch (e2) {
      console.error(`getFile: disk fallback also failed for key "${key}"`, e2);
      return null;
    }
  }
}
