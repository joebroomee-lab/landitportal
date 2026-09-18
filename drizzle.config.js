import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./db/schema.js",
  out: "netlify/database/migrations",
  dbCredentials: {
    url:
      process.env.DATABASE_URL ||
      "postgres://postgres:localdev@localhost:5432/landit_portal",
  },
});
