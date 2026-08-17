import { neon } from "@neondatabase/serverless";
import dotenv from "dotenv";
dotenv.config();

const sql = neon(process.env.DATABASE_URL);

const validModels = [
  "google/gemma-4-27b-it:free",
  "google/gemma-4-31b-it:free",
  "nvidia/nemotron-3-super-120b-a12b:free",
  "nvidia/nemotron-nano-9b-v2:free",
  "nvidia/nemotron-3-nano-30b-a3b:free",
  "z-ai/glm-5.2:free",
  "openai/gpt-oss-20b:free",
];

const rows = await sql`
  UPDATE bots
  SET model = 'google/gemma-4-27b-it:free', updated_at = NOW()
  WHERE model != ALL(${validModels})
  RETURNING id, name, model
`;

if (rows.length === 0) {
  console.log("All bots already using valid models.");
} else {
  console.log(`Updated ${rows.length} bot(s):`);
  rows.forEach((r) => console.log(`  - "${r.name}" → ${r.model}`));
}
