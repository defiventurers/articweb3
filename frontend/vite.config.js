import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const VIRTUAL_ASSET_MANIFEST_ID = "virtual:arctic-public-assets";
const RESOLVED_ASSET_MANIFEST_ID = `\0${VIRTUAL_ASSET_MANIFEST_ID}`;
const CONFIG_DIR = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_ASSET_DIR = path.join(CONFIG_DIR, "public", "assets");

function collectPublicAssets(directory, relativeDirectory = "") {
  if (!fs.existsSync(directory)) return [];

  return fs.readdirSync(directory, { withFileTypes: true })
    .flatMap((entry) => {
      const relativePath = path.posix.join(relativeDirectory, entry.name);
      const absolutePath = path.join(directory, entry.name);

      if (entry.isDirectory()) return collectPublicAssets(absolutePath, relativePath);
      if (!entry.isFile() || entry.name.startsWith(".")) return [];

      return [`/assets/${relativePath}`];
    })
    .sort((left, right) => left.localeCompare(right));
}

function publicAssetManifestPlugin() {
  return {
    name: "arctic-public-asset-manifest",
    enforce: "pre",
    resolveId(id) {
      return id === VIRTUAL_ASSET_MANIFEST_ID ? RESOLVED_ASSET_MANIFEST_ID : null;
    },
    load(id) {
      if (id !== RESOLVED_ASSET_MANIFEST_ID) return null;
      const assets = collectPublicAssets(PUBLIC_ASSET_DIR);
      return `export default ${JSON.stringify(assets, null, 2)};`;
    },
    configureServer(server) {
      server.watcher.add(PUBLIC_ASSET_DIR);
      server.watcher.on("all", (_event, changedPath) => {
        if (!changedPath.startsWith(PUBLIC_ASSET_DIR)) return;
        const module = server.moduleGraph.getModuleById(RESOLVED_ASSET_MANIFEST_ID);
        if (module) server.moduleGraph.invalidateModule(module);
      });
    }
  };
}

export default defineConfig({
  plugins: [publicAssetManifestPlugin(), react()],
  server: {
    allowedHosts: true
  },
  resolve: {
    alias: {
      "@": path.resolve(CONFIG_DIR, "src/games/heritage-arcade/ported")
    }
  }
});
