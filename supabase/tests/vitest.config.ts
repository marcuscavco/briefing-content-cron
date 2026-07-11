import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["supabase/tests/**/*.test.ts"],
    testTimeout: 30_000,
    hookTimeout: 30_000,
    // Testes tocam o mesmo banco local; serial evita flakiness.
    fileParallelism: false,
  },
});
