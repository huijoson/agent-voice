import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "test/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      include: ["src/**/*.ts"],
      // index.ts is the bin entrypoint (process.argv wiring); excluded from
      // coverage targets since it is exercised via integration tests, not units.
      exclude: ["src/**/*.test.ts", "src/index.ts"],
    },
  },
});
