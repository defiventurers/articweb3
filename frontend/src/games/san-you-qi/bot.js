import {
  FACTIONS,
  ROLE_LABELS,
  applyAction,
  getLegalActions,
  getPseudoTargets,
  isInCheck,
  territoryOf,
} from "./rules.js";

export const BOT_LEVELS = Object.freeze({
  easy: Object.freeze({
    label: "Easy",
    description: "Varied legal moves with a light preference for captures.",
    search: "random",
    depth: 1,
    beam: 6,
    qDepth: 0,
    budgetMs: 140,
    tableSize: 0,
  }),
  medium: Object.freeze({
    label: "Medium",
    description: "Three-player tactical search with checks, captures, promotions and king safety.",
    search: "paranoid",
    depth: 4,
    beam: 20,
    qDepth: 2,
    budgetMs: 1600,
    tableSize: 45000,
  }),
  hard: Object.freeze({
    label: "Hard",
    description: "Deep iterative three-player search with transpositions, quiescence and forcing-line extensions.",
    search: "paranoid",
    depth: 7,
    beam: 34,
    qDepth: 4,
    budgetMs: 6500,
    tableSize: 180000,
  }),
});

export const SAN_YOU_EVAL_WEIGHTS = Object.freeze({
  strongestRival: 0.52,
  secondRival: 0.20,
  promotedSoldier: 120,
  crossedFlag: 220,
  enemyTerritory: 18,
  sharedGateOccupancy: 34,
  innerSeaOccupancy: 26,
  centralControl: 2.8,
  mobility: 1.35,
  defendedPiece: 0.055,
  hangingPiece: 0.46,
  attackedPiece: 0.19,
  check: 920,
  sideToMoveInCheck: 330,
  checkPressure: 150,
  activeOpponentEliminated: 4600,
  ownEliminated: 900000,
});

const PIECE_VALUE = Object.freeze({
  general: 30000,
  chariot: 1000,
  cannon: 560,
  horse: 500,
  elephant: 250,
  advisor: 245,
  flag: 390,
  fire: 340,
  soldier: 135,
});

const MOBILITY_FACTOR = Object.freeze({
  general: 0.25,
  advisor: 0.28,
  elephant: 0.30,
  horse: 1.00,
  chariot: 0.82,
  cannon: 0.90,
  soldier: 0.48,
  fire: 0.60,
  flag: 0.72,
});

const SHARED_GATES = new Set(["C1", "C7", "C13"]);
const INNER_SEA = new Set(["C20", "C22", "C24"]);
const TACTICAL_ROLES = new Set(["chariot", "cannon", "horse", "flag", "fire"]);
const MATE_SCORE = 10_000_000;
const INF = 100_000_000;

const actionKey = (action) =>
  `${action?.pieceId || ""}|${action?.from || ""}|${action?.to || ""}`;

function nowMs() {
  return typeof performance !== "undefined" && performance.now
    ? performance.now()
    : Date.now();
}

function pieceValue(piece) {
  let value = PIECE_VALUE[piece.role] || 0;
  if (piece.role === "soldier" && piece.promoted) value += 150;
  if (piece.role === "flag" && piece.leftHome) value += 260;
  return value;
}

function boardPieces(state, owner = null) {
  return state.pieces.filter(
    (piece) => piece.status === "board" && (!owner || piece.owner === owner),
  );
}

function boardMaterial(state, faction) {
  return boardPieces(state, faction).reduce((sum, piece) => sum + pieceValue(piece), 0);
}

function outcomeScore(state, faction) {
  if (!state.activeFactions.includes(faction)) return -MATE_SCORE;
  if (!state.outcome) return 0;
  return state.outcome.winner === faction ? MATE_SCORE : -MATE_SCORE;
}

function stateKey(state) {
  const pieces = state.pieces
    .map((piece) => [
      piece.id,
      piece.owner,
      piece.status,
      piece.node || "",
      piece.promoted ? 1 : 0,
      piece.leftHome ? 1 : 0,
    ])
    .sort((a, b) => a[0].localeCompare(b[0]));

  return JSON.stringify([
    state.turn,
    state.resumeTurn || "",
    [...state.activeFactions].sort(),
    pieces,
    Object.keys(state.repetition || {}).sort(),
  ]);
}

function buildControlMap(state) {
  const controls = Object.fromEntries(
    FACTIONS.map((faction) => [faction, new Map()]),
  );

  for (const piece of boardPieces(state)) {
    const map = controls[piece.owner];
    for (const node of getPseudoTargets(state, piece.id)) {
      map.set(node, (map.get(node) || 0) + 1);
    }
  }

  return controls;
}

function centralActivity(state, faction, controls) {
  let score = 0;
  for (const piece of boardPieces(state, faction)) {
    if (SHARED_GATES.has(piece.node)) score += SAN_YOU_EVAL_WEIGHTS.sharedGateOccupancy;
    if (INNER_SEA.has(piece.node)) score += SAN_YOU_EVAL_WEIGHTS.innerSeaOccupancy;
    if (piece.node?.startsWith("C")) score += 8;
    if (territoryOf(piece.node, piece.faction) === "enemy") {
      score += SAN_YOU_EVAL_WEIGHTS.enemyTerritory;
    }
  }

  for (const [node, count] of controls[faction]) {
    if (node.startsWith("C")) {
      score += Math.min(3, count) * SAN_YOU_EVAL_WEIGHTS.centralControl;
    }
  }

  return score;
}

function activityAndSafety(state, faction, controls) {
  let score = 0;
  const ownControl = controls[faction];

  for (const piece of boardPieces(state, faction)) {
    const value = pieceValue(piece);
    const targets = getPseudoTargets(state, piece.id);
    score += targets.length * SAN_YOU_EVAL_WEIGHTS.mobility * (MOBILITY_FACTOR[piece.role] || 0.4);

    const enemyAttackers = FACTIONS
      .filter((enemy) => enemy !== faction && state.activeFactions.includes(enemy))
      .reduce((sum, enemy) => sum + (controls[enemy].get(piece.node) || 0), 0);
    const defended = (ownControl.get(piece.node) || 0) > 0;

    if (piece.role !== "general" && enemyAttackers) {
      score -= value * (defended
        ? SAN_YOU_EVAL_WEIGHTS.attackedPiece
        : SAN_YOU_EVAL_WEIGHTS.hangingPiece);
    }
    if (piece.role !== "general" && defended) {
      score += value * SAN_YOU_EVAL_WEIGHTS.defendedPiece;
    }

    if (piece.role === "soldier" && piece.promoted) {
      score += SAN_YOU_EVAL_WEIGHTS.promotedSoldier;
    }
    if (piece.role === "flag" && piece.leftHome) {
      score += SAN_YOU_EVAL_WEIGHTS.crossedFlag;
    }
  }

  return score;
}

export function evaluateSanYouState(
  state,
  faction,
  weights = SAN_YOU_EVAL_WEIGHTS,
) {
  const terminal = outcomeScore(state, faction);
  if (Math.abs(terminal) >= MATE_SCORE) return terminal;

  if (!state.activeFactions.includes(faction)) {
    return -weights.ownEliminated;
  }

  const controls = buildControlMap(state);
  const ownMaterial = boardMaterial(state, faction);
  const rivalMaterials = FACTIONS
    .filter((candidate) => candidate !== faction && state.activeFactions.includes(candidate))
    .map((candidate) => boardMaterial(state, candidate))
    .sort((a, b) => b - a);

  let score = ownMaterial;
  if (rivalMaterials[0]) score -= rivalMaterials[0] * weights.strongestRival;
  if (rivalMaterials[1]) score -= rivalMaterials[1] * weights.secondRival;

  score += activityAndSafety(state, faction, controls);
  score += centralActivity(state, faction, controls);

  const eliminatedOpponents = FACTIONS.filter(
    (candidate) => candidate !== faction && !state.activeFactions.includes(candidate),
  ).length;
  score += eliminatedOpponents * weights.activeOpponentEliminated;

  if (isInCheck(state, faction)) {
    score -= weights.check;
    if (state.turn === faction) score -= weights.sideToMoveInCheck;
  }

  for (const rival of FACTIONS) {
    if (
      rival !== faction &&
      state.activeFactions.includes(rival) &&
      isInCheck(state, rival)
    ) {
      score += weights.checkPressure;
    }
  }

  return score;
}

function capturedPiece(state, action) {
  if (!action.captured) return null;
  return state.pieces.find((piece) => piece.id === action.captured) || null;
}

function movePromotionBonus(state, action) {
  const moving = state.pieces.find((piece) => piece.id === action.pieceId);
  if (!moving) return 0;
  if (moving.role === "soldier" && !moving.promoted) {
    return territoryOf(action.to, moving.faction) === "enemy" ? 260 : 0;
  }
  if (moving.role === "flag" && !moving.leftHome) {
    return territoryOf(action.to, moving.faction) === "enemy" ? 300 : 0;
  }
  return 0;
}

function fastMovePriority(state, action, context, ply, ttMoveKey = "") {
  const moving = state.pieces.find((piece) => piece.id === action.pieceId);
  const victim = capturedPiece(state, action);
  const key = actionKey(action);

  let score = 0;
  if (key === ttMoveKey) score += 5_000_000;

  if (victim) {
    score += 1_000_000 + pieceValue(victim) * 90 - pieceValue(moving) * 7;
  }

  score += movePromotionBonus(state, action) * 120;

  if (action.to?.startsWith("C")) score += 2600;
  if (SHARED_GATES.has(action.to)) score += 2200;
  if (INNER_SEA.has(action.to)) score += 1800;

  const killers = context.killers.get(ply);
  if (killers?.includes(key)) score += 600_000;
  score += context.history.get(key) || 0;

  return score;
}

function preparedChildren(state, rootFaction, context, ply, limit, ttMoveKey = "") {
  const actions = getLegalActions(state);
  if (!actions.length) return [];

  const prepared = [];

  for (const action of actions) {
    context.checkDeadline();
    const result = applyAction(state, action);
    if (result.error) continue;

    const child = result.state;
    const movingBefore = state.pieces.find((piece) => piece.id === action.pieceId);
    const movingAfter = child.pieces.find((piece) => piece.id === action.pieceId);
    const victim = capturedPiece(state, action);

    const checks = FACTIONS.filter(
      (candidate) =>
        candidate !== movingBefore?.owner &&
        child.activeFactions.includes(candidate) &&
        isInCheck(child, candidate),
    ).length;

    const eliminated = state.activeFactions.length - child.activeFactions.length;
    const promotion =
      (movingBefore?.role === "soldier" && !movingBefore.promoted && movingAfter?.promoted) ||
      (movingBefore?.role === "flag" && !movingBefore.leftHome && movingAfter?.leftHome);

    const forcing =
      Boolean(victim) ||
      checks > 0 ||
      eliminated > 0 ||
      Boolean(child.outcome) ||
      Boolean(promotion) ||
      isInCheck(state, state.turn);

    let priority = fastMovePriority(state, action, context, ply, ttMoveKey);
    if (child.outcome?.winner === rootFaction) priority += 20_000_000;
    if (eliminated) priority += 5_000_000 * eliminated;
    if (checks) priority += 240_000 * checks;
    if (promotion) priority += 180_000;

    prepared.push({
      action,
      child,
      priority,
      forcing,
      quiet: !victim && !checks && !promotion && !eliminated,
    });
  }

  prepared.sort(
    (a, b) => b.priority - a.priority ||
      actionKey(a.action).localeCompare(actionKey(b.action)),
  );

  if (!Number.isFinite(limit) || prepared.length <= limit) return prepared;

  const forcing = prepared.filter((entry) => entry.forcing);
  const quiet = prepared.filter((entry) => !entry.forcing);
  const room = Math.max(0, limit - forcing.length);
  return [...forcing, ...quiet.slice(0, room)];
}

function tacticalChildren(state, rootFaction, context, ply, qDepth, ttMoveKey = "") {
  const all = preparedChildren(
    state,
    rootFaction,
    context,
    ply,
    context.level.qBeam,
    ttMoveKey,
  );

  if (isInCheck(state, state.turn)) return all;

  return all.filter((entry) => entry.forcing).slice(0, context.level.qBeam);
}

function recordCutoff(context, action, ply, depth, quiet) {
  if (!quiet) return;
  const key = actionKey(action);

  const killers = context.killers.get(ply) || [];
  if (!killers.includes(key)) {
    killers.unshift(key);
    if (killers.length > 2) killers.pop();
    context.killers.set(ply, killers);
  }

  context.history.set(
    key,
    Math.min(2_000_000, (context.history.get(key) || 0) + depth * depth * 500),
  );
}

function transpositionLookup(context, key, depth, alpha, beta) {
  const entry = context.table.get(key);
  if (!entry || entry.depth < depth) return null;

  context.ttHits += 1;
  if (entry.flag === "exact") return { value: entry.value, moveKey: entry.moveKey, cutoff: true };
  if (entry.flag === "lower" && entry.value >= beta) {
    return { value: entry.value, moveKey: entry.moveKey, cutoff: true };
  }
  if (entry.flag === "upper" && entry.value <= alpha) {
    return { value: entry.value, moveKey: entry.moveKey, cutoff: true };
  }

  return { value: entry.value, moveKey: entry.moveKey, cutoff: false };
}

function transpositionStore(context, key, entry) {
  if (!context.level.tableSize) return;
  if (context.table.size >= context.level.tableSize) {
    const deleteCount = Math.max(1, Math.floor(context.level.tableSize * 0.08));
    const iterator = context.table.keys();
    for (let i = 0; i < deleteCount; i += 1) {
      const next = iterator.next();
      if (next.done) break;
      context.table.delete(next.value);
    }
  }
  context.table.set(key, entry);
}

function quiescence(state, rootFaction, alpha, beta, qDepth, context, ply) {
  context.checkDeadline();
  context.nodes += 1;
  context.qNodes += 1;

  const terminal = outcomeScore(state, rootFaction);
  if (Math.abs(terminal) >= MATE_SCORE) return terminal;

  const maximizing = state.turn === rootFaction;
  const standPat = evaluateSanYouState(state, rootFaction, context.weights);

  if (qDepth <= 0) return standPat;

  if (maximizing) {
    if (standPat >= beta) return standPat;
    alpha = Math.max(alpha, standPat);
  } else {
    if (standPat <= alpha) return standPat;
    beta = Math.min(beta, standPat);
  }

  const children = tacticalChildren(state, rootFaction, context, ply, qDepth);
  if (!children.length) return standPat;

  let best = standPat;

  for (const entry of children) {
    const score = quiescence(
      entry.child,
      rootFaction,
      alpha,
      beta,
      qDepth - 1,
      context,
      ply + 1,
    );

    if (maximizing) {
      if (score > best) best = score;
      if (best > alpha) alpha = best;
    } else {
      if (score < best) best = score;
      if (best < beta) beta = best;
    }

    if (alpha >= beta) {
      context.cutoffs += 1;
      break;
    }
  }

  return best;
}

function paranoidSearch(
  state,
  rootFaction,
  depth,
  alpha,
  beta,
  context,
  ply,
) {
  context.checkDeadline();
  context.nodes += 1;

  const terminal = outcomeScore(state, rootFaction);
  if (Math.abs(terminal) >= MATE_SCORE) return terminal;

  if (depth <= 0) {
    return quiescence(
      state,
      rootFaction,
      alpha,
      beta,
      context.level.qDepth,
      context,
      ply,
    );
  }

  const key = `${rootFaction}|${depth}|${stateKey(state)}`;
  const originalAlpha = alpha;
  const originalBeta = beta;
  const tt = transpositionLookup(context, key, depth, alpha, beta);
  if (tt?.cutoff) return tt.value;

  const maximizing = state.turn === rootFaction;
  const children = preparedChildren(
    state,
    rootFaction,
    context,
    ply,
    context.level.beam,
    tt?.moveKey || "",
  );

  if (!children.length) {
    return evaluateSanYouState(state, rootFaction, context.weights);
  }

  let best = maximizing ? -INF : INF;
  let bestMoveKey = "";

  for (const entry of children) {
    const score = paranoidSearch(
      entry.child,
      rootFaction,
      depth - 1,
      alpha,
      beta,
      context,
      ply + 1,
    );

    if (
      (maximizing && score > best) ||
      (!maximizing && score < best)
    ) {
      best = score;
      bestMoveKey = actionKey(entry.action);
    }

    if (maximizing) alpha = Math.max(alpha, best);
    else beta = Math.min(beta, best);

    if (alpha >= beta) {
      context.cutoffs += 1;
      recordCutoff(context, entry.action, ply, depth, entry.quiet);
      break;
    }
  }

  let flag = "exact";
  if (best <= originalAlpha) flag = "upper";
  else if (best >= originalBeta) flag = "lower";

  transpositionStore(context, key, {
    depth,
    value: best,
    flag,
    moveKey: bestMoveKey,
  });

  return best;
}

function defaultLevel(level) {
  return {
    ...level,
    qBeam: Math.max(8, Math.floor(level.beam * 0.65)),
  };
}

function searchBotAction(state, difficulty, options) {
  const configured = defaultLevel(BOT_LEVELS[difficulty] || BOT_LEVELS.medium);
  const level = {
    ...configured,
    depth: options.maxDepth ?? configured.depth,
    beam: options.beam ?? configured.beam,
    qDepth: options.qDepth ?? configured.qDepth,
    budgetMs: options.budgetMs ?? configured.budgetMs,
  };
  level.qBeam = options.qBeam ?? Math.max(8, Math.floor(level.beam * 0.65));

  if (state.activeFactions.length === 2 && difficulty === "hard") {
    level.depth += 1;
    level.beam = Math.max(level.beam, 40);
    level.qBeam = Math.max(level.qBeam, 24);
  }

  const started = nowMs();
  const deadline = started + level.budgetMs;
  const rootFaction = state.turn;
  const timeoutSignal = Symbol("sanyou-search-timeout");
  const context = {
    level,
    weights: options.evalWeights || SAN_YOU_EVAL_WEIGHTS,
    table: new Map(),
    killers: new Map(),
    history: new Map(),
    nodes: 0,
    qNodes: 0,
    cutoffs: 0,
    ttHits: 0,
    checkDeadline() {
      if (nowMs() >= deadline) throw timeoutSignal;
    },
  };

  const rootActions = getLegalActions(state);
  if (!rootActions.length) {
    return {
      action: null,
      score: null,
      stats: {
        nodes: 0,
        qNodes: 0,
        cutoffs: 0,
        ttHits: 0,
        completedDepth: 0,
        elapsedMs: Math.round(nowMs() - started),
      },
    };
  }

  const initial = preparedChildren(
    state,
    rootFaction,
    context,
    0,
    Number.POSITIVE_INFINITY,
  );

  let bestAction = initial[0]?.action || rootActions[0];
  let bestScore = initial[0]
    ? evaluateSanYouState(initial[0].child, rootFaction, context.weights)
    : -INF;
  let completedDepth = 1;
  let principalKey = actionKey(bestAction);

  for (let depth = 2; depth <= level.depth; depth += 1) {
    try {
      context.checkDeadline();

      const rootChildren = preparedChildren(
        state,
        rootFaction,
        context,
        0,
        level.beam,
        principalKey,
      );

      let iterationAction = bestAction;
      let iterationScore = -INF;
      let alpha = -INF;
      const beta = INF;

      for (const entry of rootChildren) {
        context.checkDeadline();
        const score = paranoidSearch(
          entry.child,
          rootFaction,
          depth - 1,
          alpha,
          beta,
          context,
          1,
        );

        if (
          score > iterationScore ||
          (
            score === iterationScore &&
            actionKey(entry.action).localeCompare(actionKey(iterationAction)) < 0
          )
        ) {
          iterationScore = score;
          iterationAction = entry.action;
        }

        alpha = Math.max(alpha, iterationScore);
      }

      bestAction = iterationAction;
      bestScore = iterationScore;
      principalKey = actionKey(iterationAction);
      completedDepth = depth;
    } catch (error) {
      if (error !== timeoutSignal) throw error;
      break;
    }
  }

  return {
    action: bestAction,
    score: bestScore,
    stats: {
      nodes: context.nodes,
      qNodes: context.qNodes,
      cutoffs: context.cutoffs,
      ttHits: context.ttHits,
      completedDepth,
      elapsedMs: Math.round(nowMs() - started),
      tableSize: context.table.size,
      search: "iterative-paranoid-alpha-beta",
    },
  };
}

function easyBotAction(state, options = {}) {
  const actions = getLegalActions(state);
  if (!actions.length) return { action: null, score: null, stats: { nodes: 0, completedDepth: 0 } };

  const random = options.random || Math.random;
  const captures = actions.filter((action) => action.captured);
  const pool = captures.length && random() < 0.7 ? captures : actions;
  const action = pool[Math.floor(random() * pool.length)] || pool[0];

  const result = applyAction(state, action);
  const score = result.error
    ? -INF
    : evaluateSanYouState(result.state, state.turn, options.evalWeights || SAN_YOU_EVAL_WEIGHTS);

  return {
    action,
    score,
    stats: {
      nodes: 1,
      qNodes: 0,
      cutoffs: 0,
      ttHits: 0,
      completedDepth: 1,
      elapsedMs: 0,
      search: "capture-biased-random",
    },
  };
}

export function chooseSanYouBotAction(
  state,
  difficulty = "medium",
  options = {},
) {
  if (difficulty === "easy") return easyBotAction(state, options);
  return searchBotAction(state, difficulty, options);
}

export function botLabel(difficulty) {
  return BOT_LEVELS[difficulty]?.label || BOT_LEVELS.medium.label;
}

export function describeBotMove(state, action) {
  if (!action) return "No legal move.";
  const piece = state.pieces.find((candidate) => candidate.id === action.pieceId);
  return `${ROLE_LABELS[piece?.role] || "Piece"}: ${action.from} → ${action.to}`;
}
