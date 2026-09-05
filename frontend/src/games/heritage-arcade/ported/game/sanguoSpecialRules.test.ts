import { describe, expect, it } from "vitest";
import { sanguoBannermanTargets } from "./sanguoBannermanMoves";
import {
  generalsFacing,
  nextSanguoTurn,
  resolveSanguoAppropriation,
  type SanguoNode,
  type SanguoPiece,
  type SanguoState,
} from "./sanguoRules";

const node = (sector: SanguoNode["sector"], rank: number, file: number): SanguoNode => ({ sector, rank, file });
const piece = (
  id: string,
  sector: SanguoNode["sector"],
  role: SanguoPiece["role"],
  rank: number,
  file: number,
  controller: SanguoNode["sector"] = sector,
): SanguoPiece => ({ id, sector, controller, role, node: node(sector, rank, file) });

const ids = (moves: SanguoNode[]) => moves.map((target) => `${target.sector}-${target.rank}-${target.file}`);

describe("Sanguo special rules", () => {
  it("uses Shu/Red first counterclockwise order and skips an eliminated kingdom", () => {
    expect(nextSanguoTurn("red", [])).toBe("green");
    expect(nextSanguoTurn("green", [])).toBe("blue");
    expect(nextSanguoTurn("blue", [])).toBe("red");
    expect(nextSanguoTurn("red", ["green"])).toBe("blue");
  });

  it("forbids two Generals facing along a clear confirmed L5 continuation", () => {
    const redGeneral = piece("red-general", "red", "king", 4, 4);
    const blueGeneral = piece("blue-general", "blue", "king", 4, 4);
    expect(generalsFacing([redGeneral, blueGeneral])).toBe(true);

    const blocker = piece("red-blocker", "red", "scout", 3, 4);
    expect(generalsFacing([redGeneral, blueGeneral, blocker])).toBe(false);
  });

  it("moves the mating piece onto the defeated General point before appropriation", () => {
    const redChariot = piece("red-chariot", "red", "icebreaker", 0, 4);
    const redGeneral = piece("red-general", "red", "king", 4, 4);
    const greenGeneral = piece("green-general", "green", "king", 4, 4);
    const blueGeneral = piece("blue-general", "blue", "king", 4, 4);
    const blueHorse = piece("blue-horse", "blue", "rider", 4, 1);

    const state: SanguoState = {
      pieces: [redChariot, redGeneral, greenGeneral, blueGeneral, blueHorse],
      turn: "red",
      defeated: [],
      winner: null,
      pending: { defeated: "blue", victor: "red", reason: "checkmate", matingPieceId: "red-chariot" },
      note: "pending",
      moveNumber: 10,
      lastMove: {
        pieceId: "red-chariot",
        from: node("red", 1, 4),
        to: node("red", 0, 4),
        controller: "red",
        role: "icebreaker",
      },
    };

    const resolved = resolveSanguoAppropriation(state)!;
    expect(resolved.pieces.find((candidate) => candidate.id === "red-chariot")?.node).toEqual(node("blue", 4, 4));
    expect(resolved.pieces.find((candidate) => candidate.id === "blue-general")?.captured).toBe(true);
    expect(resolved.pieces.find((candidate) => candidate.id === "blue-horse")?.controller).toBe("red");
    expect(resolved.turn).toBe("green");
  });

  it("does not relocate a piece when the defeated kingdom was stalemated", () => {
    const redChariot = piece("red-chariot", "red", "icebreaker", 0, 4);
    const redGeneral = piece("red-general", "red", "king", 4, 4);
    const greenGeneral = piece("green-general", "green", "king", 4, 4);
    const blueGeneral = piece("blue-general", "blue", "king", 4, 4);

    const state: SanguoState = {
      pieces: [redChariot, redGeneral, greenGeneral, blueGeneral],
      turn: "red",
      defeated: [],
      winner: null,
      pending: { defeated: "blue", victor: "red", reason: "stalemate" },
      note: "pending",
      moveNumber: 10,
      lastMove: null,
    };

    const resolved = resolveSanguoAppropriation(state)!;
    expect(resolved.pieces.find((candidate) => candidate.id === "red-chariot")?.node).toEqual(node("red", 0, 4));
  });
});

describe("optional historical Bannerman", () => {
  it("uses a 3-by-1 extended-Horse destination when its two orthogonal transit points are clear", () => {
    const banner = piece("red-banner", "red", "runner", 2, 4);
    const moves = ids(sanguoBannermanTargets(banner, [banner]));
    expect(moves).toContain("red-1-1");
    expect(moves).toContain("red-3-1");
    expect(moves).toContain("red-1-7");
    expect(moves).toContain("red-3-7");
  });

  it("cannot jump either orthogonal transit point", () => {
    const banner = piece("red-banner", "red", "runner", 2, 4);
    const blocker = piece("blocker", "red", "scout", 2, 3);
    const moves = ids(sanguoBannermanTargets(banner, [banner, blocker]));
    expect(moves).not.toContain("red-1-1");
    expect(moves).not.toContain("red-3-1");
    expect(moves).toContain("red-1-7");
  });
});
