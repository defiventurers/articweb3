import { describe, expect, it } from "vitest";
import {
  FACTIONS, ROLE_LABELS, RULESET_VERSION, TERRAIN, terrainAt,
  applyAction, createInitialState, getLegalActions,
  getPseudoTargets, isHome, isRiverEndpoint, logicalNode,
  riverExits, sameNode, squareKey, validateAction,
  __testing,
} from "./rules.js";

const { RANK_COUNT, FILE_COUNT, RIVER_RANK, HOME_RANK, CENTRAL_FILE,
  PALACE_FRONT, PALACE_LEFT, PALACE_RIGHT, TURN_ORDER } = __testing;

function sparseState(spec, turn = "red") {
  const state = createInitialState();
  for (const piece of state.pieces) {
    piece.status = "eliminated";
    piece.node = null;
  }
  for (const [owner, role, rank, file] of spec) {
    const piece = state.pieces.find((c) => c.owner === owner && c.role === role && c.status === "eliminated");
    if (!piece) continue;
    piece.owner = owner;
    piece.role = role;
    piece.node = { sector: owner, rank, file };
    piece.status = "board";
    piece.hasMoved = false;
  }
  state.turn = turn;
  state.repetition = {};
  state.lastAction = null;
  state.outcome = null;
  state.phase = "play";
  state.activeFactions = [...FACTIONS];
  state.pending = null;
  return state;
}

describe("San You Qi canonical state", () => {
  it("creates the exact 54-piece, three-faction setup", () => {
    const state = createInitialState();
    expect(state.gameId).toBe("san-you-qi");
    expect(state.rulesetVersion).toBe(RULESET_VERSION);
    expect(state.pieces).toHaveLength(54);
    expect(new Set(state.pieces.map((p) => squareKey(p.node))).size).toBe(54);
    for (const faction of FACTIONS) {
      const army = state.pieces.filter((p) => p.owner === faction);
      expect(army).toHaveLength(18);
      expect(army.filter((p) => p.role === "general")).toHaveLength(1);
      expect(army.filter((p) => p.role === "chariot")).toHaveLength(2);
      expect(army.filter((p) => p.role === "horse")).toHaveLength(2);
      expect(army.filter((p) => p.role === "elephant")).toHaveLength(2);
      expect(army.filter((p) => p.role === "advisor")).toHaveLength(2);
      expect(army.filter((p) => p.role === "cannon")).toHaveLength(2);
      expect(army.filter((p) => p.role === "soldier")).toHaveLength(3);
      expect(army.filter((p) => p.role === "fire")).toHaveLength(2);
      expect(army.filter((p) => p.role === "flag")).toHaveLength(2);
    }
  });

  it("places each General at the back palace and Flags at front palace corners", () => {
    const state = createInitialState();
    for (const faction of FACTIONS) {
      const general = state.pieces.find((p) => p.owner === faction && p.role === "general");
      expect(general.node).toEqual({ sector: faction, rank: HOME_RANK, file: CENTRAL_FILE });
      const flags = state.pieces.filter((p) => p.owner === faction && p.role === "flag");
      expect(flags).toHaveLength(2);
      const flagNodes = flags.map((p) => `${p.node.rank}-${p.node.file}`).sort();
      expect(flagNodes).toEqual([`${PALACE_FRONT}-${PALACE_LEFT}`, `${PALACE_FRONT}-${PALACE_RIGHT}`]);
    }
  });

  it("is fully JSON serializable and deterministic", () => {
    const a = createInitialState();
    const b = JSON.parse(JSON.stringify(a));
    expect(getLegalActions(b)).toEqual(getLegalActions(a));
  });

  it("rejects mismatched rulesets and malformed state at the public boundary", () => {
    const wrongVersion = createInitialState();
    wrongVersion.rulesetVersion = "future";
    expect(getLegalActions(wrongVersion)).toEqual([]);
    expect(validateAction(wrongVersion, {}).error.code).toBe("RULESET_MISMATCH");

    const duplicate = createInitialState();
    duplicate.pieces[1].node = { ...duplicate.pieces[0].node };
    expect(getLegalActions(duplicate)).toEqual([]);
    expect(validateAction(duplicate, {}).error.code).toBe("INVALID_STATE");
  });

  it("uses Red-first counterclockwise turn order", () => {
    expect(TURN_ORDER).toEqual(["red", "green", "blue"]);
  });
});

describe("board graph and river crossing", () => {
  it("exposes 135 nodes (3 × 9×5 sectors)", () => {
    expect(FACTIONS.length * RANK_COUNT * FILE_COUNT).toBe(135);
  });

  it("central junction branches into both other kingdoms", () => {
    const exits = riverExits(logicalNode("red", 0, CENTRAL_FILE));
    expect(exits).toHaveLength(2);
    expect(exits.map((n) => n.sector).sort()).toEqual(["blue", "green"]);
  });

  it("non-central river exits split left and right into different neighboring kingdoms", () => {
    const left = riverExits(logicalNode("red", 0, 0));
    const right = riverExits(logicalNode("red", 0, 8));
    expect(left).toEqual([logicalNode("blue", 0, 8)]);
    expect(right).toEqual([logicalNode("green", 0, 0)]);

    expect(riverExits(logicalNode("green", 0, 1))).toEqual([logicalNode("red", 0, 7)]);
    expect(riverExits(logicalNode("green", 0, 7))).toEqual([logicalNode("blue", 0, 1)]);
    expect(riverExits(logicalNode("blue", 0, 1))).toEqual([logicalNode("green", 0, 7)]);
    expect(riverExits(logicalNode("blue", 0, 7))).toEqual([logicalNode("red", 0, 1)]);
  });

  it("marks central terrain in code rather than deriving it from artwork", () => {
    expect(TERRAIN.sea).toHaveLength(3);
    expect(terrainAt(logicalNode("red", 0, 4))).toBe("sea");
    expect(terrainAt(logicalNode("red", 0, 2))).toBe("mountain");
    expect(terrainAt(logicalNode("red", 0, 8))).toBe("city");
    expect(terrainAt(logicalNode("red", 1, 4))).toBeNull();
  });

  it("identifies river endpoints and home territory", () => {
    expect(isRiverEndpoint(logicalNode("red", 0, 0))).toBe(true);
    expect(isRiverEndpoint(logicalNode("red", 1, 0))).toBe(false);
    expect(isHome(logicalNode("red", 4, 4), "red")).toBe(true);
    expect(isHome(logicalNode("green", 4, 4), "red")).toBe(false);
  });
});

describe("standard Xiangqi pieces", () => {
  it("Chariot slides orthogonally including river crossings", () => {
    const state = sparseState([
      ["red", "chariot", 3, 4],
      ["green", "soldier", 2, 4],
    ]);
    const targets = getPseudoTargets(state, state.pieces.find((p) => p.role === "chariot").id);
    // Along rank 3 in red sector.
    expect(targets.some((t) => t.sector === "red" && t.rank === 3 && t.file === 0)).toBe(true);
    expect(targets.some((t) => t.sector === "red" && t.rank === 3 && t.file === 8)).toBe(true);
    // File 4 is a sea corridor, so Chariots cannot enter or pass through it.
    expect(targets.some((t) => t.sector === "red" && t.rank === 0 && t.file === 4)).toBe(false);
    expect(targets.some((t) => t.sector === "green" && t.rank === 0 && t.file === 4)).toBe(false);
    // The green soldier at rank 2 file 4 is a capture target (not a pass-through).
    expect(targets.some((t) => t.sector === "green" && t.rank === 2 && t.file === 4)).toBe(false);
    // Beyond the soldier is blocked.
    expect(targets.some((t) => t.sector === "green" && t.rank === 3 && t.file === 4)).toBe(false);
  });

  it("Cannon captures by jumping exactly one screen", () => {
    const state = sparseState([
      ["red", "cannon", 2, 4],
      ["green", "soldier", 0, 4],   // screen (at the river junction)
      ["green", "chariot", 1, 4],   // capture target beyond the screen
    ]);
    const targets = getPseudoTargets(state, state.pieces.find((p) => p.role === "cannon").id);
    // Going down file 4: green rank 0 (soldier = screen), green rank 1 (chariot = capture).
    expect(targets.some((t) => t.sector === "green" && t.rank === 1 && t.file === 4)).toBe(true);
    // Cannot move to empty squares past the screen (cannon only captures past screen).
    expect(targets.some((t) => t.sector === "red" && t.rank === 2 && t.file === 6)).toBe(true);
    expect(targets.some((t) => t.sector === "red" && t.rank === 2 && t.file === 8)).toBe(true);
    // Cannot capture the screen itself — it is the first piece, no screen before it.
    expect(targets.some((t) => t.sector === "green" && t.rank === 0 && t.file === 4)).toBe(false);
  });

  it("applies terrain restrictions to Chariot/Horse and Cannon corridors", () => {
    const chariotState = sparseState([["red", "chariot", 1, 4]]);
    const chariot = chariotState.pieces.find((p) => p.role === "chariot");
    expect(getPseudoTargets(chariotState, chariot.id).some((t) => t.rank === 0 && t.file === 4)).toBe(false);

    const horseState = sparseState([["red", "horse", 2, 3]]);
    const horse = horseState.pieces.find((p) => p.role === "horse");
    expect(getPseudoTargets(horseState, horse.id).some((t) => t.rank === 0 && t.file === 4)).toBe(false);

    const cannonState = sparseState([["red", "cannon", 1, 2]]);
    const cannon = cannonState.pieces.find((p) => p.role === "cannon");
    expect(getPseudoTargets(cannonState, cannon.id).some((t) => t.rank === 0 && t.file === 2)).toBe(false);
  });

  it("General moves one orthogonal inside the palace only", () => {
    const state = sparseState([["red", "general", HOME_RANK, CENTRAL_FILE]]);
    const targets = getPseudoTargets(state, state.pieces.find((p) => p.role === "general").id);
    const keys = new Set(targets.map(squareKey));
    expect(keys.has(squareKey(logicalNode("red", HOME_RANK - 1, CENTRAL_FILE)))).toBe(true);
    expect(keys.has(squareKey(logicalNode("red", HOME_RANK, CENTRAL_FILE - 1)))).toBe(true);
    expect(keys.has(squareKey(logicalNode("red", HOME_RANK, CENTRAL_FILE + 1)))).toBe(true);
    expect(keys.has(squareKey(logicalNode("red", HOME_RANK - 1, PALACE_LEFT)))).toBe(false);
  });

  it("Advisor stays on the palace diagonal", () => {
    const state = sparseState([["red", "advisor", HOME_RANK, PALACE_LEFT]]);
    const targets = getPseudoTargets(state, state.pieces.find((p) => p.role === "advisor").id);
    expect(targets).toHaveLength(1);
    expect(targets[0]).toEqual(logicalNode("red", PALACE_FRONT + 1, CENTRAL_FILE));
  });

  it("Elephant moves two diagonal with blockable eye and stays in-sector", () => {
    const state = sparseState([
      ["red", "elephant", 4, 2],
      ["red", "soldier", 3, 1], // blocks the eye on the (-2,-2) delta
    ]);
    const targets = getPseudoTargets(state, state.pieces.find((p) => p.role === "elephant").id);
    expect(targets.some((t) => t.rank === 2 && t.file === 0)).toBe(false); // blocked by eye
    expect(targets.some((t) => t.rank === 2 && t.file === 4)).toBe(true);
  });

  it("Horse uses the blockable Xiangqi L-move", () => {
    const state = sparseState([
      ["red", "horse", 3, 4],
      ["red", "soldier", 2, 4], // blocks the up-leg (rank 2, file 4)
    ]);
    const targets = getPseudoTargets(state, state.pieces.find((p) => p.role === "horse").id);
    // Delta (-2,-1): leg at (2,4) — blocked by soldier → destination (1,3) unreachable.
    expect(targets.some((t) => t.rank === 1 && t.file === 3)).toBe(false);
    // Delta (-2,1): leg at (2,4) — blocked by soldier → destination (1,5) unreachable.
    expect(targets.some((t) => t.rank === 1 && t.file === 5)).toBe(false);
    // Delta (-1,-2): leg at (3,3) — clear → destination (2,2) reachable.
    expect(targets.some((t) => t.rank === 2 && t.file === 2)).toBe(true);
    // Delta (-1,2): leg at (3,5) — clear → destination (2,6) reachable.
    expect(targets.some((t) => t.rank === 2 && t.file === 6)).toBe(true);
    // Delta (1,-2): leg at (3,3) — clear → destination (4,2) reachable.
    expect(targets.some((t) => t.rank === 4 && t.file === 2)).toBe(true);
    // Delta (1,2): leg at (3,5) — clear → destination (4,6) reachable.
    expect(targets.some((t) => t.rank === 4 && t.file === 6)).toBe(true);
  });

  it("Soldier moves forward before crossing, sideways after", () => {
    const state = sparseState([["red", "soldier", 3, 4]]);
    const targets = getPseudoTargets(state, state.pieces.find((p) => p.role === "soldier").id);
    expect(targets).toHaveLength(1);
    expect(targets[0].rank).toBe(2);

    // After crossing into green.
    const crossed = sparseState([["red", "soldier", 4, 4]]);
    crossed.pieces.find((p) => p.role === "soldier").node = { sector: "green", rank: 4, file: 4 };
    const ct = getPseudoTargets(crossed, crossed.pieces.find((p) => p.role === "soldier").id);
    expect(ct.some((t) => t.rank === 4 && t.file === 3)).toBe(true);
    expect(ct.some((t) => t.rank === 4 && t.file === 5)).toBe(true);
    expect(ct.some((t) => t.rank === 3 && t.file === 4)).toBe(false); // no backward
  });
});

describe("Three Friends special pieces", () => {
  it("Fire moves one diagonal forward and never retreats", () => {
    const state = sparseState([["red", "fire", 2, 4]]);
    const targets = getPseudoTargets(state, state.pieces.find((p) => p.role === "fire").id);
    expect(targets).toHaveLength(2);
    expect(targets.some((t) => t.rank === 1 && t.file === 3)).toBe(true);
    expect(targets.some((t) => t.rank === 1 && t.file === 5)).toBe(true);
    expect(targets.some((t) => t.rank >= 3)).toBe(false);
  });

  it("Flag moves two straight forward inside territory", () => {
    const state = sparseState([["red", "flag", 4, 4]]);
    const targets = getPseudoTargets(state, state.pieces.find((p) => p.role === "flag").id);
    expect(targets.some((t) => t.rank === 2 && t.file === 4)).toBe(true);
    expect(targets.some((t) => t.rank === 3 && t.file === 4)).toBe(false); // never 1 step
    expect(targets.some((t) => t.rank === 3 && (t.file === 3 || t.file === 5))).toBe(false); // never sideways
  });

  it("Flag path must be clear for the two-step advance", () => {
    const state = sparseState([
      ["red", "flag", 4, 4],
      ["red", "soldier", 3, 4],
    ]);
    const targets = getPseudoTargets(state, state.pieces.find((p) => p.role === "flag").id);
    expect(targets.some((t) => t.rank === 2 && t.file === 4)).toBe(false);
  });

  it("Flag cannot cross the river in two steps from rank 1", () => {
    const state = sparseState([["red", "flag", 1, 4]]);
    const targets = getPseudoTargets(state, state.pieces.find((p) => p.role === "flag").id);
    expect(targets).toHaveLength(0);
  });

  it("Flag moves exactly two orthogonal steps after leaving its own territory", () => {
    const state = sparseState([
      ["red", "flag", 4, 4],
      ["blue", "general", 4, 4],
    ]);
    // Move the flag to the green sector to simulate crossing.
    const flag = state.pieces.find((p) => p.role === "flag" && p.owner === "red" && p.status === "board");
    flag.node = { sector: "green", rank: 3, file: 4 };
    const targets = getPseudoTargets(state, flag.id);
    expect(targets.some((t) => t.sector === "green" && t.rank === 3 && t.file === 2)).toBe(true);
    expect(targets.some((t) => t.sector === "green" && t.rank === 3 && t.file === 0)).toBe(false);
    expect(targets.some((t) => t.sector === "green" && t.rank === 1 && t.file === 4)).toBe(true);
    expect(targets.some((t) => t.sector === "green" && t.rank === 0 && t.file === 4)).toBe(false);
  });

  it("Flag outside home cannot return to its original kingdom", () => {
    const state = sparseState([["red", "flag", 2, 4]]);
    const flag = state.pieces.find((p) => p.role === "flag");
    flag.node = { sector: "green", rank: 0, file: 4 };
    const targets = getPseudoTargets(state, flag.id);
    expect(targets.some((t) => t.sector === "red")).toBe(false);
  });
});

describe("legality and victory", () => {
  it("generates legal first move for Red", () => {
    const state = createInitialState();
    const actions = getLegalActions(state);
    expect(actions.length).toBeGreaterThan(0);
    expect(actions.every((a) => a.type === "move")).toBe(true);
  });

  it("does not allow moving an opponent's piece", () => {
    const state = createInitialState();
    const actions = getLegalActions(state);
    expect(actions.every((a) => state.pieces.find((p) => p.id === a.pieceId).owner === state.turn)).toBe(true);
  });

  it("rejects illegal actions without changing the state object", () => {
    const state = createInitialState();
    const general = state.pieces.find((p) => p.role === "general" && p.owner === "red");
    const result = applyAction(state, {
      type: "move", pieceId: general.id,
      from: general.node,
      to: { sector: "red", rank: 0, file: 0 },
    });
    expect(result.state).toBe(state);
    expect(result.error.code).toBe("ILLEGAL_ACTION");
  });

  it("applies a legal move and advances the turn", () => {
    const state = createInitialState();
    const actions = getLegalActions(state);
    const action = actions[0];
    const result = applyAction(state, action);
    expect(result.error).toBeNull();
    expect(result.state.turn).toBe("green");
    expect(result.state.ply).toBe(1);
  });
});
