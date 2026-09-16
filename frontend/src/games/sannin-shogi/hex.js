export const HEX_RADIUS = 6;

export const AXIAL_DIRECTIONS = Object.freeze([
  Object.freeze({ q: 1, r: 0 }),
  Object.freeze({ q: 1, r: -1 }),
  Object.freeze({ q: 0, r: -1 }),
  Object.freeze({ q: -1, r: 0 }),
  Object.freeze({ q: -1, r: 1 }),
  Object.freeze({ q: 0, r: 1 })
]);

export function cellKey(q, r) {
  if (!Number.isInteger(q) || !Number.isInteger(r)) throw new TypeError("Axial coordinates must be integers.");
  return `${q},${r}`;
}

export function parseCellKey(id) {
  if (typeof id !== "string") return null;
  const match = /^(-?\d+),(-?\d+)$/.exec(id);
  if (!match) return null;
  const q = Number(match[1]);
  const r = Number(match[2]);
  if (!Number.isSafeInteger(q) || !Number.isSafeInteger(r)) return null;
  return coordinate(q, r);
}

export function isInsideHex(cell, radius = HEX_RADIUS) {
  const axial = tryAxial(cell);
  return Boolean(axial) && Number.isInteger(radius) && radius >= 0 && hexDistance(axial) <= radius;
}

export function hexDistance(a, b = ORIGIN) {
  const from = axialOf(a);
  const to = axialOf(b);
  const dq = from.q - to.q;
  const dr = from.r - to.r;
  return Math.max(Math.abs(dq), Math.abs(dr), Math.abs(dq + dr));
}

export function addAxial(cell, delta, steps = 1) {
  const start = axialOf(cell);
  const vector = axialOf(delta);
  if (!Number.isInteger(steps)) throw new TypeError("Axial step count must be an integer.");
  return coordinate(start.q + vector.q * steps, start.r + vector.r * steps);
}

export function neighbor(cell, directionIndex, radius = HEX_RADIUS) {
  const next = addAxial(cell, directionAt(directionIndex));
  return isInsideHex(next, radius) ? next : null;
}

export function neighbors(cell, radius = HEX_RADIUS) {
  return AXIAL_DIRECTIONS
    .map((_, directionIndex) => neighbor(cell, directionIndex, radius))
    .filter(Boolean);
}

export function ray(cell, directionIndex, radius = HEX_RADIUS) {
  const start = axialOf(cell);
  const direction = directionAt(directionIndex);
  const result = [];
  for (let steps = 1; ; steps += 1) {
    const next = addAxial(start, direction, steps);
    if (!isInsideHex(next, radius)) return result;
    result.push(next);
  }
}

export function rotateAxial(cell, steps = 1) {
  const start = axialOf(cell);
  if (!Number.isInteger(steps)) throw new TypeError("Rotation steps must be an integer.");
  let q = start.q;
  let r = start.r;
  const turns = ((steps % 6) + 6) % 6;
  for (let turn = 0; turn < turns; turn += 1) {
    [q, r] = [-r, q + r];
  }
  return coordinate(q, r);
}

export function projectPointyTop(cell, size = 1) {
  const { q, r } = axialOf(cell);
  requirePositiveSize(size);
  const horizontal = q + r / 2;
  return Object.freeze({
    x: horizontal === 0 ? 0 : Math.sqrt(3) * size * horizontal,
    y: r === 0 ? 0 : 1.5 * size * r
  });
}

export function pointyTopCorners(cell, size = 1) {
  const center = projectPointyTop(cell, size);
  const halfWidth = Math.sqrt(3) * size / 2;
  const halfHeight = size / 2;
  return Object.freeze([
    Object.freeze({ x: center.x, y: center.y - size }),
    Object.freeze({ x: center.x + halfWidth, y: center.y - halfHeight }),
    Object.freeze({ x: center.x + halfWidth, y: center.y + halfHeight }),
    Object.freeze({ x: center.x, y: center.y + size }),
    Object.freeze({ x: center.x - halfWidth, y: center.y + halfHeight }),
    Object.freeze({ x: center.x - halfWidth, y: center.y - halfHeight })
  ].map(({ x, y }) => Object.freeze({ x: cleanZero(x), y: cleanZero(y) })));
}

export function pointyTopViewBox(cells = HEX_CELLS, size = 1, padding = 0) {
  requirePositiveSize(size);
  if (!Array.isArray(cells) || !cells.length) throw new TypeError("View box cells must be a non-empty array.");
  if (!Number.isFinite(padding) || padding < 0) throw new TypeError("View box padding must be non-negative.");
  const points = cells.flatMap((cell) => pointyTopCorners(cell, size));
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const minX = Math.min(...xs) - padding;
  const minY = Math.min(...ys) - padding;
  const maxX = Math.max(...xs) + padding;
  const maxY = Math.max(...ys) + padding;
  return Object.freeze({ minX, minY, width: maxX - minX, height: maxY - minY });
}

const ORIGIN = Object.freeze({ q: 0, r: 0, s: 0 });

function coordinate(q, r) {
  const cleanQ = cleanZero(q);
  const cleanR = cleanZero(r);
  return Object.freeze({ q: cleanQ, r: cleanR, s: cleanZero(-cleanQ - cleanR) });
}

function cleanZero(value) {
  return Math.abs(value) < 1e-12 ? 0 : value;
}

function tryAxial(value) {
  if (typeof value === "string") return parseCellKey(value);
  if (!value || !Number.isInteger(value.q) || !Number.isInteger(value.r)) return null;
  return coordinate(value.q, value.r);
}

function axialOf(value) {
  const axial = tryAxial(value);
  if (!axial) throw new TypeError("Expected an axial coordinate or canonical cell ID.");
  return axial;
}

function directionAt(index) {
  if (!Number.isInteger(index) || index < 0 || index >= AXIAL_DIRECTIONS.length) {
    throw new RangeError("Hex direction index must be an integer from 0 through 5.");
  }
  return AXIAL_DIRECTIONS[index];
}

function requirePositiveSize(size) {
  if (!Number.isFinite(size) || size <= 0) throw new TypeError("Hex size must be positive.");
}

function buildCells(radius) {
  const cells = [];
  for (let r = -radius; r <= radius; r += 1) {
    const minQ = Math.max(-radius, -r - radius);
    const maxQ = Math.min(radius, -r + radius);
    for (let q = minQ; q <= maxQ; q += 1) {
      const axial = coordinate(q, r);
      cells.push(Object.freeze({ id: cellKey(q, r), ...axial, ring: hexDistance(axial) }));
    }
  }
  return cells;
}

function buildEdges(cells) {
  const ids = new Set(cells.map((cell) => cell.id));
  const edges = [];
  for (const cell of cells) {
    for (const direction of AXIAL_DIRECTIONS) {
      const otherId = cellKey(cell.q + direction.q, cell.r + direction.r);
      if (ids.has(otherId) && cell.id.localeCompare(otherId) < 0) {
        edges.push(Object.freeze([cell.id, otherId]));
      }
    }
  }
  return edges;
}

export const HEX_CELLS = Object.freeze(buildCells(HEX_RADIUS));
export const HEX_CELL_BY_ID = Object.freeze(Object.fromEntries(HEX_CELLS.map((cell) => [cell.id, cell])));
export const HEX_EDGES = Object.freeze(buildEdges(HEX_CELLS));
