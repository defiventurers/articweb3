import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: [
      "src/games/sannin-shogi/hex.test.js",
      "src/games/sannin-shogi/rules.test.js",
      "src/games/sannin-shogi/bot.test.js",
      "src/games/sannin-shogi/SanninShogiApp.test.jsx",
    ],
    testTimeout: 20000,
  },
});
