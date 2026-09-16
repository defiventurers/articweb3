import {
  HEX_CELLS,
  HEX_CELL_BY_ID,
  addAxial,
  cellKey,
  isInsideHex,
  parseCellKey,
  rotateAxial
} from "./hex.js";

export const GAME_ID = "sannin-shogi";
export const RULESET_VERSION = "fairbairn-kapitan-digital-1.0.0";
export const FACTIONS = Object.freeze(["red", "green", "blue"]);
export const FACTION_LABELS = Object.freeze({ red: "First", green: "Middle", blue: "Last" });
export const TYPES = Object.freeze(["king", "rook", "bishop", "gold", "silver", "knight", "lance", "pawn"]);
export const TYPE_LABELS = Object.freeze({
  king: "King", rook: "Rook", bishop: "Bishop", gold: "Gold General",
  silver: "Silver General", knight: "Knight", lance: "Lance", pawn: "Pawn"
});

const ROTATION = Object.freeze({ red: 4, green: 0, blue: 2 });
const PROMOTABLE = new Set(["king", "rook", "bishop", "silver", "lance", "pawn"]);
const VALUE = Object.freeze({ king: 4, rook: 3, bishop: 3, gold: 2, silver: 2, knight: 2, lance: 2, pawn: 1 });
const ORTH = Object.freeze({
  1: { q: 1, r: -1 }, 3: { q: 1, r: 0 }, 5: { q: 0, r: 1 },
  7: { q: -1, r: 1 }, 9: { q: -1, r: 0 }, 11: { q: 0, r: -1 }
});
const DIAG = Object.freeze({
  12: { q: 1, r: -2 }, 2: { q: 2, r: -1 }, 4: { q: 1, r: 1 },
  6: { q: -1, r: 2 }, 8: { q: -2, r: 1 }, 10: { q: -1, r: -1 }
});
const MOVE_CLOCKS = Object.freeze({
  king: { stepOrth: [1, 3, 5, 7, 9, 11] },
  rook: { rayOrth: [11, 1, 3, 9], rayDiag: [6] },
  bishop: { rayDiag: [12, 2, 4, 6, 8, 10] },
  gold: { stepOrth: [11, 1, 3, 9], stepDiag: [12, 6] },
  knight: { stepOrth: [3, 9], stepDiag: [2, 4, 8, 10] },
  silver: { stepOrth: [11, 1, 5, 7], stepDiag: [10, 2] },
  lance: { rayOrth: [11, 1] },
  pawn: { stepOrth: [11, 1] }
});

const MIDDLE_SETUP = Object.freeze([
  ["lance", 0, 6], ["silver", -1, 6], ["gold", -2, 6], ["king", -3, 6],
  ["gold", -4, 6], ["silver", -5, 6], ["lance", -6, 6],
  ["rook", 0, 5], ["bishop", -5, 5], ["knight", -2, 4],
  ["pawn", 2, 4], ["pawn", 1, 4], ["pawn", 0, 4], ["pawn", -1, 4],
  ["pawn", -3, 4], ["pawn", -4, 4], ["pawn", -5, 4], ["pawn", -6, 4]
]);

function clone(value) {
  return typeof structuredClone === "function" ? structuredClone(value) : JSON.parse(JSON.stringify(value));
}

function actionKey(action) {
  const copy = { ...action };
  if (copy.targets) copy.targets = [...copy.targets].sort();
  return JSON.stringify(copy);
}

function rotateForFaction(vector, faction) {
  return rotateAxial(vector, ROTATION[faction]);
}

function pieceAt(state, cell) {
  return state.pieces.find((piece) => piece.status === "board" && piece.cell === cell) || null;
}

function kingOf(state, faction) {
  return state.pieces.find((piece) => piece.owner === faction && piece.type === "king" && piece.status === "board") || null;
}

function areAllied(state, a, b) {
  return Boolean(state.alliance?.includes(a) && state.alliance?.includes(b));
}

function activeOpponents(state, faction) {
  return state.activeFactions.filter((candidate) => candidate !== faction);
}

function addTarget(targets, state, piece, axial, attacks) {
  if (!isInsideHex(axial)) return false;
  const id = cellKey(axial.q, axial.r);
  const occupant = pieceAt(state, id);
  if (!occupant || occupant.owner !== piece.owner || attacks) targets.push(id);
  return !occupant;
}

function movementProfile(piece) {
  if (!piece.promoted) return MOVE_CLOCKS[piece.type];
  if (piece.type === "king") return { rayOrth: [1, 3, 5, 7, 9, 11], rayDiag: [12, 2, 4, 6, 8, 10] };
  if (piece.type === "rook") return { rayOrth: [1, 3, 5, 7, 9, 11] };
  if (piece.type === "bishop") return { ...MOVE_CLOCKS.bishop, stepOrth: [1, 3, 5, 7, 9, 11] };
  if (piece.type === "silver") return { ...MOVE_CLOCKS.silver, rayDiag: [12, 6] };
  if (piece.type === "lance") return { rayOrth: [11, 1, 5, 7] };
  if (piece.type === "pawn") return MOVE_CLOCKS.gold;
  return MOVE_CLOCKS[piece.type];
}

export function getPseudoTargets(state, pieceOrId, { attacks = false } = {}) {
  const piece = typeof pieceOrId === "string" ? state.pieces.find((item) => item.id === pieceOrId) : pieceOrId;
  if (!piece || piece.status !== "board") return [];
  const start = parseCellKey(piece.cell);
  const profile = movementProfile(piece);
  const targets = [];
  for (const [kind, clocks] of Object.entries(profile)) {
    const diagonal = kind.endsWith("Diag");
    const ranging = kind.startsWith("ray");
    for (const clock of clocks) {
      const vector = rotateForFaction((diagonal ? DIAG : ORTH)[clock], piece.owner);
      if (!ranging) {
        addTarget(targets, state, piece, addAxial(start, vector), attacks);
        continue;
      }
      for (let step = 1; ; step += 1) {
        const axial = addAxial(start, vector, step);
        if (!isInsideHex(axial)) break;
        if (!addTarget(targets, state, piece, axial, attacks)) break;
      }
    }
  }
  return [...new Set(targets)];
}

export function isHomeTerritory(cell, faction) {
  const axial = parseCellKey(cell);
  if (!axial || !FACTIONS.includes(faction)) return false;
  return rotateAxial(axial, -ROTATION[faction]).r >= 4;
}

export function isPromotionZone(cell, faction) {
  return FACTIONS.some((owner) => owner !== faction && isHomeTerritory(cell, owner));
}

function isGeometricallyAttacked(state, cell, byFaction) {
  return state.pieces.some((piece) => piece.status === "board" && piece.owner === byFaction &&
    getPseudoTargets(state, piece, { attacks: true }).includes(cell));
}

export function isInCheck(state, faction) {
  const king = kingOf(state, faction);
  if (!king) return false;
  return activeOpponents(state, faction).some((owner) => isGeometricallyAttacked(state, king.cell, owner));
}

function futureBaseMoveExists(piece, cell) {
  const start = parseCellKey(cell);
  const profile = MOVE_CLOCKS[piece.type];
  for (const [kind, clocks] of Object.entries(profile)) {
    const vectors = kind.endsWith("Diag") ? DIAG : ORTH;
    for (const clock of clocks) {
      if (isInsideHex(addAxial(start, rotateForFaction(vectors[clock], piece.owner)))) return true;
    }
  }
  return false;
}

function promotionChoices(state, piece, to) {
  if (piece.promoted || !PROMOTABLE.has(piece.type) || state.alliance?.includes(piece.owner)) return [false];
  const garden = piece.cell === "0,0" || to === "0,0";
  const eligible = garden || isPromotionZone(piece.cell, piece.owner) || isPromotionZone(to, piece.owner);
  if (!eligible) return [false];
  if ((piece.type === "pawn" || piece.type === "lance") && !futureBaseMoveExists(piece, to)) return [true];
  return [false, true];
}

function baseMoveActions(state, faction) {
  const actions = [];
  for (const piece of state.pieces.filter((item) => item.owner === faction && item.status === "board")) {
    for (const to of getPseudoTargets(state, piece)) {
      const target = pieceAt(state, to);
      if (target?.type === "king") continue;
      for (const promote of promotionChoices(state, piece, to)) {
        actions.push({ type: "move", pieceId: piece.id, from: piece.cell, to, promote });
      }
    }
  }
  return actions;
}

function castleActions(state, faction) {
  const king = kingOf(state, faction);
  if (!king || king.hasMoved || king.everChecked || state.castlingCancelled[faction] || isInCheck(state, faction)) return [];
  const ordinaryDestinations = new Set(getPseudoTargets(state, king));
  return HEX_CELLS.filter((cell) => isHomeTerritory(cell.id, faction) && cell.id !== king.cell)
    .filter((cell) => !ordinaryDestinations.has(cell.id))
    .filter((cell) => {
      const occupant = pieceAt(state, cell.id);
      return !occupant || (occupant.owner !== faction && occupant.type !== "king");
    })
    .map((cell) => ({ type: "castle", pieceId: king.id, from: king.cell, to: cell.id }));
}

function dropActions(state, faction) {
  const hand = state.pieces.filter((piece) => piece.owner === faction && piece.status === "hand");
  const actions = [];
  for (const piece of hand) {
    for (const cell of HEX_CELLS) {
      if (pieceAt(state, cell.id)) continue;
      if ((piece.type === "pawn" || piece.type === "lance") && !futureBaseMoveExists(piece, cell.id)) continue;
      actions.push({ type: "drop", pieceId: piece.id, to: cell.id });
    }
  }
  return actions;
}

function illuminatedTargets(state, king) {
  const vectors = [...Object.values(ORTH), ...Object.values(DIAG)].map((vector) => rotateForFaction(vector, king.owner));
  const victims = [];
  for (const vector of vectors) {
    const start = parseCellKey(king.cell);
    for (let step = 1; ; step += 1) {
      const axial = addAxial(start, vector, step);
      if (!isInsideHex(axial)) break;
      const occupant = pieceAt(state, cellKey(axial.q, axial.r));
      if (!occupant) continue;
      if (occupant.owner !== king.owner && occupant.type !== "king") {
        const protectedTarget = activeOpponents(state, king.owner).some((owner) =>
          state.pieces.some((piece) => piece.id !== occupant.id && piece.owner === owner && piece.status === "board" &&
            getPseudoTargets(state, piece, { attacks: true }).includes(occupant.cell)));
        if (!protectedTarget) victims.push(occupant.id);
      }
      break;
    }
  }
  return [...new Set(victims)].sort();
}

function illuminationActions(state, faction) {
  const king = kingOf(state, faction);
  if (!king?.promoted || !king.illuminationReady) return [];
  const targets = illuminatedTargets(state, king);
  return targets.length ? [{ type: "illuminate", pieceId: king.id, targets }] : [];
}

function captureIntoHand(next, victim, owner) {
  victim.owner = owner;
  victim.status = "hand";
  victim.cell = null;
  victim.promoted = false;
  victim.hasMoved = false;
  victim.everChecked = false;
  victim.illuminationReady = true;
}

function executeRaw(state, action) {
  const next = clone(state);
  const piece = next.pieces.find((item) => item.id === action.pieceId);
  if (action.type === "move" || action.type === "castle") {
    const victim = pieceAt(next, action.to);
    if (victim) captureIntoHand(next, victim, piece.owner);
    piece.cell = action.to;
    piece.status = "board";
    piece.hasMoved = true;
    if (action.promote) piece.promoted = true;
  } else if (action.type === "drop") {
    piece.cell = action.to;
    piece.status = "board";
    piece.promoted = false;
    piece.hasMoved = true;
  } else if (action.type === "illuminate") {
    for (const id of action.targets) {
      const victim = next.pieces.find((item) => item.id === id);
      if (victim?.status === "board") captureIntoHand(next, victim, piece.owner);
    }
  }
  return next;
}

function royalSafetyHolds(state, actor) {
  const protectedFactions = state.alliance?.includes(actor) ? state.alliance : [actor];
  return protectedFactions.every((faction) => !isInCheck(state, faction));
}

function isPawnDropMate(state, action, actor) {
  if (action.type !== "drop") return false;
  const dropped = state.pieces.find((piece) => piece.id === action.pieceId);
  if (dropped?.type !== "pawn") return false;
  const preview = executeRaw(state, action);
  return activeOpponents(preview, actor).some((faction) => isInCheck(preview, faction) &&
    generateFor(preview, faction, { skipPawnDropMate: true, skipRepetition: true }).length === 0);
}

function positionKey(state) {
  const pieces = state.pieces.map(({ owner, type, promoted, status, cell, hasMoved, everChecked, illuminationReady }) =>
    type === "king"
      ? [owner, type, promoted ? 1 : 0, status, cell || "", hasMoved ? 1 : 0, everChecked ? 1 : 0, illuminationReady ? 1 : 0]
      : [owner, type, promoted ? 1 : 0, status, cell || ""])
    .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
  return JSON.stringify([state.turn, state.activeFactions, state.alliance, state.castlingCancelled, state.pending, pieces]);
}

function generateFor(state, faction, options = {}) {
  if (state.outcome || !state.activeFactions.includes(faction)) return [];
  const candidates = [
    ...baseMoveActions(state, faction), ...castleActions(state, faction),
    ...dropActions(state, faction), ...illuminationActions(state, faction)
  ];
  return candidates.filter((action) => {
    const preview = executeRaw(state, action);
    if (!royalSafetyHolds(preview, faction)) return false;
    if (!options.skipPawnDropMate && isPawnDropMate(state, action, faction)) return false;
    prepareCandidatePosition(state, preview, faction);
    if (preview.pending.invalidAllianceCheck) return false;
    if (!options.skipRepetition) {
      if (state.repetition[positionKey(preview)]) return false;
    }
    return true;
  });
}

function prepareCandidatePosition(before, preview, actor) {
  delete preview.pending.invalidAllianceCheck;
  if (isInCheck(before, actor)) {
    const king = kingOf(preview, actor);
    if (king) king.everChecked = true;
  }
  detectCompulsoryAlliance(before, preview, actor);
  preview.turn = nextFaction(preview, actor);
  const nextKing = kingOf(preview, preview.turn);
  if (nextKing?.promoted && !nextKing.illuminationReady) nextKing.illuminationReady = true;
  for (const faction of preview.activeFactions) {
    if (isInCheck(preview, faction)) {
      const checkedKing = kingOf(preview, faction);
      if (checkedKing) checkedKing.everChecked = true;
    }
  }
  return preview;
}

export function getLegalActions(state) {
  if (stateInvariantError(state) || state.phase !== "play" || state.outcome) return [];
  return generateFor(state, state.turn);
}

export function validateAction(state, action) {
  const stateError = stateInvariantError(state);
  if (stateError) return { ok: false, error: stateError };
  if (state.outcome) return { ok: false, error: { code: "GAME_OVER", message: "The match has already ended." } };
  const wanted = actionKey(action);
  const legal = getLegalActions(state).find((candidate) => actionKey(candidate) === wanted);
  return legal ? { ok: true, action: legal } : { ok: false, error: { code: "ILLEGAL_ACTION", message: "That action is not legal in the current position." } };
}

function stateInvariantError(state) {
  if (!state || state.gameId !== GAME_ID) return { code: "INVALID_STATE", message: "This is not a Sannin Shogi state." };
  if (state.rulesetVersion !== RULESET_VERSION) return { code: "RULESET_MISMATCH", message: `Expected Sannin ruleset ${RULESET_VERSION}.` };
  if (!FACTIONS.includes(state.turn) || !Array.isArray(state.activeFactions) || new Set(state.activeFactions).size !== state.activeFactions.length ||
    state.activeFactions.some((faction) => !FACTIONS.includes(faction)) || !state.activeFactions.includes(state.turn)) {
    return { code: "INVALID_STATE", message: "The active turn is malformed." };
  }
  if (state.alliance !== null) {
    const validAlliance = Array.isArray(state.alliance) && state.alliance.length === 2 &&
      new Set(state.alliance).size === 2 && state.alliance.every((faction) => state.activeFactions.includes(faction));
    if (!validAlliance) return { code: "INVALID_ALLIANCE", message: "An alliance must contain exactly two distinct active factions." };
  }
  if (!Array.isArray(state.pieces) || !state.pending || !state.repetition || Array.isArray(state.repetition) || typeof state.repetition !== "object" ||
    !state.castlingCancelled || !FACTIONS.every((faction) => typeof state.castlingCancelled[faction] === "boolean")) {
    return { code: "INVALID_STATE", message: "The serializable match state is incomplete." };
  }
  const pieceIds = new Set();
  const occupiedCells = new Set();
  for (const piece of state.pieces) {
    if (!piece || typeof piece.id !== "string" || pieceIds.has(piece.id) || !FACTIONS.includes(piece.owner) || !TYPES.includes(piece.type) ||
      !["board", "hand", "eliminated"].includes(piece.status)) return { code: "INVALID_STATE", message: "A piece record is malformed." };
    pieceIds.add(piece.id);
    if (piece.status === "board") {
      if (!HEX_CELL_BY_ID[piece.cell] || occupiedCells.has(piece.cell)) return { code: "INVALID_STATE", message: "Board occupancy is malformed." };
      occupiedCells.add(piece.cell);
    } else if (piece.cell !== null) return { code: "INVALID_STATE", message: "Off-board pieces cannot retain a cell." };
  }
  return null;
}

function nextFaction(state, actor) {
  const start = FACTIONS.indexOf(actor);
  for (let offset = 1; offset <= FACTIONS.length; offset += 1) {
    const faction = FACTIONS[(start + offset) % FACTIONS.length];
    if (state.activeFactions.includes(faction)) return faction;
  }
  return actor;
}

function eliminate(next, faction) {
  for (const piece of next.pieces) {
    if (piece.owner === faction) {
      piece.status = "eliminated";
      piece.cell = null;
    }
  }
  next.activeFactions = next.activeFactions.filter((item) => item !== faction);
}

function dissolveAlliance(next) {
  next.alliance = null;
}

function resolveMate(next, actor) {
  const mated = activeOpponents(next, actor).filter((faction) => !areAllied(next, actor, faction)).filter((faction) =>
    // A repetition is an illegal reply in this ruleset. Ignoring it here could
    // make an actually mated allied King look "escapable", then let its partner
    // fall through to the ordinary no-move draw check on the following turn.
    isInCheck(next, faction) && generateFor(next, faction, { skipPawnDropMate: true }).length === 0);
  if (!mated.length) return false;
  if (next.alliance && mated.some((faction) => next.alliance.includes(faction)) && !next.alliance.includes(actor)) {
    next.outcome = { type: "mate", winner: actor, losers: [...next.alliance], message: `${FACTION_LABELS[actor]} defeats the alliance.` };
    next.phase = "complete";
    return true;
  }
  for (const faction of mated) eliminate(next, faction);
  if (next.alliance && mated.some((faction) => !next.alliance.includes(faction)) && next.alliance.includes(actor)) dissolveAlliance(next);
  if (next.activeFactions.length === 1) {
    next.outcome = { type: "mate", winner: next.activeFactions[0], losers: FACTIONS.filter((f) => f !== next.activeFactions[0]), message: `${FACTION_LABELS[next.activeFactions[0]]} wins by mate.` };
    next.phase = "complete";
  }
  return true;
}

function gardenWinner(next, actor) {
  const king = kingOf(next, actor);
  if (!king || king.cell !== "0,0" || next.alliance?.includes(actor) || isInCheck(next, actor)) return false;
  next.outcome = { type: "garden", winner: actor, losers: activeOpponents(next, actor), message: `${FACTION_LABELS[actor]} reaches the Pleasure Garden safely.` };
  next.phase = "complete";
  return true;
}

function threatSummary(state, actor) {
  const map = {};
  for (const target of activeOpponents(state, actor)) {
    const threatened = new Set();
    for (const attacker of state.pieces.filter((piece) => piece.owner === actor && piece.status === "board")) {
      for (const cell of getPseudoTargets(state, attacker, { attacks: true })) {
        const victim = pieceAt(state, cell);
        if (victim?.owner === target && (VALUE[victim.type] > VALUE[attacker.type] || !isGeometricallyAttacked(state, victim.cell, target))) threatened.add(victim.id);
      }
    }
    if (threatened.size) map[target] = [...threatened].sort();
  }
  return map;
}

function formAlliance(next, allies) {
  if (next.alliance || allies.length !== 2) return false;
  const [first, second] = allies;
  const firstKing = kingOf(next, first);
  const secondKing = kingOf(next, second);
  const mutualRoyalAttack = (firstKing && isGeometricallyAttacked(next, firstKing.cell, second)) ||
    (secondKing && isGeometricallyAttacked(next, secondKing.cell, first));
  if (mutualRoyalAttack) {
    next.pending.invalidAllianceCheck = true;
    return false;
  }
  next.alliance = [...allies].sort();
  for (const faction of next.activeFactions) next.castlingCancelled[faction] = true;
  const unallied = next.activeFactions.find((faction) => !next.alliance.includes(faction));
  const king = kingOf(next, unallied);
  if (king) {
    king.promoted = true;
    king.illuminationReady = false;
  }
  return true;
}

function detectCompulsoryAlliance(before, next, actor) {
  if (next.alliance || next.activeFactions.length !== 3) return;
  const summary = threatSummary(next, actor);
  const prior = before.pending?.attack;
  if (prior) {
    for (const [target, ids] of Object.entries(summary)) {
      if (prior.actor !== actor && prior.target === target && ids.some((id) => !prior.targets.includes(id))) {
        const formed = formAlliance(next, [prior.actor, actor]);
        next.pending.attack = formed ? null : { actor, target, targets: ids };
        return;
      }
    }
  }
  for (const [target, ids] of Object.entries(summary)) {
    next.pending.attack = { actor, target, targets: ids };
    return;
  }
  next.pending.attack = null;
}

function finalizeTurn(next, actor, hadMate) {
  if (next.outcome) return;
  next.turn = hadMate ? actor : nextFaction(next, actor);
  if (!next.activeFactions.includes(next.turn)) next.turn = nextFaction(next, actor);
  const king = kingOf(next, next.turn);
  if (king?.promoted && !king.illuminationReady) king.illuminationReady = true;
  for (const faction of next.activeFactions) {
    if (isInCheck(next, faction)) {
      const kingPiece = kingOf(next, faction);
      if (kingPiece) kingPiece.everChecked = true;
    }
  }
  const turnActions = generateFor(next, next.turn);
  if (turnActions.length === 0 && next.alliance?.includes(next.turn)) {
    const checkedAlly = next.alliance.find((faction) => faction !== next.turn && isInCheck(next, faction));
    if (checkedAlly) {
      const allyReplies = generateFor(next, checkedAlly);
      // An ally who can answer the check takes the defence turn. This keeps the
      // checked alliance from being mislabeled as a stalemate merely because the
      // other allied seat has no independently legal move.
      if (allyReplies.length) {
        next.turn = checkedAlly;
        return;
      }
      next.outcome = { type: "mate", winner: actor, losers: [...next.alliance], message: `${FACTION_LABELS[actor]} defeats the alliance.` };
      next.phase = "complete";
      return;
    }
  }
  if (!isInCheck(next, next.turn) && turnActions.length === 0) {
    next.outcome = { type: "draw", winner: null, losers: [], message: "Draw: the player to act has no legal action." };
    next.phase = "complete";
  }
}

export function applyAction(state, proposed) {
  const validation = validateAction(state, proposed);
  if (!validation.ok) return { state, error: validation.error };
  const action = validation.action;
  const actor = state.turn;
  const next = executeRaw(state, action);
  if (isInCheck(state, actor)) {
    const checkedKing = kingOf(next, actor);
    if (checkedKing) checkedKing.everChecked = true;
  }
  next.ply += 1;
  next.lastAction = { ...action, actor, ply: next.ply };
  detectCompulsoryAlliance(state, next, actor);
  if (!gardenWinner(next, actor)) {
    const hadMate = resolveMate(next, actor);
    finalizeTurn(next, actor, hadMate);
  }
  if (!next.outcome) next.repetition[positionKey(next)] = actor;
  return { state: next, error: null };
}

function setupPieces() {
  const pieces = [];
  for (const faction of FACTIONS) {
    const counts = {};
    for (const [type, q, r] of MIDDLE_SETUP) {
      counts[type] = (counts[type] || 0) + 1;
      const axial = rotateAxial({ q, r }, ROTATION[faction]);
      pieces.push({
        id: `${faction}-${type}-${counts[type]}`, owner: faction, type, promoted: false,
        status: "board", cell: cellKey(axial.q, axial.r), hasMoved: false,
        everChecked: false, illuminationReady: true
      });
    }
  }
  return pieces;
}

export function createInitialState({ alliance = null } = {}) {
  const requestedAlliance = Array.isArray(alliance) ? [...new Set(alliance)].sort() : null;
  // Faction colors are fixed to historical seat/turn roles in this local edition.
  // Therefore a pregame pact is represented after seat assignment: Middle + Last.
  const normalizedAlliance = JSON.stringify(requestedAlliance) === JSON.stringify(["blue", "green"])
    ? requestedAlliance : null;
  const state = {
    gameId: GAME_ID,
    rulesetVersion: RULESET_VERSION,
    phase: "play",
    turn: normalizedAlliance ? FACTIONS.find((faction) => !normalizedAlliance.includes(faction)) : "red",
    activeFactions: [...FACTIONS],
    alliance: normalizedAlliance,
    castlingCancelled: { red: Boolean(normalizedAlliance), green: Boolean(normalizedAlliance), blue: Boolean(normalizedAlliance) },
    pieces: setupPieces(),
    pending: { attack: null },
    outcome: null,
    lastAction: null,
    ply: 0,
    repetition: {}
  };
  if (normalizedAlliance) {
    const king = kingOf(state, state.turn);
    king.promoted = true;
    king.illuminationReady = true;
  }
  state.repetition[positionKey(state)] = "setup";
  return state;
}

export function getHand(state, faction) {
  return state.pieces.filter((piece) => piece.owner === faction && piece.status === "hand");
}

export function getBoardPiece(state, cell) {
  return HEX_CELL_BY_ID[cell] ? pieceAt(state, cell) : null;
}

export function assetRole(piece) {
  if (!piece.promoted || piece.type === "king") return piece.type;
  return { rook: "dragon", bishop: "horse", silver: "promoted-silver", lance: "promoted-lance", pawn: "tokin" }[piece.type] || piece.type;
}

export const __testing = Object.freeze({ positionKey, ROTATION, MIDDLE_SETUP, ORTH, DIAG });
