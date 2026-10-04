import { defineConfig } from "vitest/config";
export default defineConfig({ test: { include: ["src/games/shogi-frozen-shogunate/*.test.{js,jsx}"], testTimeout: 20000 } });
