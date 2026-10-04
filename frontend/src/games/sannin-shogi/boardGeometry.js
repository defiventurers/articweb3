import { HEX_CELLS, pointyTopCorners, projectPointyTop } from "./hex.js";

export const SIZE = 30;
export const BOARD_ART = "/assets/games/sannin-shogi/board.webp";
export const BOARD_WIDTH = 1334;
export const BOARD_HEIGHT = 1179;
// New hexagonal grid background: centred at (667, 590) in the 1334×1179 image.
// Pointy-top 127-cell radius-6 board measures 623.54×540 at size=30; scaled to
// fit within the visible grid area (approx 800×800) centred on image centre.
// Geometry is kept in board.webp's 1334 x 1179 SVG viewBox, so it remains
// attached to the artwork whenever the board is resized for a phone or desktop.
export const GRID_CENTER = Object.freeze({ x: 667, y: 590 });
export const GRID_SCALE = 1.3;
export const GRID_TRANSFORM = `translate(${GRID_CENTER.x} ${GRID_CENTER.y}) scale(${GRID_SCALE} ${GRID_SCALE})`;
export const ROW_OFFSETS = Object.freeze({
  "-6": Object.freeze({ x: -94, y: -77.81061692969872 }),
  "-5": Object.freeze({ x: -94, y: -76.11908177905309 }),
  "-4": Object.freeze({ x: -94, y: -74.42754662840747 }),
  "-3": Object.freeze({ x: -94, y: -71.04447632711621 }),
  "-2": Object.freeze({ x: -93, y: -67.66140602582497 }),
  "-1": Object.freeze({ x: -94, y: -65.96987087517934 }),
  "0": Object.freeze({ x: -95, y: -60.89526542324247 }),
  "1": Object.freeze({ x: -93, y: -59.20373027259685 }),
  "2": Object.freeze({ x: -96, y: -55.8206599713056 }),
  "3": Object.freeze({ x: -94, y: -54.129124820659975 }),
  "4": Object.freeze({ x: -96, y: -50.74605451936872 }),
  "5": Object.freeze({ x: -93, y: -49.0545193687231 }),
  "6": Object.freeze({ x: -95, y: -49.0545193687231 })
});
export const ROW_SCALES = Object.freeze({ "-6": 0.972, "-5": 0.992, "-4": 0.996, "-2": 1.01, "-1": 1.02, "0": 1.02, "1": 1.016, "2": 1.016, "3": 1.026, "4": 1.024, "5": 1.014 });
export const ROWS = Object.freeze(Array.from({ length: 13 }, (_, index) => index - 6));
export const CELLS_BY_ROW = Object.freeze(Object.fromEntries(ROWS.map((row) => [row, Object.freeze(HEX_CELLS.filter((cell) => cell.r === row))])));
export const PIECE_SIZE = 56;
// Match the engine's axial seat rotations: red starts at +240° / -120° and
// blue at +120°. This places every faction's soldier-pointing artwork toward
// its legal forward lanes rather than back toward its home edge.
export const ROTATION = { red: -120, green: 0, blue: 120 };

export function rowTransform(row) {
  const offset = ROW_OFFSETS[row] || { x: 0, y: 0 };
  return `translate(${offset.x / GRID_SCALE} ${offset.y / GRID_SCALE}) scale(${ROW_SCALES[row] || 1} 1)`;
}

export function artworkPoint(cell, offset = { x: 0, y: 0 }) {
  const point = projectPointyTop(cell, SIZE);
  const row = ROW_OFFSETS[cell.r] || { x: 0, y: 0 };
  return { x: GRID_CENTER.x + row.x + (point.x + offset.x) * GRID_SCALE * (ROW_SCALES[cell.r] || 1), y: GRID_CENTER.y + row.y + (point.y + offset.y) * GRID_SCALE };
}
// Camera framing only: the board image and every calibrated point keep their coordinates.
const bounds = HEX_CELLS.flatMap(cell => pointyTopCorners(cell, SIZE).map(point => {
  const row = ROW_OFFSETS[cell.r];
  return { x: GRID_CENTER.x + row.x + point.x * GRID_SCALE * (ROW_SCALES[cell.r] || 1), y: GRID_CENTER.y + row.y + point.y * GRID_SCALE };
}));
const minX = Math.min(...bounds.map(p => p.x)) - 32;
const minY = Math.min(...bounds.map(p => p.y)) - 32;
export const BATTLE_VIEWBOX = `${minX} ${minY} ${Math.max(...bounds.map(p=>p.x))-minX+32} ${Math.max(...bounds.map(p=>p.y))-minY+32}`;
export const FULL_VIEWBOX = `0 0 ${BOARD_WIDTH} ${BOARD_HEIGHT}`;
export const BATTLE_ASPECT = Number(BATTLE_VIEWBOX.split(' ')[2]) / Number(BATTLE_VIEWBOX.split(' ')[3]);
