import { describe, expect, it } from "vitest";
import {
  FACTIONS,
  RULESET_VERSION,
  applyAction,
  createInitialState,
  getLegalActions,
  getPseudoTargets,
  squareKey,
  territoryOf,
  validateAction,
  __testing,
} from "./rules.js";
import {
  ALL_NODE_IDS,
  CENTER_HORIZONTAL_LINES,
  CONTINUATION_LINES,
  armNodeId,
  boardPoint,
} from "./topology.js";

function sparseState(spec, turn = "red", activeFactions = [turn]) {
  const state = createInitialState();

  for (const piece of state.pieces) {
    piece.status = "captured";
    piece.node = null;
    piece.promoted = false;
    piece.leftHome = false;
    piece.owner = piece.faction;
  }

  for (const faction of activeFactions) {
    const general = state.pieces.find(
      (piece) => piece.faction === faction && piece.role === "general",
    );
    general.status = "board";
    general.node = armNodeId(faction, 5, 1);
    general.owner = faction;
  }

  for (const item of spec) {
    const {
      faction,
      role,
      node,
      owner = faction,
      promoted = false,
      leftHome = !node.startsWith(`${faction}:`),
      index = 0,
    } = item;

    const candidates = state.pieces.filter(
      (piece) => piece.faction === faction && piece.role === role,
    );
    const piece = candidates[index];
    piece.status = "board";
    piece.node = node;
    piece.owner = owner;
    piece.promoted = promoted;
    piece.leftHome = leftHome;
  }

  state.turn = turn;
  state.activeFactions = [...activeFactions];
  state.repetition = {};
  state.outcome = null;
  state.phase = "play";
  state.lastAction = null;
  state.ply = 0;
  return state;
}

describe("San You Qi finalized setup", () => {
  it("creates 54 pieces with the documented 18-piece army per faction", () => {
    const state = createInitialState();
    expect(state.gameId).toBe("san-you-qi");
    expect(state.rulesetVersion).toBe(RULESET_VERSION);
    expect(state.pieces).toHaveLength(54);
    expect(new Set(state.pieces.map((piece) => squareKey(piece.node))).size).toBe(54);

    for (const faction of FACTIONS) {
      const army = state.pieces.filter((piece) => piece.faction === faction);
      expect(army).toHaveLength(18);
      expect(army.filter((piece) => piece.role === "general")).toHaveLength(1);
      expect(army.filter((piece) => piece.role === "advisor")).toHaveLength(2);
      expect(army.filter((piece) => piece.role === "elephant")).toHaveLength(2);
      expect(army.filter((piece) => piece.role === "horse")).toHaveLength(2);
      expect(army.filter((piece) => piece.role === "chariot")).toHaveLength(2);
      expect(army.filter((piece) => piece.role === "cannon")).toHaveLength(2);
      expect(army.filter((piece) => piece.role === "soldier")).toHaveLength(3);
      expect(army.filter((piece) => piece.role === "fire")).toHaveLength(2);
      expect(army.filter((piece) => piece.role === "flag")).toHaveLength(2);
    }
  });

  it("places the exact Sanyou opening formation", () => {
    const state = createInitialState();
    const red = state.pieces.filter((piece) => piece.faction === "red");

    const at = (node) => red.find((piece) => piece.node === node)?.role;

    expect([
      at("red:L1-1"), at("red:L2-1"), at("red:L3-1"),
      at("red:L4-1"), at("red:L5-1"), at("red:L6-1"),
      at("red:L7-1"), at("red:L8-1"), at("red:L9-1"),
    ]).toEqual([
      "chariot", "horse", "elephant", "advisor", "general",
      "advisor", "elephant", "horse", "chariot",
    ]);

    expect(at("red:L2-3")).toBe("cannon");
    expect(at("red:L4-3")).toBe("flag");
    expect(at("red:L6-3")).toBe("flag");
    expect(at("red:L8-3")).toBe("cannon");

    expect([
      at("red:L1-4"), at("red:L3-4"), at("red:L5-4"),
      at("red:L7-4"), at("red:L9-4"),
    ]).toEqual(["soldier", "fire", "soldier", "fire", "soldier"]);
  });

  it("is deterministic and JSON serializable", () => {
    const a = createInitialState();
    const b = JSON.parse(JSON.stringify(a));
    expect(getLegalActions(b)).toEqual(getLegalActions(a));
  });
});

describe("finalized 159-point board graph", () => {
  it("contains 135 arm nodes plus C1-C24", () => {
    expect(ALL_NODE_IDS).toHaveLength(159);
    expect(new Set(ALL_NODE_IDS).size).toBe(159);
    expect(boardPoint("red:L1-1")).toEqual([0.329114, 0.755632]);
    expect(boardPoint("C24")).toEqual([0.471424, 0.431472]);
  });

  it("records the user-approved continuation paths", () => {
    const byId = Object.fromEntries(CONTINUATION_LINES.map((entry) => [entry.id, entry.nodes]));

    expect(byId["RB-1"].slice(-6)).toEqual([
      "red:L1-5", "blue:L9-5", "blue:L9-4", "blue:L9-3", "blue:L9-2", "blue:L9-1",
    ]);

    expect(byId["RB-2"].slice(4, 7)).toEqual(["red:L2-5", "C1", "blue:L8-5"]);
    expect(byId["RB-3"].slice(4, 8)).toEqual(["red:L3-5", "C2", "C18", "blue:L7-5"]);

    expect(byId["RB-4A"].slice(4, 8)).toEqual(["red:L4-5", "C3", "C17", "blue:L6-5"]);
    expect(byId["RB-4B"].slice(4, 9)).toEqual(["red:L4-5", "C3", "C19", "C17", "blue:L6-5"]);

    expect(byId["RB-5"].slice(4, 10)).toEqual([
      "red:L5-5", "C4", "C20", "C24", "C16", "blue:L5-5",
    ]);
    expect(byId["RG-5"].slice(4, 10)).toEqual([
      "red:L5-5", "C4", "C20", "C22", "C10", "green:L5-5",
    ]);

    expect(byId["RG-6A"].slice(4, 8)).toEqual(["red:L6-5", "C5", "C9", "green:L4-5"]);
    expect(byId["RG-6B"].slice(4, 9)).toEqual(["red:L6-5", "C5", "C21", "C9", "green:L4-5"]);
    expect(byId["RG-7"].slice(4, 8)).toEqual(["red:L7-5", "C6", "C8", "green:L3-5"]);
    expect(byId["RG-8"].slice(4, 7)).toEqual(["red:L8-5", "C7", "green:L2-5"]);

    expect(byId["BG-5"].slice(4, 10)).toEqual([
      "blue:L5-5", "C16", "C24", "C22", "C10", "green:L5-5",
    ]);
    expect(byId["BG-4A"].slice(4, 9)).toEqual([
      "blue:L4-5", "C15", "C23", "C11", "green:L6-5",
    ]);
    expect(byId["BG-4B"].slice(4, 8)).toEqual([
      "blue:L4-5", "C15", "C11", "green:L6-5",
    ]);
    expect(byId["BG-3"].slice(4, 8)).toEqual(["blue:L3-5", "C14", "C12", "green:L7-5"]);
    expect(byId["BG-2"].slice(4, 7)).toEqual(["blue:L2-5", "C13", "green:L8-5"]);
  });

  it("contains exactly the six added central horizontal lines", () => {
    expect(CENTER_HORIZONTAL_LINES.map((entry) => entry.nodes)).toEqual([
      ["C1","C2","C3","C4","C5","C6","C7"],
      ["C13","C14","C15","C16","C17","C18","C1"],
      ["C7","C8","C9","C10","C11","C12","C13"],
      ["C19","C20","C21"],
      ["C23","C24","C19"],
      ["C21","C22","C23"],
    ]);
  });
});

describe("faction-specific enemy territory and Soldier promotion", () => {
  it("uses the exact Red C-point enemy set", () => {
    const enemy = [8,9,10,11,12,13,14,15,16,17,18,22,23,24];
    const safe = [1,2,3,4,5,6,7,19,20,21];
    for (const number of enemy) expect(territoryOf(`C${number}`, "red")).toBe("enemy");
    for (const number of safe) expect(territoryOf(`C${number}`, "red")).not.toBe("enemy");
  });

  it("uses the exact Blue C-point enemy set", () => {
    const safe = [1,13,14,15,16,17,18,19,23,24];
    const enemy = [2,3,4,5,6,7,8,9,10,11,12,20,21,22];
    for (const number of enemy) expect(territoryOf(`C${number}`, "blue")).toBe("enemy");
    for (const number of safe) expect(territoryOf(`C${number}`, "blue")).not.toBe("enemy");
  });

  it("uses the exact Green C-point enemy set", () => {
    const safe = [7,8,9,10,11,12,13,21,22,23];
    const enemy = [1,2,3,4,5,6,14,15,16,17,18,19,20,24];
    for (const number of enemy) expect(territoryOf(`C${number}`, "green")).toBe("enemy");
    for (const number of safe) expect(territoryOf(`C${number}`, "green")).not.toBe("enemy");
  });

  it("restricts an unpromoted Red Soldier on C19 to C17", () => {
    const state = sparseState([
      { faction: "red", role: "soldier", node: "C19" },
    ]);
    const soldier = state.pieces.find(
      (piece) => piece.faction === "red" && piece.role === "soldier" && piece.status === "board",
    );
    expect(getPseudoTargets(state, soldier.id)).toEqual(["C17"]);
  });

  it("restricts an unpromoted Blue Soldier on C24 to C20 or C22", () => {
    const state = sparseState([
      { faction: "blue", role: "soldier", node: "C24" },
    ], "blue", ["blue"]);
    const soldier = state.pieces.find(
      (piece) => piece.faction === "blue" && piece.role === "soldier" && piece.status === "board",
    );
    expect(new Set(getPseudoTargets(state, soldier.id))).toEqual(new Set(["C20", "C22"]));
  });

  it("promotes Red when moving C20 → C24 and then enables lateral C-line movement", () => {
    const state = sparseState([
      { faction: "red", role: "soldier", node: "C20", leftHome: true },
    ]);
    const soldier = state.pieces.find(
      (piece) => piece.faction === "red" && piece.role === "soldier" && piece.status === "board",
    );

    const action = getLegalActions(state).find(
      (candidate) => candidate.pieceId === soldier.id && candidate.to === "C24",
    );
    expect(action).toBeTruthy();

    const result = applyAction(state, action);
    expect(result.error).toBeNull();

    const moved = result.state.pieces.find((piece) => piece.id === soldier.id);
    expect(moved.promoted).toBe(true);
    expect(moved.node).toBe("C24");

    result.state.turn = "red";
    result.state.activeFactions = ["red"];
    result.state.repetition = {};
    const promotedTargets = getPseudoTargets(result.state, moved.id);
    expect(promotedTargets).toContain("C19");
    expect(promotedTargets).toContain("C23");
  });
});

describe("terrain and special movement", () => {
  it("blocks Chariot and Horse across Sea edges", () => {
    const state = sparseState([
      { faction: "red", role: "chariot", node: "C20" },
    ]);
    const chariot = state.pieces.find(
      (piece) => piece.role === "chariot" && piece.status === "board",
    );
    const targets = getPseudoTargets(state, chariot.id);
    expect(targets).not.toContain("C24");
    expect(targets).not.toContain("C22");
    expect(targets).toContain("C19");
    expect(targets).toContain("C21");
  });

  it("marks direct Mountain crossings as Cannon-blocked while alternate edges remain open", () => {
    expect(__testing.pathEdgeAllowedForRole("cannon", "C3", "C17")).toBe(false);
    expect(__testing.pathEdgeAllowedForRole("cannon", "C3", "C19")).toBe(true);
    expect(__testing.pathEdgeAllowedForRole("chariot", "C3", "C17")).toBe(true);
  });

  it("blocks Cannon but not Chariot through a City connection", () => {
    const cannonState = sparseState([
      { faction: "red", role: "cannon", node: "red:L1-5" },
    ]);
    const cannon = cannonState.pieces.find(
      (piece) => piece.role === "cannon" && piece.status === "board",
    );
    expect(getPseudoTargets(cannonState, cannon.id)).not.toContain("blue:L9-5");

    const chariotState = sparseState([
      { faction: "red", role: "chariot", node: "red:L1-5" },
    ]);
    const chariot = chariotState.pieces.find(
      (piece) => piece.role === "chariot" && piece.status === "board",
    );
    expect(getPseudoTargets(chariotState, chariot.id)).toContain("blue:L9-5");
  });

  it("Fire advances diagonally and Flag moves exactly two forward points before leaving home", () => {
    const fireState = sparseState([
      { faction: "red", role: "fire", node: "red:L5-3" },
    ]);
    const fire = fireState.pieces.find(
      (piece) => piece.role === "fire" && piece.status === "board",
    );
    expect(new Set(getPseudoTargets(fireState, fire.id))).toEqual(
      new Set(["red:L4-4", "red:L6-4"]),
    );

    const flagState = sparseState([
      { faction: "red", role: "flag", node: "red:L5-1", leftHome: false },
    ]);
    const flag = flagState.pieces.find(
      (piece) => piece.role === "flag" && piece.status === "board",
    );
    expect(getPseudoTargets(flagState, flag.id)).toContain("red:L5-3");
    expect(getPseudoTargets(flagState, flag.id)).not.toContain("red:L5-2");
  });
});

describe("legality and turn flow", () => {
  it("generates legal Red opening actions", () => {
    const state = createInitialState();
    const actions = getLegalActions(state);
    expect(actions.length).toBeGreaterThan(0);
    expect(actions.every((action) => state.pieces.find((piece) => piece.id === action.pieceId)?.owner === "red")).toBe(true);
  });

  it("applies Red Soldier L1-4 → L1-5 and advances to Green", () => {
    const state = createInitialState();
    const action = getLegalActions(state).find(
      (candidate) =>
        candidate.pieceId === "red-soldier-1" &&
        candidate.to === "red:L1-5",
    );

    expect(action).toBeTruthy();
    const result = applyAction(state, action);
    expect(result.error).toBeNull();
    expect(result.state.turn).toBe("green");
    expect(result.state.ply).toBe(1);
  });

  it("rejects malformed or illegal actions without mutating the source state", () => {
    const state = createInitialState();
    const result = applyAction(state, {
      type: "move",
      pieceId: "red-general-1",
      from: "red:L5-1",
      to: "C24",
    });

    expect(result.state).toBe(state);
    expect(result.error.code).toBe("ILLEGAL_ACTION");

    const wrongVersion = createInitialState();
    wrongVersion.rulesetVersion = "future";
    expect(validateAction(wrongVersion, {}).error.code).toBe("RULESET_MISMATCH");
  });
});
