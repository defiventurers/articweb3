export const AURORA_VULTURE_RULESET = Object.freeze({
  gameId: "aurora-vulture",
  rulesetVersion: "kaooa-empty-board-single-jump-1.0.0",
  traditionalName: "Kaooa",
  source: "Kaooa historical and modern rules; Murray comparative description",
  region: "Central Provinces, India",
  players: 2,
  crows: 7,
  vultureCaptureTarget: 4,
  captureCompulsory: false,
  multipleCapture: false,
  repetitionDraw: 3,
  movementPlyLimit: 80,
  setupPolicy: "crow-first-empty-board"
});

export const SIDES = Object.freeze(["crows", "vulture"]);

export const POINTS = Object.freeze([
  { id: "o0", x: 50, y: 6, label: "North star point", kind: "outer" },
  { id: "o1", x: 91.85, y: 36.4, label: "North-east star point", kind: "outer" },
  { id: "o2", x: 75.86, y: 85.6, label: "South-east star point", kind: "outer" },
  { id: "o3", x: 24.14, y: 85.6, label: "South-west star point", kind: "outer" },
  { id: "o4", x: 8.15, y: 36.4, label: "North-west star point", kind: "outer" },
  { id: "i0", x: 59.88, y: 36.4, label: "Upper-right crossing", kind: "crossing" },
  { id: "i1", x: 65.98, y: 55.19, label: "Lower-right crossing", kind: "crossing" },
  { id: "i2", x: 50, y: 66.81, label: "South crossing", kind: "crossing" },
  { id: "i3", x: 34.02, y: 55.19, label: "Lower-left crossing", kind: "crossing" },
  { id: "i4", x: 40.12, y: 36.4, label: "Upper-left crossing", kind: "crossing" }
]);

export const LINES = Object.freeze([
  Object.freeze(["o0", "i0", "i1", "o2"]),
  Object.freeze(["o2", "i2", "i3", "o4"]),
  Object.freeze(["o4", "i4", "i0", "o1"]),
  Object.freeze(["o1", "i1", "i2", "o3"]),
  Object.freeze(["o3", "i3", "i4", "o0"])
]);

export const EDGES = Object.freeze(uniquePairs(LINES.flatMap((line) => line.slice(0, -1).map((point, index) => [point, line[index + 1]]))));
export const ADJACENCY = Object.freeze(Object.fromEntries(POINTS.map((point) => [
  point.id,
  Object.freeze(EDGES.flatMap(([a, b]) => a === point.id ? [b] : b === point.id ? [a] : []))
])));
export const JUMPS = Object.freeze(Object.fromEntries(POINTS.map((point) => [point.id, Object.freeze(jumpsFrom(point.id))])));

export function createAuroraVultureState({ mode = "hotseat" } = {}) {
  const state = {
    gameId: AURORA_VULTURE_RULESET.gameId,
    rulesetVersion: AURORA_VULTURE_RULESET.rulesetVersion,
    mode,
    currentPlayer: "crows",
    phase: "deployment",
    vulture: { id: "vulture-1", side: "vulture", point: null, status: "waiting" },
    crows: Array.from({ length: AURORA_VULTURE_RULESET.crows }, (_, index) => ({
      id: `crow-${index + 1}`,
      side: "crows",
      point: null,
      status: "waiting"
    })),
    deployedCrows: 0,
    capturedCrows: 0,
    turn: 1,
    ply: 0,
    movementPly: 0,
    repetitions: {},
    lastAction: null,
    winner: null,
    isDraw: false,
    winReason: null,
    history: []
  };
  assertStateInvariant(state);
  return state;
}

export function createFourthCrowDrill() {
  const state = createAuroraVultureState({ mode: "drill" });
  state.phase = "movement";
  state.currentPlayer = "vulture";
  state.vulture = { id: "vulture-1", side: "vulture", point: "o0", status: "board" };
  const active = [
    ["crow-1", "i0"],
    ["crow-2", "o1"],
    ["crow-3", "o3"],
    ["crow-4", "o4"]
  ];
  state.crows.forEach((crow, index) => {
    const setup = active.find(([id]) => id === crow.id);
    if (setup) {
      crow.point = setup[1];
      crow.status = "board";
    } else if (index >= 4) {
      crow.point = null;
      crow.status = "captured";
    }
  });
  state.deployedCrows = 7;
  state.capturedCrows = 3;
  state.repetitions[positionKey(state)] = 1;
  assertStateInvariant(state);
  return state;
}

export function otherSide(side) {
  return side === "crows" ? "vulture" : "crows";
}

export function occupantAt(state, pointId) {
  if (state.vulture.point === pointId) return state.vulture;
  return state.crows.find((crow) => crow.status === "board" && crow.point === pointId) || null;
}

export function getLegalActions(state, side = state.currentPlayer) {
  if (!state || state.winner || state.isDraw || side !== state.currentPlayer) return [];
  const occupied = new Set(onBoardPieces(state).map((piece) => piece.point));

  if (side === "crows") {
    if (state.deployedCrows < AURORA_VULTURE_RULESET.crows) {
      const nextCrow = state.crows.find((crow) => crow.status === "waiting");
      if (!nextCrow) return [];
      return POINTS.filter((point) => !occupied.has(point.id)).map((point) => ({
        type: "place-crow",
        pieceId: nextCrow.id,
        to: point.id
      }));
    }
    const actions = [];
    for (const crow of state.crows.filter((piece) => piece.status === "board")) {
      for (const to of ADJACENCY[crow.point] || []) {
        if (!occupied.has(to)) actions.push({ type: "move-crow", pieceId: crow.id, from: crow.point, to });
      }
    }
    return actions;
  }

  if (!state.vulture.point) {
    return POINTS.filter((point) => !occupied.has(point.id)).map((point) => ({
      type: "place-vulture",
      pieceId: state.vulture.id,
      to: point.id
    }));
  }

  const actions = [];
  for (const to of ADJACENCY[state.vulture.point] || []) {
    if (!occupied.has(to)) actions.push({ type: "move-vulture", pieceId: state.vulture.id, from: state.vulture.point, to });
  }
  for (const jump of JUMPS[state.vulture.point] || []) {
    const jumped = occupantAt(state, jump.over);
    if (jumped?.side === "crows" && !occupied.has(jump.to)) {
      actions.push({
        type: "capture-crow",
        pieceId: state.vulture.id,
        from: state.vulture.point,
        over: jump.over,
        to: jump.to,
        capturedPieceId: jumped.id
      });
    }
  }
  return actions;
}

export function validateAction(state, action, side = state.currentPlayer) {
  if (!state) return { valid: false, reason: "Missing Aurora Vulture state." };
  if (state.winner || state.isDraw) return { valid: false, reason: "This aurora hunt is finished." };
  if (side !== state.currentPlayer) return { valid: false, reason: "It is not this side's turn." };
  if (!action?.type || !action?.pieceId || !action?.to) return { valid: false, reason: "Choose a piece and a legal star point." };
  const legal = getLegalActions(state, side).find((candidate) => actionKey(candidate) === actionKey(action));
  if (legal) return { valid: true, action: legal };
  if (occupantAt(state, action.to)) return { valid: false, reason: "That star point is occupied." };
  if (side === "crows" && state.deployedCrows < 7) return { valid: false, reason: "Crows must place the next waiting defender before any crow can move." };
  if (action.type === "capture-crow") return { valid: false, reason: "A capture must jump one adjacent crow along a straight star line to the empty point immediately beyond." };
  return { valid: false, reason: "Pieces move only along a printed star segment to an adjacent point." };
}

export function applyAction(state, action, side = state.currentPlayer) {
  const validation = validateAction(state, action, side);
  if (!validation.valid) return { state, error: validation.reason };
  const next = clone(state);
  const legal = validation.action;
  const wasMovement = next.phase === "movement";
  let from = null;

  if (legal.type === "place-crow") {
    const crow = next.crows.find((piece) => piece.id === legal.pieceId);
    crow.point = legal.to;
    crow.status = "board";
    next.deployedCrows += 1;
  } else if (legal.type === "place-vulture") {
    next.vulture.point = legal.to;
    next.vulture.status = "board";
  } else if (legal.type === "move-crow") {
    const crow = next.crows.find((piece) => piece.id === legal.pieceId);
    from = crow.point;
    crow.point = legal.to;
  } else if (legal.type === "move-vulture") {
    from = next.vulture.point;
    next.vulture.point = legal.to;
  } else if (legal.type === "capture-crow") {
    from = next.vulture.point;
    next.vulture.point = legal.to;
    const crow = next.crows.find((piece) => piece.id === legal.capturedPieceId);
    crow.point = null;
    crow.status = "captured";
    next.capturedCrows += 1;
  }

  next.ply += 1;
  if (wasMovement) next.movementPly += 1;
  next.lastAction = { ...legal, side, from: legal.from || from };
  next.history.push({ turn: next.turn, ...next.lastAction });

  if (next.capturedCrows >= AURORA_VULTURE_RULESET.vultureCaptureTarget) {
    next.winner = "vulture";
    next.winReason = "four-crows-captured";
  } else {
    next.currentPlayer = otherSide(side);
    next.turn += 1;
    if (next.deployedCrows === AURORA_VULTURE_RULESET.crows && next.vulture.point) next.phase = "movement";

    if (next.currentPlayer === "vulture" && !getLegalActions(next, "vulture").length) {
      next.winner = "crows";
      next.winReason = "vulture-immobilized";
    }
  }

  if (!next.winner && next.phase === "movement") {
    const key = positionKey(next);
    next.repetitions[key] = Number(next.repetitions[key] || 0) + 1;
    if (next.repetitions[key] >= AURORA_VULTURE_RULESET.repetitionDraw) {
      next.isDraw = true;
      next.winReason = "threefold-repetition";
    } else if (next.movementPly >= AURORA_VULTURE_RULESET.movementPlyLimit) {
      next.isDraw = true;
      next.winReason = "movement-ply-limit";
    }
  }

  assertStateInvariant(next);
  return { state: next, error: null };
}

export function positionKey(state) {
  const crowPoints = state.crows.filter((crow) => crow.status === "board").map((crow) => crow.point).sort().join(",");
  return `${state.currentPlayer}|${state.vulture.point || "-"}|${crowPoints}|${state.capturedCrows}`;
}

export function getPlayerSummary(state, side) {
  if (side === "vulture") {
    return {
      captures: state.capturedCrows,
      captureTarget: AURORA_VULTURE_RULESET.vultureCaptureTarget,
      mobility: state.currentPlayer === "vulture" ? getLegalActions(state, "vulture").length : mobilityFor(state, "vulture")
    };
  }
  return {
    deployed: state.deployedCrows,
    onBoard: state.crows.filter((crow) => crow.status === "board").length,
    waiting: state.crows.filter((crow) => crow.status === "waiting").length,
    captured: state.capturedCrows,
    mobility: state.deployedCrows === 7 ? mobilityFor(state, "crows") : POINTS.length - onBoardPieces(state).length
  };
}

export function describeTurn(state) {
  if (state.winner || state.isDraw) return resultTitle(state);
  if (state.currentPlayer === "crows") {
    return state.deployedCrows < 7
      ? `Aurora Crows: place defender ${state.deployedCrows + 1} of 7.`
      : "Aurora Crows: move one defender to tighten the ring.";
  }
  return state.vulture.point
    ? "Glacier Vulture: move or make one straight jump capture."
    : "Glacier Vulture: choose an empty star point.";
}

export function actionSummary(action) {
  if (!action) return "";
  if (action.type === "place-crow") return `Aurora Crows deployed ${action.pieceId} at ${pointName(action.to)}.`;
  if (action.type === "place-vulture") return `Glacier Vulture entered at ${pointName(action.to)}.`;
  if (action.type === "move-crow") return `${action.pieceId} moved from ${pointName(action.from)} to ${pointName(action.to)}.`;
  if (action.type === "move-vulture") return `Glacier Vulture moved from ${pointName(action.from)} to ${pointName(action.to)}.`;
  if (action.type === "capture-crow") return `Glacier Vulture jumped ${action.capturedPieceId} and landed at ${pointName(action.to)}.`;
  return "The aurora hunt advanced.";
}

export function resultTitle(state) {
  if (state.isDraw) return "The aurora star is drawn";
  if (state.winner === "vulture") return "Glacier Vulture breaks the flock";
  if (state.winner === "crows") return "Aurora Crows seal the star";
  return "The hunt continues";
}

export function resultDetail(state) {
  if (state.winReason === "four-crows-captured") return "The vulture captured four crows, the fixed victory threshold for this ruleset.";
  if (state.winReason === "vulture-immobilized") return "Every adjacent move and straight jump is blocked.";
  if (state.winReason === "threefold-repetition") return "The same full-board position appeared three times under the declared digital draw policy.";
  if (state.winReason === "movement-ply-limit") return `No victory was completed within ${AURORA_VULTURE_RULESET.movementPlyLimit} movement plies.`;
  return "The Kaooa match is complete.";
}

export function assertStateInvariant(state) {
  if (!state || state.crows?.length !== AURORA_VULTURE_RULESET.crows) throw new Error("Aurora Vulture must contain seven crows.");
  const validPoints = new Set(POINTS.map((point) => point.id));
  const occupied = onBoardPieces(state).map((piece) => piece.point);
  if (occupied.some((point) => !validPoints.has(point))) throw new Error("A piece occupies an unknown star point.");
  if (new Set(occupied).size !== occupied.length) throw new Error("Aurora Vulture occupancy invariant failed.");
  const deployed = state.crows.filter((crow) => crow.status !== "waiting").length;
  const captured = state.crows.filter((crow) => crow.status === "captured").length;
  if (deployed !== state.deployedCrows) throw new Error("Crow deployment count invariant failed.");
  if (captured !== state.capturedCrows) throw new Error("Crow capture count invariant failed.");
  for (const crow of state.crows) {
    if (crow.status === "board" && !crow.point) throw new Error("An active crow must occupy a point.");
    if (crow.status !== "board" && crow.point) throw new Error("A waiting or captured crow cannot occupy a point.");
  }
  if (state.vulture.status === "board" && !state.vulture.point) throw new Error("The active vulture must occupy a point.");
  if (state.phase === "movement" && (state.deployedCrows !== 7 || !state.vulture.point)) throw new Error("Movement phase requires all pieces to have entered.");
  if (state.capturedCrows > 7) throw new Error("Too many crows were captured.");
  return true;
}

function onBoardPieces(state) {
  return [state.vulture, ...state.crows].filter((piece) => piece.status === "board" && piece.point);
}

function mobilityFor(state, side) {
  const cloneState = clone(state);
  cloneState.currentPlayer = side;
  cloneState.winner = null;
  cloneState.isDraw = false;
  return getLegalActions(cloneState, side).length;
}

function jumpsFrom(pointId) {
  const jumps = [];
  for (const line of LINES) {
    for (let index = 0; index < line.length - 2; index += 1) {
      const triple = line.slice(index, index + 3);
      if (triple[0] === pointId) jumps.push({ over: triple[1], to: triple[2] });
      if (triple[2] === pointId) jumps.push({ over: triple[1], to: triple[0] });
    }
  }
  return jumps;
}

function uniquePairs(pairs) {
  const seen = new Set();
  const result = [];
  for (const pair of pairs) {
    const key = [...pair].sort().join("|");
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(Object.freeze(pair));
  }
  return result;
}

function actionKey(action) {
  return `${action?.type || ""}:${action?.pieceId || ""}:${action?.from || ""}:${action?.over || ""}:${action?.to || ""}:${action?.capturedPieceId || ""}`;
}

function pointName(pointId) {
  return POINTS.find((point) => point.id === pointId)?.label || pointId;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}
