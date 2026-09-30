import { describe, expect, it } from "vitest";
import {
  FACTIONS,
  RULESET_VERSION,
  applyAction,
  createInitialState,
  getLegalActions,
  getPseudoTargets,
  isInCheck,
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
      leftHome = !__testing.isOwnTerritory(faction, node),
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

describe("finalized 156-point board graph", () => {
  it("contains 135 arm nodes plus the 21 surviving central nodes", () => {
    expect(ALL_NODE_IDS).toHaveLength(156);
    expect(new Set(ALL_NODE_IDS).size).toBe(156);
    expect(ALL_NODE_IDS).not.toContain("C19");
    expect(ALL_NODE_IDS).not.toContain("C21");
    expect(ALL_NODE_IDS).not.toContain("C23");
    expect(boardPoint("red:L1-1")).toEqual([0.325114, 0.754632]);
    expect(boardPoint("C1")).toEqual([0.367515, 0.525993]);
    expect(boardPoint("C24")).toEqual([0.463424, 0.428472]);
  });

  it("records the revised continuation paths after deleting C19/C21/C23", () => {
    const byId = Object.fromEntries(CONTINUATION_LINES.map((entry) => [entry.id, entry.nodes]));
    expect(byId["RB-1"].slice(-6)).toEqual([
      "red:L1-5", "blue:L9-5", "blue:L9-4", "blue:L9-3", "blue:L9-2", "blue:L9-1",
    ]);
    expect(byId["RB-2"].slice(4, 7)).toEqual(["red:L2-5", "C1", "blue:L8-5"]);
    expect(byId["RB-3"].slice(4, 8)).toEqual(["red:L3-5", "C2", "C18", "blue:L7-5"]);
    expect(byId["RB-4"].slice(4, 8)).toEqual(["red:L4-5", "C3", "C17", "blue:L6-5"]);
    expect(byId["RB-5"].slice(4, 10)).toEqual([
      "red:L5-5", "C4", "C20", "C24", "C16", "blue:L5-5",
    ]);
    expect(byId["RG-5"].slice(4, 10)).toEqual([
      "red:L5-5", "C4", "C20", "C22", "C10", "green:L5-5",
    ]);
    expect(byId["RG-6"].slice(4, 8)).toEqual(["red:L6-5", "C5", "C9", "green:L4-5"]);
    expect(byId["RG-7"].slice(4, 8)).toEqual(["red:L7-5", "C6", "C8", "green:L3-5"]);
    expect(byId["RG-8"].slice(4, 7)).toEqual(["red:L8-5", "C7", "green:L2-5"]);
    expect(byId["BG-5"].slice(4, 10)).toEqual([
      "blue:L5-5", "C16", "C24", "C22", "C10", "green:L5-5",
    ]);
    expect(byId["BG-4"].slice(4, 8)).toEqual([
      "blue:L4-5", "C15", "C11", "green:L6-5",
    ]);
    expect(byId["BG-3"].slice(4, 8)).toEqual(["blue:L3-5", "C14", "C12", "green:L7-5"]);
    expect(byId["BG-2"].slice(4, 7)).toEqual(["blue:L2-5", "C13", "green:L8-5"]);
  });

  it("keeps only H1, H2 and H3 as central horizontal lines", () => {
    expect(CENTER_HORIZONTAL_LINES.map((entry) => entry.nodes)).toEqual([
      ["C1","C2","C3","C4","C5","C6","C7"],
      ["C13","C14","C15","C16","C17","C18","C1"],
      ["C7","C8","C9","C10","C11","C12","C13"],
    ]);
    expect(__testing.sidewaysNeighbors("C20")).toEqual([]);
    expect(__testing.sidewaysNeighbors("C22")).toEqual([]);
    expect(__testing.sidewaysNeighbors("C24")).toEqual([]);
  });
});

describe("faction-specific enemy territory and Soldier promotion", () => {
  it("assigns every central point to the canonical camp territory", () => {
    const exclusive = {
      red: ["C2","C3","C4","C5","C6","C20"],
      green: ["C8","C9","C10","C11","C12","C22"],
      blue: ["C14","C15","C16","C17","C18","C24"],
    };

    for (const [faction, nodes] of Object.entries(exclusive)) {
      for (const node of nodes) {
        expect(__testing.territoryCamps(node)).toEqual([faction]);
        expect(territoryOf(node, faction)).toBe("own");
      }
    }

    expect(__testing.territoryCamps("C1")).toEqual(["red", "blue"]);
    expect(__testing.territoryCamps("C7")).toEqual(["red", "green"]);
    expect(__testing.territoryCamps("C13")).toEqual(["green", "blue"]);

    expect(territoryOf("C1", "red")).toBe("shared-own");
    expect(territoryOf("C1", "blue")).toBe("shared-own");
    expect(territoryOf("C1", "green")).toBe("enemy");

    expect(territoryOf("C7", "red")).toBe("shared-own");
    expect(territoryOf("C7", "green")).toBe("shared-own");
    expect(territoryOf("C7", "blue")).toBe("enemy");

    expect(territoryOf("C13", "green")).toBe("shared-own");
    expect(territoryOf("C13", "blue")).toBe("shared-own");
    expect(territoryOf("C13", "red")).toBe("enemy");
  });

  it("does not promote or mark a Flag as having left home when it lands on its shared gate", () => {
    const state = sparseState([
      { faction: "red", role: "flag", node: "red:L2-4", leftHome: false },
    ], "red", ["red"]);

    const flag = state.pieces.find(
      (piece) => piece.faction === "red" && piece.role === "flag" && piece.status === "board",
    );
    const action = getLegalActions(state).find(
      (candidate) => candidate.pieceId === flag.id && candidate.to === "C1",
    );
    expect(action).toBeTruthy();

    const result = applyAction(state, action);
    expect(result.error).toBeNull();
    const moved = result.state.pieces.find((piece) => piece.id === flag.id);
    expect(moved.node).toBe("C1");
    expect(moved.leftHome).toBe(false);
  });


  it("preserves the Red enemy status of all surviving C-points", () => {
    const enemy = [8,9,10,11,12,13,14,15,16,17,18,22,24];
    const safe = [1,2,3,4,5,6,7,20];
    for (const number of enemy) expect(territoryOf(`C${number}`, "red")).toBe("enemy");
    for (const number of safe) expect(territoryOf(`C${number}`, "red")).not.toBe("enemy");
  });

  it("preserves the Blue enemy status of all surviving C-points", () => {
    const safe = [1,13,14,15,16,17,18,24];
    const enemy = [2,3,4,5,6,7,8,9,10,11,12,20,22];
    for (const number of enemy) expect(territoryOf(`C${number}`, "blue")).toBe("enemy");
    for (const number of safe) expect(territoryOf(`C${number}`, "blue")).not.toBe("enemy");
  });

  it("preserves the Green enemy status of all surviving C-points", () => {
    const safe = [7,8,9,10,11,12,13,22];
    const enemy = [1,2,3,4,5,6,14,15,16,17,18,20,24];
    for (const number of enemy) expect(territoryOf(`C${number}`, "green")).toBe("enemy");
    for (const number of safe) expect(territoryOf(`C${number}`, "green")).not.toBe("enemy");
  });

  it("does not promote a Soldier when it enters a shared gate owned by its camp", () => {
    const cases = [
      ["red", "red:L2-5", "C1"],
      ["blue", "blue:L2-5", "C13"],
      ["green", "green:L2-5", "C7"],
    ];

    for (const [faction, node, sharedGate] of cases) {
      const state = sparseState([
        { faction, role: "soldier", node, promoted: false, leftHome: false },
      ], faction, [faction]);
      const soldier = state.pieces.find(
        (piece) => piece.faction === faction && piece.role === "soldier" && piece.status === "board",
      );
      const action = getLegalActions(state).find(
        (candidate) => candidate.pieceId === soldier.id && candidate.to === sharedGate,
      );
      expect(action).toBeTruthy();

      const result = applyAction(state, action);
      expect(result.error).toBeNull();
      const moved = result.state.pieces.find((piece) => piece.id === soldier.id);
      expect(moved.promoted).toBe(false);
      expect(moved.leftHome).toBe(false);
    }
  });

  it("keeps the approved Blue Soldier branch from C24 to C20 or C22", () => {
    const state = sparseState([
      { faction: "blue", role: "soldier", node: "C24" },
    ], "blue", ["blue"]);
    const soldier = state.pieces.find(
      (piece) => piece.faction === "blue" && piece.role === "soldier" && piece.status === "board",
    );
    expect(new Set(getPseudoTargets(state, soldier.id))).toEqual(new Set(["C20", "C22"]));
  });

  it("keeps forward movement after Soldier promotion and adds sideways movement", () => {
    const state = sparseState([
      {
        faction: "red",
        role: "soldier",
        node: "blue:L5-4",
        promoted: true,
        leftHome: true,
      },
    ]);
    const soldier = state.pieces.find(
      (piece) => piece.faction === "red" && piece.role === "soldier" && piece.status === "board",
    );
    const targets = new Set(getPseudoTargets(state, soldier.id));

    expect(targets).toContain("blue:L5-3");
    expect(targets).toContain("blue:L4-4");
    expect(targets).toContain("blue:L6-4");
  });

  it("still promotes Red when moving C20 to C24 without recreating deleted horizontal nodes", () => {
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
    expect(__testing.sidewaysNeighbors("C24")).toEqual([]);
  });
});

describe("terrain and special movement", () => {
  it("treats C3-C17, C5-C9 and C15-C11 as Sea crossings: Cannon allowed, Horse/Chariot blocked", () => {
    for (const [a, b] of [["C3","C17"], ["C5","C9"], ["C15","C11"]]) {
      expect(__testing.terrainBetween(a, b)).toBe("sea");
      expect(__testing.pathEdgeAllowedForRole("cannon", a, b, "red")).toBe(true);
      expect(__testing.pathEdgeAllowedForRole("chariot", a, b, "red")).toBe(false);
      expect(__testing.pathEdgeAllowedForRole("horse", a, b, "red")).toBe(false);
      expect(__testing.pathEdgeAllowedForRole("horse", b, a, "red")).toBe(false);
    }
  });

  it("keeps C20/C22/C24 as continuation-only central stopping points and lets Cannon traverse them", () => {
    for (const [a, b] of [["C4","C20"], ["C20","C22"], ["C20","C24"], ["C24","C22"]]) {
      expect(__testing.terrainBetween(a, b)).toBe("sea");
      expect(__testing.pathEdgeAllowedForRole("cannon", a, b, "red")).toBe(true);
    }
    const state = sparseState([
      { faction: "red", role: "cannon", node: "C4" },
    ]);
    const cannon = state.pieces.find(
      (piece) => piece.role === "cannon" && piece.status === "board",
    );
    const targets = getPseudoTargets(state, cannon.id);
    expect(targets).toContain("C20");
    expect(targets).toContain("C22");
    expect(targets).toContain("C24");
  });

  it("keeps Cannon sideways movement on a clear rank", () => {
    const state = sparseState([
      { faction: "red", role: "cannon", node: "blue:L5-4", leftHome: true },
    ]);
    const cannon = state.pieces.find(
      (piece) => piece.role === "cannon" && piece.status === "board",
    );
    const targets = new Set(getPseudoTargets(state, cannon.id));

    expect(targets).toContain("blue:L4-4");
    expect(targets).toContain("blue:L6-4");
  });

  it("lets a Cannon on Blue L5-4 use both central branches through C24", () => {
    const state = sparseState([
      { faction: "red", role: "cannon", node: "blue:L5-4", leftHome: true },
    ]);
    const cannon = state.pieces.find(
      (piece) => piece.role === "cannon" && piece.status === "board",
    );
    const targets = new Set(getPseudoTargets(state, cannon.id));

    expect(targets).toContain("C24");
    expect(targets).toContain("C20");
    expect(targets).toContain("C22");
    expect(targets).toContain("C10");
    expect(targets).toContain("green:L5-5");
  });

  it("allows Red Horse L4-5 to reach C18 when the Sea edge is not its first leg", () => {
    const state = sparseState([
      { faction: "red", role: "horse", node: "red:L4-5" },
    ]);
    const horse = state.pieces.find(
      (piece) => piece.role === "horse" && piece.status === "board",
    );

    expect(getPseudoTargets(state, horse.id)).toContain("C18");
  });

  it("supports the six compressed center Horse jumps at the three kingdom tips", () => {
    const cases = [
      ["red", "red:L4-5", "C20"],
      ["red", "red:L6-5", "C20"],
      ["green", "green:L4-5", "C22"],
      ["green", "green:L6-5", "C22"],
      ["blue", "blue:L4-5", "C24"],
      ["blue", "blue:L6-5", "C24"],
    ];

    for (const [faction, node, target] of cases) {
      const state = sparseState([
        { faction, role: "horse", node },
      ], faction, [faction]);
      const horse = state.pieces.find(
        (piece) => piece.faction === faction && piece.role === "horse" && piece.status === "board",
      );
      expect(getPseudoTargets(state, horse.id)).toContain(target);
    }
  });

  it("supports the reverse Horse jumps from C20/C22/C24 back to the flanking rank-five points", () => {
    const cases = [
      ["red", "C20", ["red:L4-5", "red:L6-5"]],
      ["green", "C22", ["green:L4-5", "green:L6-5"]],
      ["blue", "C24", ["blue:L4-5", "blue:L6-5"]],
    ];

    for (const [faction, node, targets] of cases) {
      const state = sparseState([
        { faction, role: "horse", node, leftHome: true },
      ], faction, [faction]);
      const horse = state.pieces.find(
        (piece) => piece.faction === faction && piece.role === "horse" && piece.status === "board",
      );
      const legal = new Set(getPseudoTargets(state, horse.id));
      for (const target of targets) expect(legal).toContain(target);
    }
  });

  it("blocks Cannon through the three direct Mountain crossings", () => {
    for (const [a, b] of [["C2","C18"], ["C6","C8"], ["C14","C12"]]) {
      expect(__testing.terrainBetween(a, b)).toBe("mountain");
      expect(__testing.pathEdgeAllowedForRole("cannon", a, b, "red")).toBe(false);
      expect(__testing.pathEdgeAllowedForRole("chariot", a, b, "red")).toBe(true);
    }
  });

  it("lets Cannon stop at Fort boundary points but blocks the approved onward Fort exits", () => {
    const redState = sparseState([
      { faction: "red", role: "cannon", node: "red:L2-5" },
    ]);
    const redCannon = redState.pieces.find(
      (piece) => piece.faction === "red" && piece.role === "cannon" && piece.status === "board",
    );
    const redTargets = getPseudoTargets(redState, redCannon.id);
    expect(redTargets).toContain("C1");
    expect(redTargets).not.toContain("blue:L8-5");

    const blueState = sparseState([
      { faction: "blue", role: "cannon", node: "blue:L8-5" },
    ], "blue", ["blue"]);
    const blueCannon = blueState.pieces.find(
      (piece) => piece.faction === "blue" && piece.role === "cannon" && piece.status === "board",
    );
    const blueTargets = getPseudoTargets(blueState, blueCannon.id);
    expect(blueTargets).toContain("C1");
    expect(blueTargets).not.toContain("red:L2-5");
  });

  it("blocks Cannon but not Chariot through a direct outer Fort connection", () => {
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

  it("keeps the six outer Fort-seam Fire diagonals", () => {
    const cases = [
      ["red", "red:L2-5", "blue:L9-5"],
      ["red", "red:L8-5", "green:L1-5"],
      ["green", "green:L2-5", "red:L9-5"],
      ["green", "green:L8-5", "blue:L1-5"],
      ["blue", "blue:L2-5", "green:L9-5"],
      ["blue", "blue:L8-5", "red:L1-5"],
    ];

    for (const [faction, node, target] of cases) {
      const state = sparseState([{ faction, role: "fire", node }], faction, [faction]);
      const fire = state.pieces.find(
        (piece) =>
          piece.faction === faction &&
          piece.role === "fire" &&
          piece.status === "board",
      );

      expect(getPseudoTargets(state, fire.id)).toContain(target);
    }
  });

  it("uses the exact two Fire diagonals at each inner Fort-adjacent C-point", () => {
    const cases = [
      ["red", "C2", ["C1", "C17"]],
      ["red", "C6", ["C7", "C9"]],
      ["green", "C8", ["C5", "C7"]],
      ["green", "C12", ["C13", "C15"]],
      ["blue", "C14", ["C13", "C11"]],
      ["blue", "C18", ["C1", "C3"]],
    ];

    for (const [faction, node, targets] of cases) {
      const state = sparseState([{ faction, role: "fire", node }], faction, [faction]);
      const fire = state.pieces.find(
        (piece) =>
          piece.faction === faction &&
          piece.role === "fire" &&
          piece.status === "board",
      );

      expect(new Set(getPseudoTargets(state, fire.id))).toEqual(new Set(targets));
    }
  });

  it("removes the six incorrect inner Fire-to-arm seam destinations", () => {
    const cases = [
      ["red", "C2", "blue:L8-5"],
      ["red", "C6", "green:L2-5"],
      ["green", "C8", "red:L8-5"],
      ["green", "C12", "blue:L2-5"],
      ["blue", "C14", "green:L8-5"],
      ["blue", "C18", "red:L2-5"],
    ];

    for (const [faction, node, wrongTarget] of cases) {
      const state = sparseState([{ faction, role: "fire", node }], faction, [faction]);
      const fire = state.pieces.find(
        (piece) =>
          piece.faction === faction &&
          piece.role === "fire" &&
          piece.status === "board",
      );

      expect(getPseudoTargets(state, fire.id)).not.toContain(wrongTarget);
    }
  });

  it("does not give another faction a Fire seam move just because it occupies the same node", () => {
    const state = sparseState([
      { faction: "blue", role: "fire", node: "C6", leftHome: true },
    ], "blue", ["blue"]);
    const fire = state.pieces.find(
      (piece) => piece.faction === "blue" && piece.role === "fire" && piece.status === "board",
    );

    expect(getPseudoTargets(state, fire.id)).not.toContain("C7");
    expect(getPseudoTargets(state, fire.id)).not.toContain("C9");
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

  it("lets a crossed Flag return to any shared gate belonging to its original camp", () => {
    const cases = [
      ["red", "C18", "C1"],
      ["blue", "C2", "C1"],
      ["red", "C8", "C7"],
      ["green", "C6", "C7"],
      ["green", "C14", "C13"],
      ["blue", "C12", "C13"],
    ];

    for (const [faction, node, sharedGate] of cases) {
      const state = sparseState([
        { faction, role: "flag", node, leftHome: true },
      ], faction, [faction]);
      const flag = state.pieces.find(
        (piece) => piece.faction === faction && piece.role === "flag" && piece.status === "board",
      );
      expect(getPseudoTargets(state, flag.id)).toContain(sharedGate);
    }
  });

  it("treats a shared gate as the return boundary for a crossed Flag", () => {
    const cases = [
      ["red", "C1", "C2"],
      ["blue", "C1", "C18"],
      ["red", "C7", "C6"],
      ["green", "C7", "C8"],
      ["green", "C13", "C12"],
      ["blue", "C13", "C14"],
    ];

    for (const [faction, sharedGate, exclusiveHome] of cases) {
      const state = sparseState([
        { faction, role: "flag", node: sharedGate, leftHome: true },
      ], faction, [faction]);
      const flag = state.pieces.find(
        (piece) => piece.faction === faction && piece.role === "flag" && piece.status === "board",
      );
      expect(getPseudoTargets(state, flag.id)).not.toContain(exclusiveHome);
    }
  });

  it("makes Flag Chariot-like after leaving home and prevents return to its original kingdom", () => {
    const state = sparseState([
      {
        faction: "red",
        role: "flag",
        node: "blue:L5-4",
        leftHome: true,
      },
    ]);
    const flag = state.pieces.find(
      (piece) => piece.role === "flag" && piece.status === "board",
    );
    const targets = new Set(getPseudoTargets(state, flag.id));

    expect(targets).toContain("blue:L5-3");
    expect(targets).toContain("blue:L5-2");
    expect(targets).toContain("blue:L5-1");
    expect(targets).toContain("blue:L1-4");
    expect(targets).not.toContain("red:L5-5");
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

  it("keeps Cannon geometry but pins Blue L5-4 moves that expose the Red General", () => {
    const state = sparseState([
      { faction: "red", role: "cannon", node: "blue:L5-4", leftHome: true },
      // Block the separate Red-Green flying-General line so this regression
      // isolates the Red-Blue pin created by the Cannon on RB-5.
      { faction: "red", role: "soldier", node: "green:L5-3", leftHome: true },
    ], "red", ["red", "green", "blue"]);

    // The Cannon currently blocks the Red/Blue flying-General line.
    expect(isInCheck(state, "red")).toBe(false);

    const cannon = state.pieces.find(
      (piece) =>
        piece.faction === "red" &&
        piece.role === "cannon" &&
        piece.status === "board" &&
        piece.node === "blue:L5-4",
    );

    // Geometrically the Cannon still has its normal sideways and Green-branch
    // routes. The flying-General rule is a legality filter, not a Cannon
    // movement restriction.
    const pseudo = new Set(getPseudoTargets(state, cannon.id));
    expect(pseudo).toContain("blue:L4-4");
    expect(pseudo).toContain("blue:L6-4");
    expect(pseudo).toContain("C24");
    expect(pseudo).toContain("C22");
    expect(pseudo).toContain("C10");
    expect(pseudo).toContain("green:L5-5");

    const legal = new Set(
      getLegalActions(state)
        .filter((action) => action.pieceId === cannon.id)
        .map((action) => action.to),
    );

    // In this exact position those moves are illegal because moving the Cannon
    // off RB-5 exposes Red's General to Blue's General.
    expect(legal).not.toContain("blue:L4-4");
    expect(legal).not.toContain("blue:L6-4");
    expect(legal).not.toContain("C24");
    expect(legal).not.toContain("C22");
    expect(legal).not.toContain("C10");
    expect(legal).not.toContain("green:L5-5");
  });

  it("interrupts the cycle for a third-party discovered check, then resumes the skipped turn", () => {
    const state = sparseState([
      { faction: "red", role: "cannon", node: "C10", leftHome: true },
      // Keep the Red and Blue Generals from facing directly across RB-5 so
      // Blue's blocker move is otherwise legal.
      { faction: "red", role: "soldier", node: "C20", leftHome: true },
      { faction: "green", role: "soldier", node: "green:L5-3" },
      {
        faction: "blue",
        role: "chariot",
        node: "green:L5-4",
        leftHome: true,
      },
    ], "blue", ["red", "green", "blue"]);

    const blueBlocker = state.pieces.find(
      (piece) =>
        piece.faction === "blue" &&
        piece.role === "chariot" &&
        piece.status === "board" &&
        piece.node === "green:L5-4",
    );

    const uncover = getLegalActions(state).find(
      (action) => action.pieceId === blueBlocker.id && action.to === "green:L4-4",
    );
    expect(uncover).toBeTruthy();

    const checked = applyAction(state, uncover);
    expect(checked.error).toBeNull();
    expect(checked.state.turn).toBe("green");
    expect(checked.state.resumeTurn).toBe("red");
    expect(isInCheck(checked.state, "green")).toBe(true);
    expect(__testing.checkingFactions(checked.state, "green")).toContain("red");

    const reply = getLegalActions(checked.state).find((action) => {
      const candidate = applyAction(checked.state, action);
      return (
        !candidate.error &&
        !isInCheck(candidate.state, "green") &&
        candidate.state.turn === "red"
      );
    });
    expect(reply).toBeTruthy();

    const resumed = applyAction(checked.state, reply);
    expect(resumed.error).toBeNull();
    expect(resumed.state.turn).toBe("red");
    expect(resumed.state.resumeTurn).toBeNull();
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
