import { headers } from "next/headers";

// Builds an absolute site URL for links inside emails (server actions have
// no browser "window.location" to read). Netlify injects URL automatically
// for every deploy (production + previews), so that's the primary source;
// falling back to the incoming request's own host header covers any
// environment where it isn't set, and localhost covers local dev.
export async function getSiteUrl() {
  if (process.env.URL) return process.env.URL;

  try {
    const h = await headers();
    const host = h.get("host");
    if (host) {
      const proto = host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https";
      return `${proto}://${host}`;
    }
  } catch {
    // headers() throws outside a request context — fall through to default.
  }

  return "http://localhost:3000";
}
