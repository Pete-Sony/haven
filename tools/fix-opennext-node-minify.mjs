import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const EXPECTED_AWS_VERSION = "4.1.0";
const EXPECTED_CORE_VERSION = "10.5.0";
const EXPECTED_TERSER_VERSION = "10.5.0";

const replacements = [
  {
    original: 'import minify from "@node-minify/core";',
    patched: 'import { minify } from "@node-minify/core";',
  },
  {
    original: 'import terser from "@node-minify/terser";',
    patched: 'import { terser } from "@node-minify/terser";',
  },
];

async function readPackageVersion(root, packagePath) {
  const raw = await readFile(
    resolve(root, "node_modules", packagePath),
    "utf8",
  );
  const manifest = JSON.parse(raw);
  return manifest.version;
}

export async function patchOpenNextNodeMinify(root = process.cwd()) {
  const versions = {
    aws: await readPackageVersion(root, "@opennextjs/aws/package.json"),
    core: await readPackageVersion(root, "@node-minify/core/package.json"),
    terser: await readPackageVersion(root, "@node-minify/terser/package.json"),
  };

  if (
    versions.aws !== EXPECTED_AWS_VERSION ||
    versions.core !== EXPECTED_CORE_VERSION ||
    versions.terser !== EXPECTED_TERSER_VERSION
  ) {
    throw new Error(
      `Unsupported OpenNext minifier versions: ${JSON.stringify(versions)}`,
    );
  }

  const target = resolve(
    root,
    "node_modules/@opennextjs/aws/dist/minimize-js.js",
  );
  let source = await readFile(target, "utf8");
  let changed = false;

  for (const { original, patched } of replacements) {
    const originalCount = source.split(original).length - 1;
    const patchedCount = source.split(patched).length - 1;
    if (originalCount === 1 && patchedCount === 0) {
      source = source.replace(original, patched);
      changed = true;
      continue;
    }
    if (originalCount === 0 && patchedCount === 1) continue;
    throw new Error(
      `OpenNext minifier import did not match the expected source: ${original}`,
    );
  }

  if (changed) await writeFile(target, source, "utf8");
  return { changed, target, versions };
}

const invokedPath = process.argv[1]
  ? pathToFileURL(resolve(process.argv[1])).href
  : "";
if (import.meta.url === invokedPath) {
  const result = await patchOpenNextNodeMinify();
  process.stdout.write(
    `${result.changed ? "Patched" : "Verified"} OpenNext minifier compatibility.\n`,
  );
}
