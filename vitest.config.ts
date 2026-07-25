import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname),
    },
  },
  test: {
    exclude: ["tests/e2e/**", "node_modules/**", ".next/**"],
    coverage: {
      include: ["lib/domain/**/*.ts", "lib/server/ai/validation.ts"],
      provider: "v8",
      reporter: ["text", "json-summary"],
      thresholds: {
        branches: 80,
        functions: 90,
        lines: 90,
        statements: 90,
      },
    },
    environment: "node",
  },
});
