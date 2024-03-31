import { type Config } from "drizzle-kit";

export default {
  driver: "better-sqlite",
  dbCredentials: {
    url: "db.sqlite",
  },
  schema: "./src/lib/database/schema.ts",
  out: "./drizzle",
} satisfies Config;
