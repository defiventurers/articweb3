import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/games/sannin-shogi/*.test.{js,jsx}"],
    testTimeout: 20000,
  },
});
