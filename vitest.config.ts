import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    include: ["src/__tests__/**/*.test.ts", "src/dashboard/**/*.test.ts"],
    // CI runners have slow fsync; the sqlite-backed search tests need headroom
    // over vitest's 5s default even with synchronous=NORMAL.
    testTimeout: 20_000,
    hookTimeout: 20_000,
  },
});
