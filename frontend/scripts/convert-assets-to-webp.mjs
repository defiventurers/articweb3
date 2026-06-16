import { mkdir, readdir, stat } from "node:fs/promises";
import path from "node:path";

let sharp;
try {
  sharp = (await import("sharp")).default;
} catch {
  console.error("Missing dependency: sharp");
  console.error("Install it with: npm install -D sharp");
  process.exit(1);
}

const ROOT = path.resolve(process.cwd(), "public", "assets");
const INPUT_EXTENSIONS = new Set([".png", ".jpg", ".jpeg"]);
const QUALITY = Number(process.env.WEBP_QUALITY || 82);

const files = await walk(ROOT);
let converted = 0;
let skipped = 0;

for (const file of files) {
  const ext = path.extname(file).toLowerCase();
  if (!INPUT_EXTENSIONS.has(ext)) continue;

  const output = file.replace(new RegExp(`${ext}$`, "i"), ".webp");
  try {
    const [inputInfo, outputInfo] = await Promise.all([
      stat(file),
      stat(output).catch(() => null)
    ]);

    if (outputInfo && outputInfo.mtimeMs >= inputInfo.mtimeMs) {
      skipped += 1;
      continue;
    }

    await mkdir(path.dirname(output), { recursive: true });
    await sharp(file).webp({ quality: QUALITY, effort: 5 }).toFile(output);
    converted += 1;
    console.log(`WEBP ${path.relative(process.cwd(), output)}`);
  } catch (error) {
    console.warn(`Could not convert ${path.relative(process.cwd(), file)}: ${error.message}`);
  }
}

console.log(`\nConverted ${converted} assets. Skipped ${skipped} current WebP assets. Quality ${QUALITY}.\n`);

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
