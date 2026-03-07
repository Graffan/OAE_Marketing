import type { Config } from "drizzle-kit";
import { config } from "dotenv";
config({ path: ".env" });

export default {
  schema: "./shared/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  tablesFilter: ["!session"],
} satisfies Config;
