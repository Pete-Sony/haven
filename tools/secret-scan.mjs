import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

const patterns = [
  String.raw`AIza[0-9A-Za-z_-]{35}`,
  String.raw`sk-[0-9A-Za-z]{20,}`,
  String.raw`gh[pousr]_[0-9A-Za-z]{30,}`,
  String.raw`-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----`,
];
const ignored = new Set([
  ".git",
  ".next",
  ".open-next",
  ".vercel",
  "coverage",
  "dist",
  "node_modules",
  "playwright-report",
  "test-results",
]);
const files = [];

async function visit(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    if (ignored.has(entry.name)) continue;
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) await visit(target);
    else if (entry.isFile()) files.push(target);
  }
}

await visit(".");
const findings = [];
for (const file of files) {
  if (file === "tools/secret-scan.mjs") continue;
  try {
    const content = await readFile(file, "utf8");
    if (patterns.some((pattern) => new RegExp(pattern).test(content))) {
      findings.push(file);
    }
  } catch {
    // Binary and unreadable files are outside this source-text scan.
  }
}
if (findings.length > 0) {
  console.error(`Possible secret found in: ${findings.join(", ")}`);
  process.exit(1);
}
console.log(`Secret scan passed (${files.length} files).`);
