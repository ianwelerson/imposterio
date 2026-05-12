import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    include: ["**/*.test.ts"],
    // Integration tests share a single Postgres test DB; running them in
    // parallel would require per-worker schemas. Disable parallelism until
    // the volume justifies the extra plumbing.
    pool: "forks",
    poolOptions: { forks: { singleFork: true } },
    coverage: {
      provider: "v8",
      thresholds: { lines: 80, branches: 80, functions: 80, statements: 80 },
    },
  },
})
