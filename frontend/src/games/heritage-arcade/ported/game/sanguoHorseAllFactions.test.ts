import { describe, expect, it } from "vitest";
import { sanguoHorseTargets } from "./sanguoHorseMoves";
import { initialSanguoPieces, type SanguoFaction, type SanguoNode, type SanguoPiece } from "./sanguoRules";

const factions: SanguoFaction[] = ["red", "green", "blue"];
const nodeKey = (node: SanguoNode) => `${node.sector}-${node.rank}-${node.file}`;
const localKey = (node: SanguoNode) => `${node.rank}-${node.file}`;

const horseAt = (sector: SanguoFaction, rank: number, file: number): SanguoPiece => ({
  id: `${sector}-horse-test`,
  sector,
  controller: sector,
  role: "rider",
  node: { sector, rank, file },
});

const moves = (horse: SanguoPiece, pieces: SanguoPiece[]) => sanguoHorseTargets(horse, pieces);

function withoutPiece(pieces: SanguoPiece[], id: string) {
  return pieces.filter((piece) => piece.id !== id);
}

describe("San Guo Qi Horse symmetry for every kingdom", () => {
  it("gives both starting Horses the same legal L geometry in Red, Green, and Blue", () => {
    const pieces = initialSanguoPieces(false);

    for (const sector of factions) {
      const leftHorse = pieces.find((piece) => piece.id === `${sector}-rider-1`)!;
      const rightHorse = pieces.find((piece) => piece.id === `${sector}-rider-7`)!;

      // At the untouched source setup each Horse has two inward L moves.
      // Its adjacent Elephant blocks the additional horizontal-long L route.
      expect(moves(leftHorse, pieces).map(localKey).sort()).toEqual(["2-0", "2-2"]);
      expect(moves(rightHorse, pieces).map(localKey).sort()).toEqual(["2-6", "2-8"]);
    }
  });

  it("restores the third home-edge L move for every faction when the adjacent Elephant clears", () => {
    const setup = initialSanguoPieces(false);

    for (const sector of factions) {
      const leftHorse = setup.find((piece) => piece.id === `${sector}-rider-1`)!;
      const rightHorse = setup.find((piece) => piece.id === `${sector}-rider-7`)!;

      const leftOpen = withoutPiece(setup, `${sector}-seer-2`);
      const rightOpen = withoutPiece(setup, `${sector}-seer-6`);

      expect(new Set(moves(leftHorse, leftOpen).map(localKey))).toEqual(new Set(["2-0", "2-2", "3-3"]));
      expect(new Set(moves(rightHorse, rightOpen).map(localKey))).toEqual(new Set(["2-6", "2-8", "3-5"]));
    }
  });

  it("produces the same eight open-board L destinations in all three sectors", () => {
    const expected = new Set(["0-3", "0-5", "1-2", "1-6", "3-2", "3-6", "4-3", "4-5"]);

    for (const sector of factions) {
      const horse = horseAt(sector, 2, 4);
      expect(new Set(moves(horse, [horse]).map(localKey))).toEqual(expected);
    }
  });

  it("applies the horse-leg blocker identically in Red, Green, and Blue", () => {
    for (const sector of factions) {
      const horse = horseAt(sector, 2, 4);
      const blocker: SanguoPiece = {
        id: `${sector}-leg-blocker`,
        sector,
        controller: sector,
        role: "scout",
        node: { sector, rank: 1, file: 4 },
      };
      const targets = new Set(moves(horse, [horse, blocker]).map(localKey));

      expect(targets.has("0-3")).toBe(false);
      expect(targets.has("0-5")).toBe(false);
      expect(targets.has("1-2")).toBe(true);
      expect(targets.has("1-6")).toBe(true);
    }
  });

  it("never creates a faction-specific destination from the same local open-board position", () => {
    const samples: Array<[number, number]> = [
      [4, 1], [4, 7], [3, 1], [3, 4], [2, 2], [2, 4], [2, 6], [1, 4],
    ];

    for (const [rank, file] of samples) {
      const byFaction = factions.map((sector) => {
        const horse = horseAt(sector, rank, file);
        return moves(horse, [horse])
          .filter((target) => target.sector === sector)
          .map(localKey)
          .sort();
      });

      expect(byFaction[1]).toEqual(byFaction[0]);
      expect(byFaction[2]).toEqual(byFaction[0]);
    }
  });

  it("keeps all generated Horse endpoints on real 5x9 source nodes", () => {
    for (const sector of factions) {
      for (let rank = 0; rank <= 4; rank += 1) {
        for (let file = 0; file <= 8; file += 1) {
          const horse = horseAt(sector, rank, file);
          for (const target of moves(horse, [horse])) {
            expect(target.rank).toBeGreaterThanOrEqual(0);
            expect(target.rank).toBeLessThanOrEqual(4);
            expect(target.file).toBeGreaterThanOrEqual(0);
            expect(target.file).toBeLessThanOrEqual(8);
            expect(nodeKey(target)).toMatch(/^(red|green|blue)-[0-4]-[0-8]$/);
          }
        }
      }
    }
  });
});
