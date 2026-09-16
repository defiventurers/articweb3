import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  AXIAL_DIRECTIONS,
  HEX_CELL_BY_ID,
  HEX_CELLS,
  HEX_EDGES,
  HEX_RADIUS,
  addAxial,
  cellKey,
  hexDistance,
  isInsideHex,
  neighbor,
  neighbors,
  parseCellKey,
  pointyTopCorners,
  pointyTopViewBox,
  projectPointyTop,
  ray,
  rotateAxial
} from "./hex.js";

const closePoint = (left, right, precision = 10) => {
  expect(left.x).toBeCloseTo(right.x, precision);
  expect(left.y).toBeCloseTo(right.y, precision);
};

const roundedPointKey = ({ x, y }) => `${x.toFixed(9)},${y.toFixed(9)}`;

describe("Sannin Shogi radius-6 axial geometry", () => {
  it("G01 generates exactly 127 unique canonical cube-valid cells", () => {
    expect(HEX_RADIUS).toBe(6);
    expect(HEX_CELLS).toHaveLength(127);
    expect(new Set(HEX_CELLS.map((cell) => cell.id)).size).toBe(127);
    expect(Object.keys(HEX_CELL_BY_ID)).toHaveLength(127);
    for (const cell of HEX_CELLS) {
      expect(cell.q + cell.r + cell.s).toBe(0);
      expect(cell.id).toBe(cellKey(cell.q, cell.r));
      expect(parseCellKey(cell.id)).toEqual({ q: cell.q, r: cell.r, s: cell.s });
      expect(isInsideHex(cell)).toBe(true);
    }
    expect(parseCellKey("01,0")).toEqual({ q: 1, r: 0, s: -1 });
    expect(parseCellKey("1:0")).toBeNull();
    expect(isInsideHex({ q: 7, r: 0 })).toBe(false);
  });

  it("G02 has the exact seven ring populations", () => {
    expect(Array.from({ length: 7 }, (_, ring) => HEX_CELLS.filter((cell) => cell.ring === ring).length))
      .toEqual([1, 6, 12, 18, 24, 30, 36]);
  });

  it("G03 has the required thirteen horizontal row counts", () => {
    expect(Array.from({ length: 13 }, (_, index) => {
      const r = index - HEX_RADIUS;
      return HEX_CELLS.filter((cell) => cell.r === r).length;
    })).toEqual([7, 8, 9, 10, 11, 12, 13, 12, 11, 10, 9, 8, 7]);
  });

  it("G04 separates 36 boundary cells from 91 interior cells", () => {
    expect(HEX_CELLS.filter((cell) => cell.ring === HEX_RADIUS)).toHaveLength(36);
    expect(HEX_CELLS.filter((cell) => cell.ring < HEX_RADIUS)).toHaveLength(91);
  });

  it("G05 has six degree-3 corners, thirty degree-4 edges, and ninety-one degree-6 interiors", () => {
    const degrees = HEX_CELLS.map((cell) => neighbors(cell).length);
    expect(degrees.filter((degree) => degree === 3)).toHaveLength(6);
    expect(degrees.filter((degree) => degree === 4)).toHaveLength(30);
    expect(degrees.filter((degree) => degree === 6)).toHaveLength(91);
    expect(degrees.every((degree) => [3, 4, 6].includes(degree))).toBe(true);
  });

  it("G06 produces exactly 342 unique undirected edges", () => {
    expect(HEX_EDGES).toHaveLength(342);
    expect(new Set(HEX_EDGES.map(([a, b]) => [a, b].sort().join("|"))).size).toBe(342);
    expect(HEX_EDGES.every(([a, b]) => a !== b)).toBe(true);
  });

  it("G07 keeps adjacency reciprocal, in bounds, duplicate-free, and distance one", () => {
    for (const cell of HEX_CELLS) {
      const adjacent = neighbors(cell);
      expect(new Set(adjacent.map(({ q, r }) => cellKey(q, r))).size).toBe(adjacent.length);
      for (const other of adjacent) {
        expect(isInsideHex(other)).toBe(true);
        expect(hexDistance(cell, other)).toBe(1);
        expect(neighbors(other).some(({ q, r }) => q === cell.q && r === cell.r)).toBe(true);
      }
    }
  });

  it("G08 clips corner neighbors and rays at the exact board boundary", () => {
    const corners = [
      { q: 6, r: 0 }, { q: 6, r: -6 }, { q: 0, r: -6 },
      { q: -6, r: 0 }, { q: -6, r: 6 }, { q: 0, r: 6 }
    ];
    expect(corners.every((corner) => neighbors(corner).length === 3)).toBe(true);
    expect(AXIAL_DIRECTIONS.map((_, index) => ray({ q: 0, r: 0 }, index).length)).toEqual([6, 6, 6, 6, 6, 6]);
    expect(neighbor({ q: 6, r: 0 }, 0)).toBeNull();
    expect(ray({ q: 6, r: 0 }, 0)).toEqual([]);
    expect(ray({ q: 6, r: 0 }, 3)).toHaveLength(12);
    expect(ray({ q: 6, r: 0 }, 3).at(-1)).toEqual({ q: -6, r: 0, s: 6 });
  });

  it("G09 makes 60/120-degree rotations bijective and distance preserving", () => {
    for (const cell of HEX_CELLS) {
      expect(rotateAxial(cell, 6)).toEqual({ q: cell.q, r: cell.r, s: cell.s });
      expect(rotateAxial(cell, -6)).toEqual({ q: cell.q, r: cell.r, s: cell.s });
      expect(rotateAxial(rotateAxial(rotateAxial(cell, 2), 2), 2)).toEqual({ q: cell.q, r: cell.r, s: cell.s });
      expect(hexDistance(rotateAxial(cell, 1))).toBe(cell.ring);
    }
    for (const steps of [1, 2, 3, 4, 5]) {
      const rotatedIds = HEX_CELLS.map((cell) => {
        const rotated = rotateAxial(cell, steps);
        return cellKey(rotated.q, rotated.r);
      });
      expect(new Set(rotatedIds).size).toBe(127);
      expect(rotatedIds.every((id) => Boolean(HEX_CELL_BY_ID[id]))).toBe(true);
    }
  });

  it("G10 partitions non-center cells into forty-two stable 120-degree faction orbits", () => {
    const unseen = new Set(HEX_CELLS.map((cell) => cell.id));
    unseen.delete("0,0");
    const orbits = [];
    while (unseen.size) {
      const id = unseen.values().next().value;
      const start = parseCellKey(id);
      const orbit = [start, rotateAxial(start, 2), rotateAxial(start, 4)].map(({ q, r }) => cellKey(q, r));
      expect(new Set(orbit).size).toBe(3);
      orbit.forEach((cellId) => unseen.delete(cellId));
      orbits.push(orbit);
    }
    expect(orbits).toHaveLength(42);
    expect(rotateAxial({ q: 0, r: 0 }, 2)).toEqual({ q: 0, r: 0, s: 0 });
  });

  it("G11 projects a gap-free pointy-top lattice with equal neighbor spacing", () => {
    const size = 17;
    const centers = HEX_CELLS.map((cell) => projectPointyTop(cell, size));
    expect(new Set(centers.map(roundedPointKey)).size).toBe(127);
    for (const cell of HEX_CELLS) {
      const center = projectPointyTop(cell, size);
      const corners = pointyTopCorners(cell, size);
      expect(corners).toHaveLength(6);
      for (const adjacent of neighbors(cell)) {
        const otherCenter = projectPointyTop(adjacent, size);
        expect(Math.hypot(center.x - otherCenter.x, center.y - otherCenter.y)).toBeCloseTo(Math.sqrt(3) * size, 10);
        const shared = new Set(corners.map(roundedPointKey));
        expect(pointyTopCorners(adjacent, size).filter((point) => shared.has(roundedPointKey(point)))).toHaveLength(2);
      }
    }
    const viewBox = pointyTopViewBox(HEX_CELLS, size, 3);
    expect(viewBox.width).toBeGreaterThan(0);
    expect(viewBox.height).toBeGreaterThan(0);
    closePoint(projectPointyTop(addAxial({ q: 0, r: 0 }, AXIAL_DIRECTIONS[0]), size), projectPointyTop({ q: 1, r: 0 }, size));
  });

  it("G12 remains a pure mathematical module with projection unable to change topology", () => {
    const source = readFileSync(new URL("./hex.js", import.meta.url), "utf8");
    expect(source).not.toMatch(/^\s*import\s/m);
    expect(source).not.toMatch(/\b(?:React|document|window|canvas|Image|asset)\b/);
    const before = HEX_CELLS.map((cell) => cell.id);
    pointyTopViewBox(HEX_CELLS, 2, 0.5);
    expect(HEX_CELLS.map((cell) => cell.id)).toEqual(before);
    expect(Object.isFrozen(HEX_CELLS)).toBe(true);
    expect(HEX_CELLS.every(Object.isFrozen)).toBe(true);
  });
});
