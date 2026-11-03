import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import sharp from 'sharp';
import { createInitialState } from '../src/games/shanshui-xiangqi/rules.js';
import { spriteFor, pixelPoint, PIECE_SIZE } from '../src/games/shanshui-xiangqi/presentation.js';
const root = fileURLToPath(new URL('../public/assets/games/shanshui-xiangqi/', import.meta.url));
await fs.mkdir(root, { recursive: true });
const underlay = path.join(root, 'ornamental-underlay.webp');
for (const theme of ['light', 'dark']) {
  const dark = theme === 'dark', line = dark ? '#8cb8ce' : '#42657a';
  const colors = { blue: '#348ff4', red: '#ed5269', purple: '#a465e8', green: '#31b788' };
  const lines = Array.from({ length: 13 }, (_, i) => { const n = 120 + i * 108; return `<path d="M120 ${n}H1416 M${n} 120V1416"/>`; }).join('');
  const palaces = [[0, 0, 'blue'], [0, 10, 'red'], [10, 0, 'purple'], [10, 10, 'green']].map(([r, c, army]) => {
    const x = 120 + c * 108, y = 120 + r * 108;
    return `<rect x="${x}" y="${y}" width="216" height="216" rx="12" fill="${colors[army]}" fill-opacity=".13" stroke="${colors[army]}" stroke-width="5"/><path d="M${x + 108} ${y}L${x + 216} ${y + 108} ${x + 108} ${y + 216} ${x} ${y + 108}Z" fill="none" stroke="${colors[army]}" stroke-width="4"/>`;
  }).join('');
  const terrain = `<rect x="660" y="120" width="216" height="1296" fill="${dark ? '#5e6c82' : '#bbc8d6'}" fill-opacity=".56"/><rect x="120" y="660" width="1296" height="216" fill="${dark ? '#146b93' : '#94dbe9'}" fill-opacity=".85"/>
    <path d="M660 120V1416 M876 120V1416" stroke="${dark ? '#b2bdd0' : '#8999ad'}" stroke-width="4" stroke-dasharray="12 12"/>
    <path d="M120 660H1416 M120 876H1416" stroke="${dark ? '#77cde5' : '#49a9c5'}" stroke-width="4"/>
    ${[390, 1146].map(y => `<path d="M732 ${y + 26}l36-63 36 63z" fill="${dark ? '#c2d3e4' : '#f0f7fc'}" opacity=".45"/>`).join('')}
    ${[390, 1146].map(x => `<path d="M${x - 40} 746q20-18 40 0t40 0 M${x - 40} 790q20-18 40 0t40 0" fill="none" stroke="${dark ? '#90d8ee' : '#3e9ab4'}" stroke-width="5" opacity=".5"/>`).join('')}`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1536" height="1536" viewBox="0 0 1536 1536">
  <defs><linearGradient id="ice" x2="1" y2="1"><stop stop-color="${dark ? '#15364d' : '#f0fbff'}"/><stop offset=".55" stop-color="${dark ? '#0f2b40' : '#d9edf6'}"/><stop offset="1" stop-color="${dark ? '#1e4055' : '#ecf7fb'}"/></linearGradient><linearGradient id="rim" x2="1" y2="1"><stop stop-color="${dark ? '#3e667d' : '#e3f2f8'}"/><stop offset=".5" stop-color="${dark ? '#0a2131' : '#789eb5'}"/><stop offset="1" stop-color="${dark ? '#638da1' : '#d5e9f1'}"/></linearGradient></defs>
  ${dark ? '<rect x="0" y="0" width="1536" height="1536" fill="#001425" opacity=".25"/>' : ''}
  <rect x="90" y="90" width="1356" height="1356" rx="16" fill="url(#ice)" stroke="${line}" stroke-width="5"/>
  ${terrain}<g fill="none" stroke="${line}" stroke-width="2.4" opacity="${dark ? '.65' : '.56'}">${lines}</g>${palaces}
  <g fill="${line}" opacity=".65">${Array.from({ length: 169 }, (_, i) => `<circle cx="${120 + i % 13 * 108}" cy="${120 + Math.floor(i / 13) * 108}" r="3.5"/>`).join('')}</g>
  <rect x="120" y="120" width="1296" height="1296" fill="none" stroke="${line}" stroke-width="5"/>
</svg>`;
  await fs.writeFile(path.join(root, `board-${theme}.svg`), svg);
  await sharp(underlay).composite([{ input: Buffer.from(svg) }]).png().toFile(path.join(root, `board-${theme}.png`));
  await sharp(underlay).composite([{ input: Buffer.from(svg) }]).webp({ quality: 94 }).toFile(path.join(root, `board-${theme}.webp`));
  const cache = new Map(), pieces = [];
  for (const piece of createInitialState().pieces) {
    const source = fileURLToPath(new URL(`../public${spriteFor(piece)}`, import.meta.url));
    if (!cache.has(source)) cache.set(source, (await sharp(source).png().toBuffer()).toString('base64'));
    const p = pixelPoint(piece), half = PIECE_SIZE / 2;
    pieces.push(`<image href="data:image/png;base64,${cache.get(source)}" x="${p.x - half}" y="${p.y - half}" width="${PIECE_SIZE}" height="${PIECE_SIZE}" transform="rotate(-90 ${p.x} ${p.y})"/>`);
    if (piece.role.endsWith('soldier')) pieces.push(`<g transform="rotate(-90 ${p.x} ${p.y})"><circle cx="${p.x + 34}" cy="${p.y + 33}" r="15" fill="${piece.role.startsWith('mountain') ? '#596c81' : '#126c9b'}" stroke="white" stroke-width="2"/><text x="${p.x + 34}" y="${p.y + 38}" text-anchor="middle" font-family="sans-serif" font-weight="bold" font-size="15" fill="white">${piece.role.startsWith('mountain') ? 'M' : 'R'}</text></g>`);
  }
  const png = (await fs.readFile(path.join(root, `board-${theme}.png`))).toString('base64');
  const preview = `<svg xmlns="http://www.w3.org/2000/svg" width="1536" height="1536"><g transform="rotate(90 768 768)"><image href="data:image/png;base64,${png}" width="1536" height="1536"/>${pieces.join('')}</g></svg>`;
  await sharp(Buffer.from(preview)).png().toFile(path.join(root, `starting-position-${theme}.png`));
  await sharp(Buffer.from(preview)).webp({ quality: 92 }).toFile(path.join(root, `starting-position-${theme}.webp`));
}
console.log('Built exact 1536px light/dark boards: SVG, PNG and WebP. Grid 120 + index × 108.');
