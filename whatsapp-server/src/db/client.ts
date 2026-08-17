import { neon } from "@neondatabase/serverless";

// dotenv is loaded in server.ts before any imports reach here.
// This guard fires only if someone uses this module standalone.
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is required");
}

export const sql = neon(process.env.DATABASE_URL);
