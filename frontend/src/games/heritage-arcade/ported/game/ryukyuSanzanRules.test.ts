import { describe, expect, it } from "vitest";
import { SANZAN_SIZE, canPlaceStone, createInitialSanzanState, createReplayExport, demoSanzanState, inspectIntersection, ownerAt, passTurn, placeStone, settledDemoSanzanState } from "./ryukyuSanzanRules";

const roster = ["polly", "retsba", "pengu"] as const;

describe("Ryūkyū Sanzan territory engine", () => {
  it("opens every intersection as a legal settlement", () => {
    const game = createInitialSanzanState([...roster]);
    let legal = 0;
    for (let row = 0; row < SANZAN_SIZE; row += 1) for (let col = 0; col < SANZAN_SIZE; col += 1) if (canPlaceStone(game, row, col)) legal += 1;
    expect(legal).toBe(225);
  });

  it("captures the surrounded rival stone in the deterministic demo chart", () => {
    const game = demoSanzanState([...roster]);
    const after = placeStone(game, 7, 8);
    expect(after).not.toBeNull();
    expect(ownerAt(after!, 7, 7)).toBeNull();
    expect(after!.players.polly.captures).toBe(3);
  });

  it("settles the table after one full circuit of consecutive passes", () => {
    const opening = createInitialSanzanState([...roster]);
    const afterOne = passTurn(opening)!;
    const afterTwo = passTurn(afterOne)!;
    const afterThree = passTurn(afterTwo)!;
    expect(afterThree.phase).toBe("finished");
    expect(afterThree.finalScores).not.toBeNull();
  });

  it("explains the demo capture and records local placements and passes for export", () => {
    const demo = demoSanzanState([...roster]);
    const inspection = inspectIntersection(demo, 7, 8);
    expect(inspection.kind).toBe("legal");
    expect(inspection.captures).toBe(1);
    const opening = createInitialSanzanState([...roster]);
    const afterPlacement = placeStone(opening, 0, 0)!;
    const afterPass = passTurn(afterPlacement)!;
    const replay = createReplayExport(afterPass);
    expect(replay.moves).toEqual([{ number: 1, actor: "polly", type: "place", coordinate: "A1", captures: 0, perimeterCut: false }, { number: 2, actor: "retsba", type: "pass", captures: 0, perimeterCut: false }]);
    expect(replay.note).toContain("full local move record");
  });

  it("provides a settled deterministic chart with a final score ledger", () => {
    const settled = settledDemoSanzanState([...roster]);
    expect(settled.phase).toBe("finished");
    expect(settled.finalScores?.polly.total).toBeGreaterThan(0);
    expect(settled.moves).toHaveLength(3);
  });
});
