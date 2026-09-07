import { defineConfig } from "vitest/config";
export default defineConfig({ test: { include: ["src/games/heritage-arcade/ported/game/sanguo*.test.ts"], testTimeout: 15000 } });
