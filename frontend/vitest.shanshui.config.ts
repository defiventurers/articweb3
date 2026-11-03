import { defineConfig } from 'vitest/config';
export default defineConfig({ test: { include: ['src/games/shanshui-xiangqi/*.test.jsx', 'src/data/gameCatalog.test.js'], environment: 'jsdom', testTimeout: 15000 } });
