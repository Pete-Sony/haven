import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { patchOpenNextNodeMinify } from "../../tools/fix-opennext-node-minify.mjs";

const temporaryDirectories: string[] = [];

async function fixture(options?: { awsVersion?: string; source?: string }) {
  const root = await mkdtemp(join(tmpdir(), "haven-opennext-"));
  temporaryDirectories.push(root);
  const packages = [
    ["@opennextjs/aws", options?.awsVersion ?? "4.1.0"],
    ["@node-minify/core", "10.5.0"],
    ["@node-minify/terser", "10.5.0"],
  ] as const;
  for (const [name, version] of packages) {
    const directory = join(root, "node_modules", name);
    await mkdir(directory, { recursive: true });
    await writeFile(
      join(directory, "package.json"),
      JSON.stringify({ name, version }),
    );
  }
  const target = join(root, "node_modules/@opennextjs/aws/dist/minimize-js.js");
  await mkdir(join(target, ".."), { recursive: true });
  await writeFile(
    target,
    options?.source ??
      [
        'import minify from "@node-minify/core";',
        'import terser from "@node-minify/terser";',
      ].join("\n"),
  );
  return { root, target };
}

afterEach(async () => {
  const { rm } = await import("node:fs/promises");
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((path) => rm(path, { recursive: true, force: true })),
  );
});

describe("OpenNext node-minify compatibility patch", () => {
  it("patches the pinned imports and is idempotent", async () => {
    const { root, target } = await fixture();
    await expect(patchOpenNextNodeMinify(root)).resolves.toMatchObject({
      changed: true,
    });
    await expect(patchOpenNextNodeMinify(root)).resolves.toMatchObject({
      changed: false,
    });
    await expect(readFile(target, "utf8")).resolves.toContain(
      'import { minify } from "@node-minify/core";',
    );
    await expect(readFile(target, "utf8")).resolves.toContain(
      'import { terser } from "@node-minify/terser";',
    );
  });

  it("fails closed when the pinned dependency changes", async () => {
    const { root } = await fixture({ awsVersion: "4.2.0" });
    await expect(patchOpenNextNodeMinify(root)).rejects.toThrow(
      "Unsupported OpenNext minifier versions",
    );
  });

  it("fails closed when upstream source no longer matches", async () => {
    const { root } = await fixture({ source: "export const changed = true;" });
    await expect(patchOpenNextNodeMinify(root)).rejects.toThrow(
      "did not match the expected source",
    );
  });
});
