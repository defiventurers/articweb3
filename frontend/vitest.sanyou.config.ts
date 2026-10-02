import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: [
      "src/games/san-you-qi/rules.test.js",
      "src/games/san-you-qi/movementGuide.test.jsx",
      "src/games/san-you-qi/movementGuide.ui.test.jsx",
      "src/games/san-you-qi/bot.test.js",
    ],
    testTimeout: 20000,
  },
});
