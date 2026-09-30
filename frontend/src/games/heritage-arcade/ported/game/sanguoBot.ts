import {
  applySanguoMove,
  generalIsAttacked,
  legalSanguoTargets,
  nodeId,
  pseudoSanguoTargets,
  resolveSanguoAppropriation,
  sanguoFactions,
  type SanguoFaction,
  type SanguoNode,
  type SanguoPiece,
  type SanguoRole,
  type SanguoState,
} from "./sanguoRules";

export type BotDifficulty = "easy" | "medium" | "hard";
export type SanguoAction =
  | { type: "move"; pieceId: string; to: SanguoNode }
  | { type: "resolve" };

export type SanguoEvalWeights = {
  strongestRival: number;
  secondRival: number;
  mobility: number;
  attackedPiece: number;
  doubleAttackedPiece: number;
  check: number;
  sideToMoveInCheck: number;
  checkPressure: number;
  soldierProgress: number;
  crossedSoldier: number;
  majorPieceProgress: number;
  centralFile: number;
  riverControl: number;
  enemySector: number;
  eliminatedOpponent: number;
};

export const BOT_LEVELS = {
  easy: {
    label: "Easy",
    description: "Plays legal moves with a little capture preference.",
    search: "random",
    depth: 1,
    width: 6,
    qDepth: 0,
    qWidth: 0,
    budget: 150,
    tableSize: 0,
  },
  medium: {
    label: "Medium",
    description: "Tactical three-player search with Xiangqi development, king safety and forcing-line analysis.",
    search: "paranoid",
    depth: 4,
    width: 20,
    qDepth: 2,
    qWidth: 14,
    budget: 1600,
    tableSize: 50000,
  },
  hard: {
    label: "Hard",
    description: "Deep iterative three-player search with transpositions, quiescence and aggressive reply analysis.",
    search: "paranoid",
    depth: 7,
    width: 34,
    qDepth: 4,
    qWidth: 24,
    budget: 6500,
    tableSize: 200000,
  },
} as const;

export const SANGUO_EVAL_WEIGHTS: SanguoEvalWeights = {
  strongestRival: 0.55,
  secondRival: 0.18,
  mobility: 1.25,
  attackedPiece: 0.28,
  doubleAttackedPiece: 0.12,
  check: 900,
  sideToMoveInCheck: 320,
  checkPressure: 150,
  soldierProgress: 15,
  crossedSoldier: 95,
  majorPieceProgress: 5,
  centralFile: 20,
  riverControl: 8,
  enemySector: 18,
  eliminatedOpponent: 5200,
};

const VALUE: Record<SanguoRole, number> = {
  king: 30000,
  icebreaker: 1000,
  cannon: 460,
  rider: 440,
  runner: 430,
  guard: 210,
  seer: 210,
  scout: 125,
};

const MOBILITY_FACTOR: Record<SanguoRole, number> = {
  king: 0.18,
  guard: 0.28,
  seer: 0.30,
  rider: 1.00,
  runner: 0.75,
  icebreaker: 0.90,
  cannon: 0.95,
  scout: 0.50,
};

const MATE_SCORE = 10_000_000;
const INF = 100_000_000;
const HOME_RANK = 4;
const CENTRAL_FILE = 4;

const nowMs = () =>
  typeof performance !== "undefined" && performance.now
    ? performance.now()
    : Date.now();

const actionKey = (action: SanguoAction | null | undefined) =>
  !action
    ? ""
    : action.type === "resolve"
      ? "resolve"
      : `${action.pieceId}|${nodeId(action.to)}`;

const occupant = (state: SanguoState, node: SanguoNode) =>
  state.pieces.find((piece) => !piece.captured && nodeId(piece.node) === nodeId(node));

const pieceValue = (piece: SanguoPiece) => VALUE[piece.role] || 0;

const boardPieces = (state: SanguoState, controller?: SanguoFaction) =>
  state.pieces.filter(
    (piece) =>
      !piece.captured &&
      (controller == null || piece.controller === controller),
  );

function pieceProgress(piece: SanguoPiece) {
  return piece.node.sector === piece.sector
    ? HOME_RANK - piece.node.rank
    : 5 + piece.node.rank;
}

function terminalValue(state: SanguoState, faction: SanguoFaction) {
  if (state.draw) return 0;
  if (state.winner) return state.winner === faction ? MATE_SCORE : -MATE_SCORE;
  if (state.defeated.includes(faction)) return -MATE_SCORE;
  return null;
}

function buildThreatMaps(state: SanguoState) {
  const threats: Record<SanguoFaction, Map<string, number>> = {
    red: new Map(),
    green: new Map(),
    blue: new Map(),
  };

  for (const piece of boardPieces(state)) {
    const map = threats[piece.controller];
    for (const target of pseudoSanguoTargets(piece, state.pieces)) {
      const key = nodeId(target);
      map.set(key, (map.get(key) || 0) + 1);
    }
  }

  return threats;
}

function rawFactionScore(
  state: SanguoState,
  faction: SanguoFaction,
  threats: Record<SanguoFaction, Map<string, number>>,
  weights: SanguoEvalWeights,
) {
  if (state.defeated.includes(faction)) return -MATE_SCORE;

  let score = 0;

  for (const piece of boardPieces(state, faction)) {
    const value = pieceValue(piece);
    const targets = pseudoSanguoTargets(piece, state.pieces);
    const progress = pieceProgress(piece);

    score += value;
    score += targets.length * weights.mobility * MOBILITY_FACTOR[piece.role];

    if (piece.role === "scout") {
      score += progress * weights.soldierProgress;
      if (piece.node.sector !== piece.sector) score += weights.crossedSoldier;
    } else if (["rider", "cannon", "icebreaker", "runner"].includes(piece.role)) {
      score += progress * weights.majorPieceProgress;
    }

    if (
      ["icebreaker", "cannon", "rider"].includes(piece.role) &&
      piece.node.file === CENTRAL_FILE
    ) {
      score += weights.centralFile;
    }

    if (piece.node.rank === 0) {
      score += weights.riverControl;
    }

    if (piece.node.sector !== piece.sector) {
      score += weights.enemySector;
    }

    const attackers = sanguoFactions
      .filter(
        (enemy) =>
          enemy !== faction &&
          !state.defeated.includes(enemy),
      )
      .reduce(
        (sum, enemy) => sum + (threats[enemy].get(nodeId(piece.node)) || 0),
        0,
      );

    if (piece.role !== "king" && attackers > 0) {
      score -= value * weights.attackedPiece;
      if (attackers > 1) {
        score -= value * weights.doubleAttackedPiece * (attackers - 1);
      }
    }
  }

  if (generalIsAttacked(faction, state.pieces)) {
    score -= weights.check;
    if (state.turn === faction) score -= weights.sideToMoveInCheck;
  }

  for (const rival of sanguoFactions) {
    if (
      rival !== faction &&
      !state.defeated.includes(rival) &&
      generalIsAttacked(rival, state.pieces)
    ) {
      score += weights.checkPressure;
    }
  }

  score += state.defeated.filter((rival) => rival !== faction).length * weights.eliminatedOpponent;
  return score;
}

/**
 * Xiangqi-informed, controller-aware evaluation.
 *
 * Captured armies that were appropriated are naturally counted for their new
 * controller because material, mobility and threats are all keyed by
 * piece.controller rather than original sector.
 */
export function evaluateSanguo(
  state: SanguoState,
  weights: SanguoEvalWeights = SANGUO_EVAL_WEIGHTS,
): Record<SanguoFaction, number> {
  const terminal = {
    red: terminalValue(state, "red"),
    green: terminalValue(state, "green"),
    blue: terminalValue(state, "blue"),
  };

  if (state.draw || state.winner) {
    return {
      red: terminal.red ?? 0,
      green: terminal.green ?? 0,
      blue: terminal.blue ?? 0,
    };
  }

  const threats = buildThreatMaps(state);
  const raw = Object.fromEntries(
    sanguoFactions.map((faction) => [
      faction,
      terminal[faction] ?? rawFactionScore(state, faction, threats, weights),
    ]),
  ) as Record<SanguoFaction, number>;

  const scores = { ...raw };

  for (const faction of sanguoFactions) {
    if (state.defeated.includes(faction)) {
      scores[faction] = -MATE_SCORE;
      continue;
    }

    const rivals = sanguoFactions
      .filter(
        (candidate) =>
          candidate !== faction &&
          !state.defeated.includes(candidate),
      )
      .map((candidate) => raw[candidate])
      .sort((a, b) => b - a);

    if (rivals[0] != null) scores[faction] -= rivals[0] * weights.strongestRival;
    if (rivals[1] != null) scores[faction] -= rivals[1] * weights.secondRival;
  }

  return scores;
}

export function sanguoActions(state: SanguoState): SanguoAction[] {
  if (state.winner || state.draw) return [];
  if (state.pending) return [{ type: "resolve" }];

  return state.pieces
    .filter((piece) => !piece.captured && piece.controller === state.turn)
    .flatMap((piece) =>
      legalSanguoTargets(piece, state.pieces).map((to) => ({
        type: "move" as const,
        pieceId: piece.id,
        to,
      })),
    );
}

export function applySanguoAction(
  state: SanguoState,
  action: SanguoAction,
) {
  return action.type === "resolve"
    ? resolveSanguoAppropriation(state)
    : applySanguoMove(state, action.pieceId, action.to);
}

/** Collapse only the deterministic appropriation action while searching. */
function settleForcedResolution(state: SanguoState) {
  let current = state;
  let guard = 0;

  while (current.pending && !current.winner && !current.draw && guard < 3) {
    const next = resolveSanguoAppropriation(current);
    if (!next) break;
    current = next;
    guard += 1;
  }

  return current;
}

function searchChild(state: SanguoState, action: SanguoAction) {
  const next = applySanguoAction(state, action);
  return next ? settleForcedResolution(next) : null;
}

function stateKey(state: SanguoState) {
  const pieces = state.pieces
    .map((piece) => [
      piece.id,
      piece.controller,
      piece.captured ? 1 : 0,
      nodeId(piece.node),
    ])
    .sort((a, b) => String(a[0]).localeCompare(String(b[0])));

  return JSON.stringify([
    state.turn,
    [...state.defeated].sort(),
    state.winner || "",
    state.pending
      ? [
          state.pending.defeated,
          state.pending.victor,
          state.pending.reason,
          state.pending.matingPieceId || "",
        ]
      : null,
    state.draw || "",
    state.quietMoves || 0,
    state.positions || [],
    pieces,
  ]);
}

function captureValue(action: SanguoAction, state: SanguoState) {
  if (action.type === "resolve") return 100000;
  const victim = occupant(state, action.to);
  return victim ? pieceValue(victim) : 0;
}

function crossesRiver(state: SanguoState, action: SanguoAction) {
  if (action.type !== "move") return false;
  const piece = state.pieces.find((candidate) => candidate.id === action.pieceId);
  return Boolean(
    piece &&
    piece.role === "scout" &&
    piece.node.sector === piece.sector &&
    action.to.sector !== piece.sector,
  );
}

type SearchLevel = {
  depth: number;
  width: number;
  qDepth: number;
  qWidth: number;
  budget: number;
  tableSize: number;
};

type SearchContext = {
  rootFaction: SanguoFaction;
  level: SearchLevel;
  weights: SanguoEvalWeights;
  deadline: number;
  timeoutSignal: symbol;
  table: Map<string, TTEntry>;
  killers: Map<number, string[]>;
  history: Map<string, number>;
  nodes: number;
  qNodes: number;
  cutoffs: number;
  ttHits: number;
  checkDeadline: () => void;
};

type TTEntry = {
  depth: number;
  value: number;
  flag: "exact" | "lower" | "upper";
  moveKey: string;
};

type PreparedChild = {
  action: SanguoAction;
  child: SanguoState;
  priority: number;
  forcing: boolean;
  quiet: boolean;
};

function fastMovePriority(
  state: SanguoState,
  action: SanguoAction,
  context: SearchContext,
  ply: number,
  ttMoveKey = "",
) {
  const key = actionKey(action);
  let score = 0;

  if (key === ttMoveKey) score += 5_000_000;
  if (action.type === "resolve") return score + 20_000_000;

  const moving = state.pieces.find((piece) => piece.id === action.pieceId)!;
  const victim = occupant(state, action.to);

  if (victim) {
    score +=
      1_000_000 +
      pieceValue(victim) * 90 -
      pieceValue(moving) * 7;
  }

  if (crossesRiver(state, action)) score += 180_000;
  if (action.to.file === CENTRAL_FILE) score += 3500;
  if (action.to.rank === 0) score += 2200;

  const killers = context.killers.get(ply);
  if (killers?.includes(key)) score += 600_000;
  score += context.history.get(key) || 0;

  return score;
}

function preparedChildren(
  state: SanguoState,
  context: SearchContext,
  ply: number,
  limit: number,
  ttMoveKey = "",
): PreparedChild[] {
  const actions = sanguoActions(state);
  const prepared: PreparedChild[] = [];

  for (const action of actions) {
    context.checkDeadline();

    const beforeDefeated = state.defeated.length;
    const victim = action.type === "move" ? occupant(state, action.to) : null;
    const crossed = crossesRiver(state, action);
    const child = searchChild(state, action);
    if (!child) continue;

    const checkCount = sanguoFactions.filter(
      (faction) =>
        faction !== state.turn &&
        !child.defeated.includes(faction) &&
        generalIsAttacked(faction, child.pieces),
    ).length;

    const eliminated = child.defeated.length - beforeDefeated;
    const winning = child.winner === context.rootFaction;
    const forcing =
      Boolean(victim) ||
      crossed ||
      checkCount > 0 ||
      eliminated > 0 ||
      Boolean(child.winner) ||
      generalIsAttacked(state.turn, state.pieces);

    let priority = fastMovePriority(state, action, context, ply, ttMoveKey);
    if (winning) priority += 30_000_000;
    if (eliminated) priority += 6_000_000 * eliminated;
    if (checkCount) priority += 260_000 * checkCount;

    prepared.push({
      action,
      child,
      priority,
      forcing,
      quiet: !victim && !crossed && !checkCount && !eliminated,
    });
  }

  prepared.sort(
    (a, b) =>
      b.priority - a.priority ||
      actionKey(a.action).localeCompare(actionKey(b.action)),
  );

  if (!Number.isFinite(limit) || prepared.length <= limit) return prepared;

  const forcing = prepared.filter((entry) => entry.forcing);
  const quiet = prepared.filter((entry) => !entry.forcing);
  return [
    ...forcing,
    ...quiet.slice(0, Math.max(0, limit - forcing.length)),
  ];
}

function recordCutoff(
  context: SearchContext,
  action: SanguoAction,
  ply: number,
  depth: number,
  quiet: boolean,
) {
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
    Math.min(
      2_000_000,
      (context.history.get(key) || 0) + depth * depth * 500,
    ),
  );
}

function transpositionLookup(
  context: SearchContext,
  key: string,
  depth: number,
  alpha: number,
  beta: number,
) {
  const entry = context.table.get(key);
  if (!entry || entry.depth < depth) return null;

  context.ttHits += 1;

  if (entry.flag === "exact") {
    return { value: entry.value, moveKey: entry.moveKey, cutoff: true };
  }
  if (entry.flag === "lower" && entry.value >= beta) {
    return { value: entry.value, moveKey: entry.moveKey, cutoff: true };
  }
  if (entry.flag === "upper" && entry.value <= alpha) {
    return { value: entry.value, moveKey: entry.moveKey, cutoff: true };
  }

  return { value: entry.value, moveKey: entry.moveKey, cutoff: false };
}

function transpositionStore(
  context: SearchContext,
  key: string,
  entry: TTEntry,
) {
  if (!context.level.tableSize) return;

  if (context.table.size >= context.level.tableSize) {
    const remove = Math.max(1, Math.floor(context.level.tableSize * 0.08));
    const iterator = context.table.keys();

    for (let index = 0; index < remove; index += 1) {
      const next = iterator.next();
      if (next.done) break;
      context.table.delete(next.value);
    }
  }

  context.table.set(key, entry);
}

function rootScore(
  state: SanguoState,
  context: SearchContext,
) {
  return evaluateSanguo(state, context.weights)[context.rootFaction];
}

function quiescence(
  state: SanguoState,
  alpha: number,
  beta: number,
  qDepth: number,
  context: SearchContext,
  ply: number,
): number {
  context.checkDeadline();
  context.nodes += 1;
  context.qNodes += 1;

  const terminal = terminalValue(state, context.rootFaction);
  if (terminal != null && (state.winner || state.draw || state.defeated.includes(context.rootFaction))) {
    return terminal;
  }

  const maximizing = state.turn === context.rootFaction;
  const checked = generalIsAttacked(state.turn, state.pieces);
  const standPat = rootScore(state, context);

  if (qDepth <= 0) return standPat;

  if (!checked) {
    if (maximizing) {
      if (standPat >= beta) return standPat;
      alpha = Math.max(alpha, standPat);
    } else {
      if (standPat <= alpha) return standPat;
      beta = Math.min(beta, standPat);
    }
  }

  let children = preparedChildren(
    state,
    context,
    ply,
    context.level.qWidth,
  );

  if (!checked) {
    children = children
      .filter((entry) => entry.forcing)
      .slice(0, context.level.qWidth);
  }

  if (!children.length) return standPat;

  let best = checked ? (maximizing ? -INF : INF) : standPat;

  for (const entry of children) {
    const score = quiescence(
      entry.child,
      alpha,
      beta,
      qDepth - 1,
      context,
      ply + 1,
    );

    if (maximizing) {
      if (score > best) best = score;
      alpha = Math.max(alpha, best);
    } else {
      if (score < best) best = score;
      beta = Math.min(beta, best);
    }

    if (alpha >= beta) {
      context.cutoffs += 1;
      break;
    }
  }

  return best;
}

/**
 * Root-centric paranoid search.
 *
 * Red/Green/Blue still take turns exactly according to the authoritative rule
 * engine. The search assumption is simply that every non-root faction chooses
 * the reply that minimizes the root faction's score, which makes alpha-beta
 * pruning available for this three-player game.
 */
function paranoidSearch(
  state: SanguoState,
  depth: number,
  alpha: number,
  beta: number,
  context: SearchContext,
  ply: number,
): number {
  context.checkDeadline();
  context.nodes += 1;

  const terminal = terminalValue(state, context.rootFaction);
  if (terminal != null && (state.winner || state.draw || state.defeated.includes(context.rootFaction))) {
    return terminal;
  }

  if (depth <= 0) {
    return quiescence(
      state,
      alpha,
      beta,
      context.level.qDepth,
      context,
      ply,
    );
  }

  const key = `${context.rootFaction}|${stateKey(state)}`;
  const originalAlpha = alpha;
  const originalBeta = beta;
  const tt = transpositionLookup(context, key, depth, alpha, beta);
  if (tt?.cutoff) return tt.value;

  const maximizing = state.turn === context.rootFaction;
  const children = preparedChildren(
    state,
    context,
    ply,
    context.level.width,
    tt?.moveKey || "",
  );

  if (!children.length) return rootScore(state, context);

  let best = maximizing ? -INF : INF;
  let bestMoveKey = "";

  for (const entry of children) {
    const score = paranoidSearch(
      entry.child,
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

  let flag: TTEntry["flag"] = "exact";
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

type BotOptions = {
  random?: () => number;
  budgetMs?: number;
  maxDepth?: number;
  width?: number;
  qDepth?: number;
  qWidth?: number;
  evalWeights?: SanguoEvalWeights;
};

function easyBotAction(
  state: SanguoState,
  options: BotOptions,
) {
  const started = nowMs();
  const actions = sanguoActions(state);

  if (!actions.length) {
    return {
      action: null,
      stats: {
        nodes: 0,
        qNodes: 0,
        cutoffs: 0,
        ttHits: 0,
        completedDepth: 0,
        elapsedMs: Math.round(nowMs() - started),
        search: "capture-biased-random",
      },
    };
  }

  if (state.pending) {
    return {
      action: actions[0],
      stats: {
        nodes: 1,
        qNodes: 0,
        cutoffs: 0,
        ttHits: 0,
        completedDepth: 1,
        elapsedMs: Math.round(nowMs() - started),
        search: "forced-resolution",
      },
    };
  }

  const random = options.random ?? Math.random;
  const captures = actions.filter((action) => captureValue(action, state) > 0);
  const pool = captures.length && random() < 0.4 ? captures : actions;
  const action =
    pool[Math.min(pool.length - 1, Math.floor(random() * pool.length))] ||
    pool[0];

  return {
    action,
    stats: {
      nodes: 1,
      qNodes: 0,
      cutoffs: 0,
      ttHits: 0,
      completedDepth: 1,
      elapsedMs: Math.round(nowMs() - started),
      search: "capture-biased-random",
    },
  };
}

function searchBotAction(
  state: SanguoState,
  difficulty: "medium" | "hard",
  options: BotOptions,
) {
  const configured = BOT_LEVELS[difficulty];
  const level: SearchLevel = {
    depth: options.maxDepth ?? configured.depth,
    width: options.width ?? configured.width,
    qDepth: options.qDepth ?? configured.qDepth,
    qWidth: options.qWidth ?? configured.qWidth,
    budget: options.budgetMs ?? configured.budget,
    tableSize: configured.tableSize,
  };

  if (state.defeated.length === 1 && difficulty === "hard") {
    level.depth += 2;
    level.width = Math.max(level.width, 42);
    level.qWidth = Math.max(level.qWidth, 28);
  }

  const started = nowMs();
  const timeoutSignal = Symbol("sanguo-search-timeout");
  const deadline = started + level.budget;
  const rootFaction = state.turn;
  const context: SearchContext = {
    rootFaction,
    level,
    weights: options.evalWeights ?? SANGUO_EVAL_WEIGHTS,
    deadline,
    timeoutSignal,
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

  const actions = sanguoActions(state);

  const result = (
    action: SanguoAction | null,
    score: number | null,
    completedDepth: number,
  ) => ({
    action,
    score,
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
  });

  if (!actions.length) return result(null, null, 0);
  if (state.pending) return result(actions[0], null, 1);

  const fallback = [...actions].sort(
    (a, b) =>
      fastMovePriority(state, b, context, 0) -
        fastMovePriority(state, a, context, 0) ||
      actionKey(a).localeCompare(actionKey(b)),
  );

  let bestAction = fallback[0] || actions[0];
  let bestScore = -INF;
  let completedDepth = 0;
  let principalKey = actionKey(bestAction);

  try {
    const initial = preparedChildren(
      state,
      context,
      0,
      Number.POSITIVE_INFINITY,
    );

    if (initial.length) {
      bestAction = initial[0].action;
      bestScore = rootScore(initial[0].child, context);
      completedDepth = 1;
      principalKey = actionKey(bestAction);
    }

    for (let depth = 2; depth <= level.depth; depth += 1) {
      context.checkDeadline();

      const rootChildren = preparedChildren(
        state,
        context,
        0,
        level.width,
        principalKey,
      );

      let iterationAction = bestAction;
      let iterationScore = -INF;
      let alpha = -INF;

      for (const entry of rootChildren) {
        context.checkDeadline();

        const score = paranoidSearch(
          entry.child,
          depth - 1,
          alpha,
          INF,
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
      principalKey = actionKey(bestAction);
      completedDepth = depth;
    }
  } catch (error) {
    if (error !== timeoutSignal) throw error;
  }

  return result(bestAction, bestScore, completedDepth);
}

export function chooseSanguoBotAction(
  state: SanguoState,
  difficulty: BotDifficulty = "medium",
  options: BotOptions = {},
) {
  if (difficulty === "easy") return easyBotAction(state, options);
  return searchBotAction(state, difficulty, options);
}
