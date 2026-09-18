import * as schema from "./schema.js";

// In production on Netlify, NETLIFY_DB_URL is injected automatically once
// the Netlify Database extension is provisioned for this site.
//
// We deliberately do NOT use drizzle-orm's drizzle-orm/netlify-db adapter
// here, even though it's the "zero config" option Netlify points you to.
// The installed drizzle-orm version (1.0.0-rc.4 — still a pre-release, no
// stable 1.0 exists yet) has a real bug in that adapter: its prepareQuery()
// calls the Neon client as a bare function (this.httpClient(sql, params,
// opts)) instead of going through its .query() method, which Neon's client
// only permits in tagged-template mode. Every non-trivial query (any
// INSERT/SELECT with parameters — i.e. all of them) throws "This function
// can now be called only as a tagged-template function...". Confirmed by
// reading node_modules/drizzle-orm/netlify-db/session.js directly.
//
// drizzle-orm/neon-http talks to the exact same Neon HTTP endpoint via the
// same @neondatabase/serverless client, but its session.js correctly does
// `this.client.query ?? this.client` before calling — so we use that
// instead. If a future drizzle-orm release fixes the netlify-db adapter,
// switching back is a one-line change.
//
// For local development in environments without NETLIFY_DB_URL (e.g. this
// sandbox), we fall back to a plain local Postgres via DATABASE_URL so the
// app is fully testable before it's ever deployed.
async function createDb() {
  if (process.env.NETLIFY_DB_URL) {
    const { drizzle } = await import("drizzle-orm/neon-http");
    return drizzle({ connection: process.env.NETLIFY_DB_URL, schema });
  }

  const { drizzle } = await import("drizzle-orm/node-postgres");
  const { Pool } = await import("pg");
  const pool = new Pool({
    connectionString:
      process.env.DATABASE_URL ||
      "postgres://postgres:localdev@localhost:5432/landit_portal",
  });
  return drizzle({ client: pool, schema });
}

export const db = await createDb();
