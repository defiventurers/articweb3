import { defineConfig } from 'vitest/config';
import {fileURLToPath} from 'node:url';
const dependency=(name:string)=>fileURLToPath(new URL('./node_modules/'+name,import.meta.url));
export default defineConfig({resolve:{alias:{react:dependency('react'),'react-dom':dependency('react-dom')},dedupe:['react','react-dom']},test: { include: ['src/games/shanshui-xiangqi/*.test.jsx', 'src/data/gameCatalog.test.js'], environment: 'jsdom', testTimeout: 15000 } });
