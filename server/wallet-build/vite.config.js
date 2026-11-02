import {defineConfig} from 'vite';
import {fileURLToPath} from 'node:url';
export default defineConfig({base:'/arctic-play/wallet/',build:{outDir:fileURLToPath(new URL('../privyWalletWeb',import.meta.url)),emptyOutDir:true},resolve:{dedupe:['react','react-dom']}});
