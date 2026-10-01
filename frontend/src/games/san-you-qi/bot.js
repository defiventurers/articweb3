import {
  FACTIONS,
  ROLE_LABELS,
  applyAction,
  getLegalActions,
  isInCheck,
  territoryOf,
} from "./rules.js";

/**
 * San You Qi is not zero-sum while three kingdoms are alive.
 *
 * Medium / Hard therefore use MaxN while all three kingdoms remain so each
 * player is assumed to maximize its own position, not cooperate in a fictional
 * coalition against the root player. After one kingdom is eliminated the game
 * becomes genuinely two-player and Hard switches to alpha-beta.
 */
export const BOT_LEVELS = Object.freeze({
  easy: Object.freeze({
    label: "Easy",
    description: "Varied legal moves with a light preference for captures.",
    search: "random",
    depth: 1,
    beam: 6,
    rootBeam: 8,
    qDepth: 0,
    qBeam: 0,
    budgetMs: 140,
    tableSize: 0,
  }),
  medium: Object.freeze({
    label: "Medium",
    description: "Independent three-kingdom tactical search with checks, recaptures and promotion threats.",
    search: "maxn",
    depth: 4,
    beam: 14,
    rootBeam: 28,
    qDepth: 2,
    qBeam: 10,
    budgetMs: 2800,
    tableSize: 50000,
  }),
  hard: Object.freeze({
    label: "Hard",
    description: "Deep MaxN strategy; converts to alpha-beta after one kingdom falls. No deliberate mistakes.",
    search: "hybrid",
    depth: 6,
    beam: 20,
    rootBeam: 42,
    qDepth: 4,
    qBeam: 16,
    budgetMs: 10500,
    tableSize: 220000,
  }),
});

export const SAN_YOU_EVAL_WEIGHTS = Object.freeze({
  strongestRival: 0.34,
  secondRival: 0.16,
  promotedSoldier: 165,
  crossedFlag: 285,
  enemyTerritory: 24,
  sharedGateOccupancy: 42,
  innerSeaOccupancy: 38,
  centralOccupancy: 16,
  currentMobility: 2.1,
  check: 1450,
  checkToMove: 650,
  checkingMove: 380,
  activeOpponentEliminated: 6800,
  ownEliminated: 1_500_000,
});

const PIECE_VALUE = Object.freeze({
  general: 50000,
  chariot: 1100,
  cannon: 620,
  horse: 540,
  flag: 470,
  fire: 360,
  elephant: 260,
  advisor: 255,
  soldier: 145,
});

const SHARED_GATES = new Set(["C1", "C7", "C13"]);
const INNER_SEA = new Set(["C20", "C22", "C24"]);
const MATE_SCORE = 50_000_000;
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
  if (piece.role === "soldier" && piece.promoted) value += 180;
  if (piece.role === "flag" && piece.leftHome) value += 300;
  return value;
}

function boardKey(state) {
  const pieces = state.pieces
    .filter((piece) => piece.status === "board")
    .map((piece) =>
      `${piece.id}:${piece.owner}:${piece.node}:${piece.promoted ? 1 : 0}:${piece.leftHome ? 1 : 0}`,
    )
    .sort()
    .join(";");

  return [
    state.turn,
    state.resumeTurn || "",
    state.activeFactions.join(","),
    state.ply || 0,
    Object.keys(state.repetition || {}).length,
    pieces,
  ].join("|");
}

function terminalVector(state) {
  if (!state.outcome) return null;
  return Object.fromEntries(
    FACTIONS.map((faction) => [
      faction,
      state.outcome.winner === faction ? MATE_SCORE : -MATE_SCORE,
    ]),
  );
}

function staticVector(state, weights = SAN_YOU_EVAL_WEIGHTS) {
  const terminal = terminalVector(state);
  if (terminal) return terminal;

  const raw = Object.fromEntries(FACTIONS.map((faction) => [faction, 0]));

  for (const faction of FACTIONS) {
    if (!state.activeFactions.includes(faction)) {
      raw[faction] = -weights.ownEliminated;
    }
  }

  for (const piece of state.pieces) {
    if (piece.status !== "board") continue;

    const owner = piece.owner;
    let value = pieceValue(piece);

    if (piece.role === "soldier" && piece.promoted) {
      value += weights.promotedSoldier;
    }
    if (piece.role === "flag" && piece.leftHome) {
      value += weights.crossedFlag;
    }

    if (territoryOf(piece.node, piece.faction) === "enemy") {
      value += weights.enemyTerritory;
    }
    if (piece.node?.startsWith("C")) value += weights.centralOccupancy;
    if (SHARED_GATES.has(piece.node)) value += weights.sharedGateOccupancy;
    if (INNER_SEA.has(piece.node)) value += weights.innerSeaOccupancy;

    raw[owner] += value;
  }

  const scores = { ...raw };

  for (const faction of FACTIONS) {
    if (!state.activeFactions.includes(faction)) continue;

    const rivals = FACTIONS
      .filter((candidate) => candidate !== faction && state.activeFactions.includes(candidate))
      .map((candidate) => raw[candidate])
      .sort((a, b) => b - a);

    if (rivals[0] != null) scores[faction] -= rivals[0] * weights.strongestRival;
    if (rivals[1] != null) scores[faction] -= rivals[1] * weights.secondRival;

    const defeatedOpponents = FACTIONS.filter(
      (candidate) => candidate !== faction && !state.activeFactions.includes(candidate),
    ).length;
    scores[faction] += defeatedOpponents * weights.activeOpponentEliminated;

    if (isInCheck(state, faction)) {
      scores[faction] -= weights.check;
      if (state.turn === faction) scores[faction] -= weights.checkToMove;
    }
  }

  if (
    state.lastAction?.actor &&
    state.activeFactions.includes(state.lastAction.actor)
  ) {
    const checkedRivals = FACTIONS.filter(
      (faction) =>
        faction !== state.lastAction.actor &&
        state.activeFactions.includes(faction) &&
        isInCheck(state, faction),
    ).length;
    scores[state.lastAction.actor] += checkedRivals * weights.checkingMove;
  }

  return scores;
}

function evaluateVector(state, context) {
  const key = boardKey(state);
  const cached = context.evalCache.get(key);
  if (cached) {
    context.evalHits += 1;
    return cached;
  }

  const scores = staticVector(state, context.weights);

  // Mobility is useful, but generating all three kingdoms' legal move sets at
  // every leaf is prohibitively expensive. Reward the actual side-to-move's
  // choices, which also makes cramped / checked positions evaluate correctly.
  if (!state.outcome && state.activeFactions.includes(state.turn)) {
    const mobility = getLegalActions(state).length;
    scores[state.turn] += Math.min(70, mobility) * context.weights.currentMobility;
  }

  if (context.evalCache.size >= context.level.tableSize) {
    const first = context.evalCache.keys().next();
    if (!first.done) context.evalCache.delete(first.value);
  }
  context.evalCache.set(key, scores);
  return scores;
}

export function evaluateSanYouState(
  state,
  faction,
  weights = SAN_YOU_EVAL_WEIGHTS,
) {
  const fakeContext = {
    weights,
    level: { tableSize: 2000 },
    evalCache: new Map(),
    evalHits: 0,
  };
  return evaluateVector(state, fakeContext)[faction];
}

function capturedPiece(state, action) {
  if (!action?.captured) return null;
  return state.pieces.find((piece) => piece.id === action.captured) || null;
}

function movePromotionBonus(state, action) {
  const moving = state.pieces.find((piece) => piece.id === action.pieceId);
  if (!moving) return 0;

  if (moving.role === "soldier" && !moving.promoted) {
    return territoryOf(action.to, moving.faction) === "enemy" ? 1 : 0;
  }
  if (moving.role === "flag" && !moving.leftHome) {
    return territoryOf(action.to, moving.faction) === "enemy" ? 1 : 0;
  }
  return 0;
}

function movePriority(state, action, actor, context, ply, preferred = "") {
  const moving = state.pieces.find((piece) => piece.id === action.pieceId);
  const victim = capturedPiece(state, action);
  const key = actionKey(action);

  let score = 0;
  if (key === preferred) score += 9_000_000;

  if (victim) {
    // MVV/LVA style ordering. Generals are never captured directly.
    score += 2_000_000 + pieceValue(victim) * 140 - pieceValue(moving) * 8;
  }

  if (movePromotionBonus(state, action)) score += 700_000;
  if (INNER_SEA.has(action.to)) score += 18_000;
  if (SHARED_GATES.has(action.to)) score += 16_000;
  else if (action.to?.startsWith("C")) score += 9_000;

  const killers = context.killers.get(`${actor}:${ply}`) || [];
  if (killers.includes(key)) score += 500_000;
  score += context.history.get(`${actor}:${key}`) || 0;

  return score;
}

function buildChildren(
  state,
  context,
  ply,
  limit,
  preferred = "",
  forcingOnly = false,
) {
  const actor = state.turn;
  const actions = getLegalActions(state);
  if (!actions.length) return [];

  const actorChecked = isInCheck(state, actor);
  const children = [];

  for (const action of actions) {
    context.checkDeadline();
    const result = applyAction(state, action);
    if (result.error) continue;

    const child = result.state;
    const movingBefore = state.pieces.find((piece) => piece.id === action.pieceId);
    const movingAfter = child.pieces.find((piece) => piece.id === action.pieceId);
    const victim = capturedPiece(state, action);

    const eliminated = state.activeFactions.length - child.activeFactions.length;
    const promoted =
      (movingBefore?.role === "soldier" && !movingBefore.promoted && movingAfter?.promoted) ||
      (movingBefore?.role === "flag" && !movingBefore.leftHome && movingAfter?.leftHome);

    let checks = 0;
    for (const rival of child.activeFactions) {
      if (rival !== actor && isInCheck(child, rival)) checks += 1;
    }

    const forcing =
      actorChecked ||
      Boolean(victim) ||
      Boolean(promoted) ||
      checks > 0 ||
      eliminated > 0 ||
      Boolean(child.outcome);

    if (forcingOnly && !forcing) continue;

    let priority = movePriority(state, action, actor, context, ply, preferred);
    if (child.outcome?.winner === actor) priority += 30_000_000;
    if (eliminated) priority += 12_000_000 * eliminated;
    if (checks) priority += 1_100_000 * checks;
    if (promoted) priority += 650_000;

    children.push({
      action,
      child,
      forcing,
      quiet: !victim && !promoted && !checks && !eliminated,
      priority,
    });
  }

  children.sort(
    (a, b) =>
      b.priority - a.priority ||
      actionKey(a.action).localeCompare(actionKey(b.action)),
  );

  if (!Number.isFinite(limit) || children.length <= limit) return children;

  // Tactical moves are never removed by the selective beam.
  const forcing = children.filter((entry) => entry.forcing);
  const quiet = children.filter((entry) => !entry.forcing);
  const room = Math.max(0, limit - forcing.length);
  return [...forcing, ...quiet.slice(0, room)];
}

function recordCutoff(context, actor, action, ply, depth, quiet) {
  if (!quiet) return;
  const key = actionKey(action);
  const killerKey = `${actor}:${ply}`;
  const killers = context.killers.get(killerKey) || [];

  if (!killers.includes(key)) {
    killers.unshift(key);
    if (killers.length > 2) killers.pop();
    context.killers.set(killerKey, killers);
  }

  const historyKey = `${actor}:${key}`;
  context.history.set(
    historyKey,
    Math.min(
      3_000_000,
      (context.history.get(historyKey) || 0) + depth * depth * 700,
    ),
  );
}

function maxNQuiescence(state, qDepth, context, ply) {
  context.checkDeadline();
  context.nodes += 1;
  context.qNodes += 1;

  const stand = evaluateVector(state, context);
  if (state.outcome || qDepth <= 0) return stand;

  const actor = state.turn;
  const checked = isInCheck(state, actor);
  const children = buildChildren(
    state,
    context,
    ply,
    context.level.qBeam,
    "",
    !checked,
  );

  if (!children.length) return stand;

  let best = checked ? null : stand;

  for (const entry of children) {
    const vector = maxNQuiescence(
      entry.child,
      qDepth - 1,
      context,
      ply + 1,
    );

    if (
      !best ||
      vector[actor] > best[actor] ||
      (vector[actor] === best[actor] && vector[context.rootFaction] > best[context.rootFaction])
    ) {
      best = vector;
    }
  }

  return best || stand;
}

function maxNSearch(state, depth, context, ply) {
  context.checkDeadline();
  context.nodes += 1;

  if (state.outcome) return evaluateVector(state, context);
  if (depth <= 0) {
    return maxNQuiescence(state, context.level.qDepth, context, ply);
  }

  const key = `M|${depth}|${boardKey(state)}`;
  const tt = context.table.get(key);
  if (tt) {
    context.ttHits += 1;
    return tt.vector;
  }

  const preferred = context.pvMoves.get(boardKey(state)) || "";
  const children = buildChildren(
    state,
    context,
    ply,
    context.level.beam,
    preferred,
  );

  if (!children.length) return evaluateVector(state, context);

  const actor = state.turn;
  let best = null;
  let bestMove = "";

  for (const entry of children) {
    const vector = maxNSearch(entry.child, depth - 1, context, ply + 1);

    if (
      !best ||
      vector[actor] > best[actor] ||
      (
        vector[actor] === best[actor] &&
        vector[context.rootFaction] > best[context.rootFaction]
      )
    ) {
      best = vector;
      bestMove = actionKey(entry.action);
    }
  }

  context.pvMoves.set(boardKey(state), bestMove);

  if (context.table.size >= context.level.tableSize) {
    const first = context.table.keys().next();
    if (!first.done) context.table.delete(first.value);
  }
  context.table.set(key, { vector: best });

  return best;
}

function alphaBeta(state, rootFaction, depth, alpha, beta, context, ply) {
  context.checkDeadline();
  context.nodes += 1;

  const scores = evaluateVector(state, context);
  if (state.outcome) return scores[rootFaction];
  if (depth <= 0) {
    return maxNQuiescence(
      state,
      context.level.qDepth,
      context,
      ply,
    )[rootFaction];
  }

  const key = `A|${rootFaction}|${depth}|${boardKey(state)}`;
  const cached = context.table.get(key);
  if (cached && typeof cached.value === "number") {
    context.ttHits += 1;
    return cached.value;
  }

  const maximizing = state.turn === rootFaction;
  const preferred = context.pvMoves.get(boardKey(state)) || "";
  const children = buildChildren(
    state,
    context,
    ply,
    context.level.beam,
    preferred,
  );
  if (!children.length) return scores[rootFaction];

  let best = maximizing ? -INF : INF;
  let bestMove = "";

  for (const entry of children) {
    const value = alphaBeta(
      entry.child,
      rootFaction,
      depth - 1,
      alpha,
      beta,
      context,
      ply + 1,
    );

    if (
      (maximizing && value > best) ||
      (!maximizing && value < best)
    ) {
      best = value;
      bestMove = actionKey(entry.action);
    }

    if (maximizing) alpha = Math.max(alpha, best);
    else beta = Math.min(beta, best);

    if (alpha >= beta) {
      context.cutoffs += 1;
      recordCutoff(
        context,
        state.turn,
        entry.action,
        ply,
        depth,
        entry.quiet,
      );
      break;
    }
  }

  context.pvMoves.set(boardKey(state), bestMove);
  if (context.table.size >= context.level.tableSize) {
    const first = context.table.keys().next();
    if (!first.done) context.table.delete(first.value);
  }
  context.table.set(key, { value: best });
  return best;
}

function deterministicFallback(state, actions, context) {
  return [...actions].sort(
    (a, b) =>
      movePriority(state, b, state.turn, context, 0) -
        movePriority(state, a, state.turn, context, 0) ||
      actionKey(a).localeCompare(actionKey(b)),
  )[0];
}

function chooseSearchedAction(state, difficulty, options = {}) {
  const configured = BOT_LEVELS[difficulty] || BOT_LEVELS.medium;
  const level = {
    ...configured,
    depth: options.maxDepth ?? configured.depth,
    beam: options.beam ?? configured.beam,
    rootBeam: options.rootBeam ?? configured.rootBeam,
    qDepth: options.qDepth ?? configured.qDepth,
    qBeam: options.qBeam ?? configured.qBeam,
    budgetMs: options.budgetMs ?? configured.budgetMs,
  };

  if (state.activeFactions.length === 2) {
    level.depth += difficulty === "hard" ? 2 : 1;
    level.beam += difficulty === "hard" ? 8 : 4;
    level.rootBeam += difficulty === "hard" ? 12 : 6;
  }

  const started = nowMs();
  const deadline = started + level.budgetMs;
  const timeoutSignal = Symbol("sanyou-search-timeout");
  const rootFaction = state.turn;

  const context = {
    level,
    rootFaction,
    weights: options.evalWeights || SAN_YOU_EVAL_WEIGHTS,
    table: new Map(),
    evalCache: new Map(),
    killers: new Map(),
    history: new Map(),
    pvMoves: new Map(),
    nodes: 0,
    qNodes: 0,
    cutoffs: 0,
    ttHits: 0,
    evalHits: 0,
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
        evalHits: 0,
        completedDepth: 0,
        elapsedMs: Math.round(nowMs() - started),
      },
    };
  }

  let bestAction = deterministicFallback(state, rootActions, context);
  let bestVector = null;
  let bestScore = -INF;
  let completedDepth = 0;

  // Guaranteed one-ply scan. This deliberately has no deadline check around
  // the cheap static evaluator so Medium/Hard never collapse to a raw move-
  // ordering fallback simply because the device is slow.
  const onePly = [];
  for (const action of rootActions) {
    const result = applyAction(state, action);
    if (result.error) continue;
    const vector = staticVector(result.state, context.weights);
    const eliminated = state.activeFactions.length - result.state.activeFactions.length;
    onePly.push({
      action,
      child: result.state,
      vector,
      priority:
        vector[rootFaction] +
        eliminated * 1_000_000 +
        (result.state.outcome?.winner === rootFaction ? 20_000_000 : 0),
    });
  }

  onePly.sort(
    (a, b) =>
      b.priority - a.priority ||
      actionKey(a.action).localeCompare(actionKey(b.action)),
  );

  if (onePly.length) {
    bestAction = onePly[0].action;
    bestVector = onePly[0].vector;
    bestScore = onePly[0].vector[rootFaction];
    completedDepth = 1;
  }

  // Immediate forced win beats every search budget.
  const mate = onePly.find((entry) => entry.child.outcome?.winner === rootFaction);
  if (mate) {
    return {
      action: mate.action,
      score: MATE_SCORE,
      stats: {
        nodes: context.nodes,
        qNodes: context.qNodes,
        cutoffs: context.cutoffs,
        ttHits: context.ttHits,
        evalHits: context.evalHits,
        completedDepth: 1,
        elapsedMs: Math.round(nowMs() - started),
        tableSize: 0,
        search: state.activeFactions.length === 2 ? "alpha-beta" : "maxn",
      },
    };
  }

  try {
    for (let depth = 2; depth <= level.depth; depth += 1) {
      context.checkDeadline();

      const preferred = actionKey(bestAction);
      const rootChildren = buildChildren(
        state,
        context,
        0,
        level.rootBeam,
        preferred,
      );

      let iterationAction = null;
      let iterationVector = null;
      let iterationScore = -INF;

      for (const entry of rootChildren) {
        context.checkDeadline();

        if (state.activeFactions.length === 2) {
          const value = alphaBeta(
            entry.child,
            rootFaction,
            depth - 1,
            -INF,
            INF,
            context,
            1,
          );

          if (
            iterationAction == null ||
            value > iterationScore ||
            (
              value === iterationScore &&
              actionKey(entry.action).localeCompare(actionKey(iterationAction)) < 0
            )
          ) {
            iterationAction = entry.action;
            iterationScore = value;
            iterationVector = evaluateVector(entry.child, context);
          }
        } else {
          const vector = maxNSearch(
            entry.child,
            depth - 1,
            context,
            1,
          );
          const value = vector[rootFaction];

          if (
            iterationAction == null ||
            value > iterationScore ||
            (
              value === iterationScore &&
              actionKey(entry.action).localeCompare(actionKey(iterationAction)) < 0
            )
          ) {
            iterationAction = entry.action;
            iterationScore = value;
            iterationVector = vector;
          }
        }
      }

      if (iterationAction) {
        bestAction = iterationAction;
        bestVector = iterationVector;
        bestScore = iterationScore;
        completedDepth = depth;
        context.pvMoves.set(boardKey(state), actionKey(bestAction));
      }
    }
  } catch (error) {
    if (error !== timeoutSignal) throw error;
  }

  return {
    action: bestAction,
    score: bestScore,
    vector: bestVector,
    stats: {
      nodes: context.nodes,
      qNodes: context.qNodes,
      cutoffs: context.cutoffs,
      ttHits: context.ttHits,
      evalHits: context.evalHits,
      completedDepth,
      elapsedMs: Math.round(nowMs() - started),
      tableSize: context.table.size,
      search: state.activeFactions.length === 2
        ? "iterative-alpha-beta"
        : "iterative-maxn",
    },
  };
}

function easyBotAction(state, options = {}) {
  const actions = getLegalActions(state);
  if (!actions.length) {
    return {
      action: null,
      score: null,
      stats: { nodes: 0, completedDepth: 0 },
    };
  }

  const random = options.random || Math.random;
  const captures = actions.filter((action) => action.captured);
  const pool = captures.length && random() < 0.7 ? captures : actions;
  const action = pool[Math.floor(random() * pool.length)] || pool[0];

  const result = applyAction(state, action);
  const score = result.error
    ? -INF
    : staticVector(result.state, options.evalWeights || SAN_YOU_EVAL_WEIGHTS)[state.turn];

  return {
    action,
    score,
    stats: {
      nodes: 1,
      qNodes: 0,
      cutoffs: 0,
      ttHits: 0,
      evalHits: 0,
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
  return chooseSearchedAction(state, difficulty, options);
}

export function botLabel(difficulty) {
  return BOT_LEVELS[difficulty]?.label || BOT_LEVELS.medium.label;
}

export function describeBotMove(state, action) {
  if (!action) return "No legal move.";
  const piece = state.pieces.find((candidate) => candidate.id === action.pieceId);
  return `${ROLE_LABELS[piece?.role] || "Piece"}: ${action.from} → ${action.to}`;
}
