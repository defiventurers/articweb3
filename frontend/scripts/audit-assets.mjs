import { readdir, stat } from "node:fs/promises";
import path from "node:path";

const ROOT = path.resolve(process.cwd(), "public", "assets");
const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp", ".svg"]);
const WARN_BYTES = 700 * 1024;
const FAIL_BYTES = 2 * 1024 * 1024;

const files = await walk(ROOT);
const images = [];

for (const file of files) {
  const ext = path.extname(file).toLowerCase();
  if (!IMAGE_EXTENSIONS.has(ext)) continue;
  const info = await stat(file);
  images.push({ file, size: info.size });
}

images.sort((a, b) => b.size - a.size);

console.log("\nArctic Dominion asset audit\n");
for (const item of images) {
  const relative = path.relative(process.cwd(), item.file);
  const size = formatBytes(item.size);
  const status = item.size >= FAIL_BYTES ? "FAIL" : item.size >= WARN_BYTES ? "WARN" : "OK";
  console.log(`${status.padEnd(4)} ${size.padStart(9)}  ${relative}`);
}

const failing = images.filter((item) => item.size >= FAIL_BYTES);
const warnings = images.filter((item) => item.size >= WARN_BYTES && item.size < FAIL_BYTES);

console.log(`\n${images.length} image assets checked.`);
console.log(`${warnings.length} warnings over ${formatBytes(WARN_BYTES)}.`);
console.log(`${failing.length} failures over ${formatBytes(FAIL_BYTES)}.\n`);

if (failing.length) process.exitCode = 1;

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const out = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...await walk(full));
    else out.push(full);
  }
  return out;
}

function formatBytes(bytes) {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
}
