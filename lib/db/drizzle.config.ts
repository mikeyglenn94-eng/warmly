import { defineConfig } from "drizzle-kit";

// `generate` reads only the schema files and does not need DATABASE_URL.
// `push` and `migrate` connect to the DB; drizzle-kit will fail with a clear
// connection error if the URL is empty, which is the behaviour we want.
const url = process.env["DATABASE_URL"] ?? "";

export default defineConfig({
  schema: "./src/schema/index.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url,
  },
});
