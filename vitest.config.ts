import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "bun:test": resolve(__dirname, "src/test/shims/bun-test.ts"),
    },
  },
  test: {
    include: ["src/**/*.test.ts"],
    exclude: ["node_modules", ".direnv", "dist"],
    setupFiles: [resolve(__dirname, "src/test/setup/vitest.setup.ts")],
  },
});
