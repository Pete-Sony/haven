import { randomBytes } from "node:crypto";
import { chmod, readFile, writeFile } from "node:fs/promises";

const [supabaseUrl, supabaseAnonKey] = process.argv.slice(2);
if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    "Usage: node tools/setup-local-env.mjs <supabase-url> <anon-key>",
  );
  process.exit(1);
}

let existing = "";
try {
  existing = await readFile(".env.local", "utf8");
} catch {
  // First setup.
}

function currentValue(name) {
  return (
    existing
      .split(/\r?\n/)
      .find((line) => line.startsWith(`${name}=`))
      ?.slice(name.length + 1) ?? ""
  );
}

const values = {
  GEMINI_API_KEY: currentValue("GEMINI_API_KEY"),
  NEXT_PUBLIC_SUPABASE_URL: supabaseUrl,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: supabaseAnonKey,
  GOOGLE_OAUTH_ENABLED: currentValue("GOOGLE_OAUTH_ENABLED") || "false",
  HAVEN_DATA_ENCRYPTION_KEY:
    currentValue("HAVEN_DATA_ENCRYPTION_KEY") ||
    randomBytes(32).toString("base64"),
};

const content = [
  "# Generated locally. Ignored by Git.",
  ...Object.entries(values).map(([name, value]) => `${name}=${value}`),
  "",
].join("\n");
await writeFile(".env.local", content, { encoding: "utf8", mode: 0o600 });
await chmod(".env.local", 0o600);
console.log(
  `Local environment ready: Supabase and encryption configured; Gemini ${values.GEMINI_API_KEY ? "configured" : "uses reviewed fallback"}.`,
);
