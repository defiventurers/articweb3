import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src/games/heritage-arcade/ported", import.meta.url)) } },
  test: { include: ["src/games/heritage-arcade/ported/game/sanguo*.test.ts", "src/games/heritage-arcade/ported/components/Sanguo*.test.tsx"], testTimeout: 15000 },
});
