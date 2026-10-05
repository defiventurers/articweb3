import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src/games/heritage-arcade/ported", import.meta.url)) } },
  test: { include: ["src/games/xiangqi/*.test.{js,ts,jsx}", "src/games/heritage-arcade/ported/game/xiangqiRules.test.ts"], testTimeout: 15000 },
});
