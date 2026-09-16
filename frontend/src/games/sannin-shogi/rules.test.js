import { describe, expect, it } from "vitest";
import {
  FACTIONS,
  RULESET_VERSION,
  __testing,
  applyAction,
  assetRole,
  createInitialState,
  getBoardPiece,
  getHand,
  getLegalActions,
  getPseudoTargets,
  isHomeTerritory,
  validateAction
} from "./rules.js";
import { HEX_CELLS, cellKey, hexDistance, rotateAxial } from "./hex.js";

function sparseState(spec, turn = "red") {
  const state = createInitialState();
  for (const piece of state.pieces) {
    piece.status = "eliminated";
    piece.cell = null;
  }
  for (const [id, owner, type, cell, promoted = false] of spec) {
    const piece = state.pieces.find((candidate) => candidate.id === id) ||
      state.pieces.find((candidate) => candidate.owner === owner && candidate.type === type && candidate.status === "eliminated");
    piece.id = id;
    piece.owner = owner;
    piece.type = type;
    piece.cell = cell;
    piece.status = "board";
    piece.promoted = promoted;
    piece.hasMoved = false;
    piece.everChecked = false;
    piece.illuminationReady = true;
  }
  state.turn = turn;
  state.repetition = {};
  state.lastAction = null;
  return state;
}

describe("Sannin Shogi canonical state", () => {
  it("creates the exact 54-piece, three-faction setup", () => {
    const state = createInitialState();
    expect(state.rulesetVersion).toBe(RULESET_VERSION);
    expect(state.pieces).toHaveLength(54);
    expect(new Set(state.pieces.map((piece) => piece.cell)).size).toBe(54);
    for (const faction of FACTIONS) {
      const army = state.pieces.filter((piece) => piece.owner === faction);
      expect(army).toHaveLength(18);
      expect(army.filter((piece) => piece.type === "king")).toHaveLength(1);
      expect(army.filter((piece) => piece.type === "pawn")).toHaveLength(8);
    }
    expect(getBoardPiece(state, "6,-3")?.id).toBe("red-king-1");
    expect(getBoardPiece(state, "-3,6")?.id).toBe("green-king-1");
    expect(getBoardPiece(state, "-3,-3")?.id).toBe("blue-king-1");
  });

  it("the complete formation is exactly equivalent under 120-degree rotations", () => {
    const state = createInitialState();
    const green = state.pieces.filter((piece) => piece.owner === "green");
    for (const piece of green) {
      const cell = state.pieces.find((candidate) => candidate.owner === "blue" && candidate.type === piece.type &&
        candidate.cell === cellKey(...Object.values(rotateAxial(piece.cell, 2)).slice(0, 2)));
      expect(cell).toBeTruthy();
    }
  });

  it("uses all 127 canonical board cells and three disjoint 24-cell homes", () => {
    expect(HEX_CELLS).toHaveLength(127);
    for (const faction of FACTIONS) {
      expect(HEX_CELLS.filter((cell) => isHomeTerritory(cell.id, faction))).toHaveLength(24);
    }
    expect(HEX_CELLS.filter((cell) => FACTIONS.some((faction) => isHomeTerritory(cell.id, faction)))).toHaveLength(72);
  });

  it("is fully JSON serializable and deterministic", () => {
    const a = createInitialState();
    const b = JSON.parse(JSON.stringify(a));
    expect(getLegalActions(b)).toEqual(getLegalActions(a));
  });

  it("rejects mismatched rulesets and malformed alliances at the public boundary", () => {
    const wrongVersion = createInitialState();
    wrongVersion.rulesetVersion = "future-unapproved-rules";
    expect(getLegalActions(wrongVersion)).toEqual([]);
    expect(validateAction(wrongVersion, {}).error.code).toBe("RULESET_MISMATCH");

    const malformedAlliance = createInitialState();
    malformedAlliance.alliance = ["red", "red"];
    expect(getLegalActions(malformedAlliance)).toEqual([]);
    expect(validateAction(malformedAlliance, {}).error.code).toBe("INVALID_ALLIANCE");

    const duplicateOccupancy = createInitialState();
    duplicateOccupancy.pieces[1].cell = duplicateOccupancy.pieces[0].cell;
    expect(getLegalActions(duplicateOccupancy)).toEqual([]);
    expect(validateAction(duplicateOccupancy, {}).error.code).toBe("INVALID_STATE");
  });

  it("canonicalizes repetition identity across irrelevant piece IDs and nonroyal move flags", () => {
    const state = createInitialState();
    const equivalent = JSON.parse(JSON.stringify(state));
    const rook = equivalent.pieces.find((piece) => piece.type === "rook");
    rook.hasMoved = !rook.hasMoved;
    const pawns = equivalent.pieces.filter((piece) => piece.owner === "red" && piece.type === "pawn").slice(0, 2);
    [pawns[0].id, pawns[1].id] = [pawns[1].id, pawns[0].id];
    expect(__testing.positionKey(equivalent)).toBe(__testing.positionKey(state));
  });
});

describe("movement and actions", () => {
  it("matches every unpromoted Middle-seat movement vector", () => {
    const expected = {
      king: ["1,-1", "1,0", "0,1", "-1,1", "-1,0", "0,-1"],
      rook: ["0,-1", "1,-1", "1,0", "-1,0", "-1,2"],
      bishop: ["1,-2", "2,-1", "1,1", "-1,2", "-2,1", "-1,-1"],
      gold: ["0,-1", "1,-1", "1,0", "-1,0", "1,-2", "-1,2"],
      knight: ["1,0", "-1,0", "2,-1", "1,1", "-2,1", "-1,-1"],
      silver: ["0,-1", "1,-1", "0,1", "-1,1", "-1,-1", "2,-1"],
      lance: ["0,-1", "1,-1"],
      pawn: ["0,-1", "1,-1"]
    };
    for (const [type, cells] of Object.entries(expected)) {
      const id = `green-${type}-1`;
      const state = sparseState([[id, "green", type, "0,0"]], "green");
      const targets = getPseudoTargets(state, id);
      expect(cells.every((cell) => targets.includes(cell)), type).toBe(true);
    }
  });

  it("implements the special diagonal ray as distance-two landings", () => {
    const state = sparseState([
      ["red-king-1", "red", "king", "5,-2"],
      ["green-king-1", "green", "king", "-3,5"],
      ["blue-king-1", "blue", "king", "-3,-2"],
      ["red-bishop-1", "red", "bishop", "0,0"]
    ]);
    const targets = getPseudoTargets(state, "red-bishop-1");
    expect(targets).toContain("1,1");
    expect(hexDistance("0,0", "1,1")).toBe(2);
    expect(targets).not.toContain("1,0");
  });

  it("radian rays pass between occupied flanks but stop on occupied landing cells", () => {
    const state = sparseState([
      ["green-bishop-1", "green", "bishop", "0,0"],
      ["green-pawn-1", "green", "pawn", "1,-1"],
      ["green-pawn-2", "green", "pawn", "0,-1"]
    ], "green");
    expect(getPseudoTargets(state, "green-bishop-1")).toContain("1,-2");
    const landingBlock = sparseState([
      ["green-bishop-1", "green", "bishop", "0,0"],
      ["green-pawn-1", "green", "pawn", "1,-2"]
    ], "green");
    expect(getPseudoTargets(landingBlock, "green-bishop-1")).not.toContain("1,-2");
    expect(getPseudoTargets(landingBlock, "green-bishop-1")).not.toContain("2,-4");
  });

  it("changes allegiance, demotes, and preserves identity on capture", () => {
    const state = sparseState([
      ["red-king-1", "red", "king", "5,-2"],
      ["green-king-1", "green", "king", "-3,5"],
      ["blue-king-1", "blue", "king", "-3,-2"],
      ["red-rook-1", "red", "rook", "0,0"],
      ["green-silver-1", "green", "silver", "-1,0", true]
    ]);
    const action = getLegalActions(state).find((candidate) => candidate.pieceId === "red-rook-1" && candidate.to === "-1,0" && !candidate.promote);
    const result = applyAction(state, action);
    const captive = result.state.pieces.find((piece) => piece.id === "green-silver-1");
    expect(captive).toMatchObject({ owner: "red", status: "hand", cell: null, promoted: false });
    expect(getHand(result.state, "red").map((piece) => piece.id)).toContain("green-silver-1");
  });

  it("offers optional promotion and maps promoted art roles", () => {
    const state = sparseState([
      ["red-king-1", "red", "king", "5,-2"],
      ["green-king-1", "green", "king", "-3,5"],
      ["blue-king-1", "blue", "king", "-3,-2"],
      ["red-rook-1", "red", "rook", "-3,4"]
    ]);
    const rookActions = getLegalActions(state).filter((action) => action.pieceId === "red-rook-1");
    const destination = rookActions.find((action) => action.promote)?.to;
    const choices = rookActions.filter((action) => action.to === destination);
    expect(choices.map((action) => action.promote).sort()).toEqual([false, true]);
    const promoted = applyAction(state, choices.find((action) => action.promote)).state.pieces.find((piece) => piece.id === "red-rook-1");
    expect(promoted.promoted).toBe(true);
    expect(assetRole(promoted)).toBe("dragon");
  });

  it("offers first-move king castling throughout home territory", () => {
    const state = sparseState([
      ["red-king-1", "red", "king", "6,-3"],
      ["green-king-1", "green", "king", "-3,6"],
      ["blue-king-1", "blue", "king", "-3,-3"]
    ]);
    const castles = getLegalActions(state).filter((action) => action.type === "castle");
    expect(castles.length).toBeGreaterThan(10);
    expect(castles.every((action) => isHomeTerritory(action.to, "red"))).toBe(true);
    const kingActions = getLegalActions(state).filter((action) => action.pieceId === "red-king-1");
    expect(new Set(kingActions.map((action) => action.to)).size).toBe(kingActions.length);
  });

  it("rejects illegal actions without changing the state object", () => {
    const state = createInitialState();
    const action = { type: "move", pieceId: "red-king-1", from: "6,-3", to: "0,0", promote: false };
    expect(validateAction(state, action).ok).toBe(false);
    const result = applyAction(state, action);
    expect(result.state).toBe(state);
    expect(result.error.code).toBe("ILLEGAL_ACTION");
  });

  it("permanently records check after the King escapes it", () => {
    const state = sparseState([
      ["red-king-1", "red", "king", "0,0"],
      ["green-king-1", "green", "king", "-3,5"],
      ["blue-king-1", "blue", "king", "-3,-2"],
      ["green-rook-1", "green", "rook", "2,0"]
    ]);
    expect(getLegalActions(state).some((action) => action.pieceId === "red-king-1")).toBe(true);
    const escape = getLegalActions(state).find((action) => action.pieceId === "red-king-1");
    const result = applyAction(state, escape);
    expect(result.state.pieces.find((piece) => piece.id === "red-king-1").everChecked).toBe(true);
  });

  it("forbids an allied move that reveals check on the allied King", () => {
    const state = sparseState([
      ["green-king-1", "green", "king", "-3,5"],
      ["blue-king-1", "blue", "king", "0,0"],
      ["red-king-1", "red", "king", "5,-3"],
      ["green-rook-1", "green", "rook", "2,0"],
      ["green-gold-1", "green", "gold", "1,0"]
    ], "green");
    state.alliance = ["blue", "green"];
    state.castlingCancelled = { red: true, green: true, blue: true };
    expect(getLegalActions(state).filter((action) => action.pieceId === "green-gold-1")).toHaveLength(0);
  });

  it("rejects a compulsory-alliance trigger that would make the new allies check one another", () => {
    const state = sparseState([
      ["red-king-1", "red", "king", "3,0"],
      ["green-king-1", "green", "king", "-3,5"],
      ["blue-king-1", "blue", "king", "-3,-2"],
      ["green-rook-1", "green", "rook", "2,0"],
      ["blue-rook-1", "blue", "rook", "0,0"],
      ["green-pawn-1", "green", "pawn", "0,2"]
    ], "green");
    const pawnAdvance = (candidate) => candidate.pieceId === "green-pawn-1" && candidate.to === "0,1";
    expect(getLegalActions(state).some(pawnAdvance)).toBe(true);
    state.pending.attack = { actor: "red", target: "blue", targets: ["blue-pawn-8"] };
    expect(getLegalActions(state).some(pawnAdvance)).toBe(false);
  });

  it("forms a safe compulsory alliance without treating the new ally as mated", () => {
    const state = sparseState([
      ["red-king-1", "red", "king", "5,-3"],
      ["green-king-1", "green", "king", "-3,5"],
      ["blue-king-1", "blue", "king", "-3,-2"],
      ["blue-rook-1", "blue", "rook", "0,0"],
      ["green-pawn-1", "green", "pawn", "0,2"]
    ], "green");
    state.pending.attack = { actor: "red", target: "blue", targets: ["blue-pawn-8"] };
    const action = getLegalActions(state).find((candidate) => candidate.pieceId === "green-pawn-1" && candidate.to === "0,1");
    const result = applyAction(state, action);
    expect(result.error).toBeNull();
    expect(result.state.alliance).toEqual(["green", "red"]);
    expect(result.state.outcome).toBeNull();
    expect(result.state.activeFactions).toEqual(FACTIONS);
  });

  it("rejects a move whose resulting full position is already recorded", () => {
    const state = createInitialState();
    const action = getLegalActions(state).find((candidate) => candidate.type === "move" && candidate.pieceId.startsWith("red-pawn"));
    const next = applyAction(state, action).state;
    state.repetition[__testing.positionKey(next)] = "earlier";
    expect(getLegalActions(state).some((candidate) => JSON.stringify(candidate) === JSON.stringify(action))).toBe(false);
  });

  it("checks repetition after a move finalizes the threat ledger and alliance", () => {
    const state = sparseState([
      ["red-king-1", "red", "king", "5,-3"],
      ["green-king-1", "green", "king", "-3,5"],
      ["blue-king-1", "blue", "king", "-3,-2"],
      ["blue-rook-1", "blue", "rook", "0,0"],
      ["green-pawn-1", "green", "pawn", "0,2"]
    ], "green");
    state.pending.attack = { actor: "red", target: "blue", targets: ["blue-pawn-8"] };
    const matches = (candidate) => candidate.pieceId === "green-pawn-1" && candidate.to === "0,1";
    const action = getLegalActions(state).find(matches);
    const repeated = applyAction(state, action).state;
    state.repetition[__testing.positionKey(repeated)] = "red";
    expect(getLegalActions(state).some(matches)).toBe(false);
  });

  it("records an alliance checkmate as a win rather than a draw", () => {
    const state = sparseState([
      ["red-king-1", "red", "king", "5,-2"],
      ["green-king-1", "green", "king", "-3,5"],
      ["blue-king-1", "blue", "king", "0,0"],
      ["red-rook-1", "red", "rook", "2,0", true],
      ["red-pawn-1", "red", "pawn", "4,-2"]
    ]);
    state.alliance = ["blue", "green"];
    state.castlingCancelled = { red: true, green: true, blue: true };
    const waitingMove = getLegalActions(state).find((action) => action.pieceId === "red-pawn-1");
    expect(waitingMove).toBeTruthy();
    const result = applyAction(state, waitingMove);
    expect(result.state.outcome).toMatchObject({ type: "mate", winner: "red", losers: ["blue", "green"] });
  });

  it("awards immediate victory to a safe, non-allied king entering the Garden", () => {
    const state = sparseState([
      ["red-king-1", "red", "king", "1,-1"],
      ["green-king-1", "green", "king", "-3,5"],
      ["blue-king-1", "blue", "king", "-3,-2"]
    ]);
    state.pieces.find((piece) => piece.id === "red-king-1").hasMoved = true;
    const action = getLegalActions(state).find((candidate) => candidate.pieceId === "red-king-1" && candidate.to === "0,0");
    const result = applyAction(state, action);
    expect(result.state.outcome).toMatchObject({ type: "garden", winner: "red" });
  });

  it("illumination removes every eligible first unprotected target", () => {
    const state = sparseState([
      ["red-king-1", "red", "king", "0,0", true],
      ["green-king-1", "green", "king", "-3,5"],
      ["blue-king-1", "blue", "king", "-3,-2"],
      ["green-pawn-1", "green", "pawn", "1,0"],
      ["blue-pawn-1", "blue", "pawn", "-1,0"]
    ]);
    const redKing = state.pieces.find((piece) => piece.id === "red-king-1");
    redKing.hasMoved = true;
    const illuminate = getLegalActions(state).find((action) => action.type === "illuminate");
    expect(illuminate.targets).toEqual(["blue-pawn-1", "green-pawn-1"]);
    const result = applyAction(state, illuminate);
    expect(result.state.pieces.filter((piece) => ["blue-pawn-1", "green-pawn-1"].includes(piece.id)).every((piece) => piece.status === "hand" && piece.owner === "red")).toBe(true);
  });

  it("starts an allied game with the lone player's illuminated king and no castling", () => {
    const state = createInitialState({ alliance: ["green", "blue"] });
    expect(state.turn).toBe("red");
    expect(state.alliance).toEqual(["blue", "green"]);
    expect(state.pieces.find((piece) => piece.id === "red-king-1").promoted).toBe(true);
    expect(getLegalActions(state).some((action) => action.type === "castle")).toBe(false);
  });

  it("never exposes the supplied promoted-Knight art as a legal role", () => {
    expect(assetRole({ owner: "red", type: "knight", promoted: true })).toBe("knight");
    expect(assetRole({ owner: "red", type: "king", promoted: true })).toBe("king");
  });
});
