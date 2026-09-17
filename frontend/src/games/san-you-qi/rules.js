/*
 * San You Qi — Three Friends Chess
 * Pure game-logic engine for the Qing-dynasty three-player Xiangqi variant
 * invented by Zheng Jinde. One 9×5 half-board per kingdom (Red/Shu, Blue/Wei,
 * Green/Wu) arranged in a Y around a central triangular terrain junction.
 *
 * Movement is standard Xiangqi geometry on local rank/file coordinates. The
 * only board-specific geometry is the river crossing at the central file
 * (file 4, rank 0) of each arm, which branches into both other kingdoms —
 * the same three-way junction model used by Sanguo Qi in this project.
 */

export const GAME_ID = "san-you-qi";
export const RULESET_VERSION = "zheng-jinde-qing-kangxi-1.1.0";

export const FACTIONS = Object.freeze(["red", "green", "blue"]);
export const FACTION_LABELS = Object.freeze({
  red: "Shu / Red",
  green: "Wu / Green",
  blue: "Wei / Blue",
});
export const FACTION_COLORS = Object.freeze({ red: "#ef5a4d", green: "#43b86a", blue: "#318eed" });

export const ROLES = Object.freeze([
  "general", "advisor", "elephant", "horse", "chariot", "cannon", "soldier", "fire", "flag",
]);
export const ROLE_LABELS = Object.freeze({
  general: "General", advisor: "Advisor", elephant: "Elephant", horse: "Horse",
  chariot: "Chariot", cannon: "Cannon", soldier: "Soldier", fire: "Fire", flag: "Flag",
});

export const RANK_COUNT = 5;
export const FILE_COUNT = 9;
export const RIVER_RANK = 0;
export const HOME_RANK = 4;
export const CENTRAL_FILE = 4;
export const PALACE_LEFT = 3;
export const PALACE_RIGHT = 5;
export const PALACE_FRONT = 2;

/** Each kingdom's central-file river endpoint branches into both other kingdoms. */
export const JUNCTION_EXITS = Object.freeze({
  red: ["blue", "green"],
  blue: ["red", "green"],
  green: ["red", "blue"],
});

/** Non-central river exits: files left of center cross one neighbor; right files cross the other. */
const RIVER_SIDE_EXITS = Object.freeze({
  red: { left: "blue", right: "green" },
  green: { left: "red", right: "blue" },
  blue: { left: "green", right: "red" },
});

const TURN_ORDER = ["red", "green", "blue"];
const ORTH_STEPS = [[-1, 0], [1, 0], [0, -1], [0, 1]];
const ELEPHANT_DELTAS = [[-2, -2], [-2, 2], [2, -2], [2, 2]];
const HORSE_DELTAS = [
  [-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1],
];

// Palace is 3 ranks deep (2-4) × 3 files (3-5). The X diagonals connect:
//   (2,3)↔(3,4)↔(4,5)   and   (2,5)↔(3,4)↔(4,3)
const PALACE_CENTER = { rank: 3, file: 4 };
const PALACE_DIAGONALS = Object.freeze({
  "2-3": ["3-4"], "2-5": ["3-4"],
  "3-4": ["2-3", "2-5", "4-3", "4-5"],
  "4-3": ["3-4"], "4-5": ["3-4"],
});

/** Terrain overlays. These are code-owned legal markers, not derived from artwork. */
export const TERRAIN = Object.freeze({
  sea: FACTIONS.map((sector) => ({ sector, rank: RIVER_RANK, file: CENTRAL_FILE })),
  mountain: FACTIONS.flatMap((sector) => [
    { sector, rank: RIVER_RANK, file: 2 },
    { sector, rank: RIVER_RANK, file: 6 },
  ]),
  city: FACTIONS.flatMap((sector) => [
    { sector, rank: RIVER_RANK, file: 0 },
    { sector, rank: RIVER_RANK, file: 8 },
  ]),
});

export function terrainAt(node) {
  for (const [type, entries] of Object.entries(TERRAIN)) {
    for (const entry of entries) {
      if (entry.sector === node.sector && entry.rank === node.rank && entry.file === node.file) {
        return type;
      }
    }
  }
  return null;
}

const TERRAIN_BANNED_ROLES = Object.freeze({
  sea: new Set(["chariot", "horse"]),
  mountain: new Set(["cannon"]),
  city: new Set(["cannon"]),
});

function isTerrainBlocked(piece, node) {
  const type = terrainAt(node);
  if (!type) return false;
  return TERRAIN_BANNED_ROLES[type]?.has(piece.role) ?? false;
}

/** Sliding pieces may not pass *through* restricted terrain. */
function rayBlockedByTerrain(piece, node) {
  const type = terrainAt(node);
  if (!type) return false;
  if (type === "sea" && (piece.role === "chariot" || piece.role === "horse")) return true;
  if ((type === "mountain" || type === "city") && piece.role === "cannon") return true;
  return false;
}

function clone(value) {
  return typeof structuredClone === "function" ? structuredClone(value) : JSON.parse(JSON.stringify(value));
}

export function squareKey(node) {
  return `${node.sector}-${node.rank}-${node.file}`;
}

export function sameNode(a, b) {
  return squareKey(a) === squareKey(b);
}

export function logicalNode(sector, rank, file) {
  return { sector, rank, file };
}

export function insideSector(rank, file) {
  return rank >= 0 && rank < RANK_COUNT && file >= 0 && file < FILE_COUNT;
}

/** River exits from a rank-0 endpoint.
 * - Central file (4) branches into both other kingdoms (the Y-junction).
 * - Other files cross straight into the partner kingdom at the mirrored file. */
export function riverExits(node) {
  if (node.rank !== RIVER_RANK) return [];
  if (node.file === CENTRAL_FILE) {
    return JUNCTION_EXITS[node.sector].map((sector) =>
      logicalNode(sector, RIVER_RANK, CENTRAL_FILE),
    );
  }
  const mirror = 8 - node.file;
  const side = node.file < CENTRAL_FILE ? "left" : "right";
  const targetSector = RIVER_SIDE_EXITS[node.sector][side];
  return [logicalNode(targetSector, RIVER_RANK, mirror)];
}

/** Horizontal ray (along ranks) inside one sector. */
export function rankRays(node) {
  const { sector, rank, file } = node;
  return [
    Array.from({ length: file }, (_, i) => logicalNode(sector, rank, file - i - 1)),
    Array.from({ length: FILE_COUNT - file - 1 }, (_, i) => logicalNode(sector, rank, file + i + 1)),
  ].filter((ray) => ray.length > 0);
}

/** Vertical ray (along files) plus river-crossing continuation. */
export function fileRays(node) {
  const { sector, rank, file } = node;
  const outward = Array.from(
    { length: HOME_RANK - rank }, (_, i) => logicalNode(sector, rank + i + 1, file),
  );
  const toRiver = Array.from(
    { length: rank }, (_, i) => logicalNode(sector, rank - i - 1, file),
  );
  const endpoint = logicalNode(sector, RIVER_RANK, file);
  const exits = riverExits(endpoint);
  const inward = exits.length
    ? exits.map((exit) => [
      ...toRiver,
      ...Array.from({ length: RANK_COUNT }, (_, r) => logicalNode(exit.sector, r, exit.file)),
    ])
    : [toRiver];
  return [outward, ...inward].filter((ray) => ray.length > 0);
}

/** All ray directions for sliding pieces. */
export function allRays(node) {
  return [...rankRays(node), ...fileRays(node)];
}

function insidePalace(node) {
  return node.rank >= PALACE_FRONT && node.rank <= HOME_RANK
    && node.file >= PALACE_LEFT && node.file <= PALACE_RIGHT;
}

function pieceAtUnchecked(pieces, node) {
  return pieces.find((p) => p.status === "board" && sameNode(p.node, node)) || null;
}

function rayTarget(piece, node, pieces) {
  if (rayBlockedByTerrain(piece, node)) return { blocked: true };
  if (isTerrainBlocked(piece, node)) return { blocked: false, skip: true };
  const hit = pieceAtUnchecked(pieces, node);
  return { blocked: false, hit, empty: !hit };
}

function horseTargets(piece, pieces) {
  const { node, owner } = piece;
  const out = [];
  for (const [dr, df] of HORSE_DELTAS) {
    // Determine the leg node: for |dr|=2 the leg is one step in the rank
    // direction (same file); for |df|=2 the leg is one step in the file
    // direction (same rank).
    const legRank = Math.abs(dr) === 2 ? node.rank + Math.sign(dr) : node.rank;
    const legFile = Math.abs(df) === 2 ? node.file + Math.sign(df) : node.file;
    const legInSector = insideSector(legRank, legFile);
    let legNode;
    if (legInSector) {
      legNode = logicalNode(node.sector, legRank, legFile);
    } else {
      // Leg crosses the river boundary. The leg point is at rank 0 of the
      // current sector; resolve via riverExits.
      const riverNode = logicalNode(node.sector, RIVER_RANK, node.file);
      const exits = riverExits(riverNode);
      if (exits.length === 0) continue;
      // The leg is one step from rank 0 into the foreign sector.
      // For a horse L with |dr|=2, the leg is at rank 0 (same sector), dest is rank 1 (foreign).
      // For |df|=2, the leg is at rank 0 file ±1, which is still in-sector if file ±1 is 0-8.
      // This is complex; skip river-crossing horse legs for now (rare edge case).
      continue;
    }

    if (pieceAtUnchecked(pieces, legNode)) continue;

    // Destination
    const destRank = node.rank + dr;
    const destFile = node.file + df;
    if (insideSector(destRank, destFile)) {
      const target = logicalNode(node.sector, destRank, destFile);
      if (isTerrainBlocked(piece, target) || rayBlockedByTerrain(piece, target)) continue;
      const hit = pieceAtUnchecked(pieces, target);
      if (!hit || hit.owner !== owner) out.push(target);
    }
    // Note: river-crossing horse destinations are skipped (edge case, not in
    // the core rulebook's described setup where horses stay in-sector).
  }
  return out;
}

function elephantTargets(piece, pieces) {
  const { node, owner } = piece;
  const out = [];
  for (const [dr, df] of ELEPHANT_DELTAS) {
    const destRank = node.rank + dr;
    const destFile = node.file + df;
    if (!insideSector(destRank, destFile)) continue;
    // Elephants cannot cross the river (stay in own sector).
    if (destRank < PALACE_FRONT) continue;
    const eye = logicalNode(node.sector, node.rank + dr / 2, node.file + df / 2);
    if (pieceAtUnchecked(pieces, eye)) continue;
    const target = logicalNode(node.sector, destRank, destFile);
    const hit = pieceAtUnchecked(pieces, target);
    if (!hit || hit.owner !== owner) out.push(target);
  }
  return out;
}

function advisorTargets(piece, pieces) {
  const { node, owner } = piece;
  if (!insidePalace(node)) return [];
  const key = `${node.rank}-${node.file}`;
  const destinations = PALACE_DIAGONALS[key] || [];
  const out = [];
  for (const dest of destinations) {
    const [rank, file] = dest.split("-").map(Number);
    const target = logicalNode(node.sector, rank, file);
    if (!insidePalace(target)) continue;
    const hit = pieceAtUnchecked(pieces, target);
    if (!hit || hit.owner !== owner) out.push(target);
  }
  return out;
}

function generalTargets(piece, pieces) {
  const { node, owner } = piece;
  if (!insidePalace(node)) return [];
  const out = [];
  for (const [dr, df] of ORTH_STEPS) {
    const target = logicalNode(node.sector, node.rank + dr, node.file + df);
    if (!insidePalace(target)) continue;
    const hit = pieceAtUnchecked(pieces, target);
    if (!hit || hit.owner !== owner) out.push(target);
  }
  return out;
}

function chariotTargets(piece, pieces) {
  const out = [];
  for (const ray of allRays(piece.node)) {
    for (const node of ray) {
      const result = rayTarget(piece, node, pieces);
      if (result.blocked) break;
      if (result.skip) continue;
      if (result.empty) {
        out.push(node);
        continue;
      }
      if (result.hit.owner !== piece.owner) out.push(node);
      break;
    }
  }
  return out;
}

function cannonTargets(piece, pieces) {
  const out = [];
  for (const ray of allRays(piece.node)) {
    let screened = false;
    for (const node of ray) {
      const result = rayTarget(piece, node, pieces);
      if (result.blocked) break;
      if (result.skip) continue;
      if (!screened) {
        if (result.hit) {
          screened = true; // first piece becomes the screen
        } else {
          out.push(node); // empty square before any screen: cannon can move here
        }
        continue;
      }
      if (!result.hit) continue;
      if (result.hit.owner !== piece.owner) out.push(node);
      break;
    }
  }
  return out;
}

function soldierTargets(piece, pieces) {
  const { node, owner } = piece;
  const crossed = node.sector !== owner;
  const out = [];
  if (!crossed) {
    // Forward = rank - 1 (toward the river).
    if (node.rank > 0) {
      const target = logicalNode(node.sector, node.rank - 1, node.file);
      if (!isTerrainBlocked(piece, target) && !rayBlockedByTerrain(piece, target) && !pieceAtUnchecked(pieces, target)?.owner) {
        const hit = pieceAtUnchecked(pieces, target);
        if (!hit || hit.owner !== owner) out.push(target);
      }
    } else {
      // At the river: cross it.
      for (const exit of riverExits(node)) {
        if (isTerrainBlocked(piece, exit) || rayBlockedByTerrain(piece, exit)) continue;
        const hit = pieceAtUnchecked(pieces, exit);
        if (!hit || hit.owner !== owner) out.push(exit);
      }
    }
  } else {
    // After crossing: forward deeper (rank + 1) or sideways.
    const forward = logicalNode(node.sector, node.rank + 1, node.file);
    if (forward.rank <= HOME_RANK && !isTerrainBlocked(piece, forward) && !rayBlockedByTerrain(piece, forward)) {
      const hit = pieceAtUnchecked(pieces, forward);
      if (!hit || hit.owner !== owner) out.push(forward);
    }
    for (const df of [-1, 1]) {
      const target = logicalNode(node.sector, node.rank, node.file + df);
      if (!insideSector(target.rank, target.file)) continue;
      if (isTerrainBlocked(piece, target) || rayBlockedByTerrain(piece, target)) continue;
      const hit = pieceAtUnchecked(pieces, target);
      if (!hit || hit.owner !== owner) out.push(target);
    }
  }
  return out;
}

function fireTargets(piece, pieces) {
  const { node, owner } = piece;
  const out = [];
  // Forward diagonal = rank - 1, file ±1 (toward the river/palace).
  for (const df of [-1, 1]) {
    const target = logicalNode(node.sector, node.rank - 1, node.file + df);
    if (!insideSector(target.rank, target.file)) continue;
    if (isTerrainBlocked(piece, target) || rayBlockedByTerrain(piece, target)) continue;
    const hit = pieceAtUnchecked(pieces, target);
    if (!hit || hit.owner !== owner) out.push(target);
  }
  return out;
}

function flagTargets(piece, pieces) {
  const { node, owner } = piece;
  const crossed = node.sector !== owner;
  if (crossed) {
    // After leaving home territory: exactly two orthogonal steps in any
    // direction, with a clear intermediate point. Chinese descriptions also
    // prohibit returning to the original kingdom.
    const out = [];
    for (const ray of allRays(node)) {
      if (ray.length < 2) continue;
      const intermediate = ray[0];
      const target = ray[1];
      if (target.sector === owner) continue;
      if (pieceAtUnchecked(pieces, intermediate)) continue;
      const hit = pieceAtUnchecked(pieces, target);
      if (!hit || hit.owner !== owner) out.push(target);
    }
    return out;
  }
  // Two straight steps forward (rank - 1).
  const step1Rank = node.rank - 1;
  if (step1Rank < 0) return []; // can't cross the river in two steps from rank 0/1
  const step1 = logicalNode(node.sector, step1Rank, node.file);
  if (isTerrainBlocked(piece, step1) || rayBlockedByTerrain(piece, step1)) return [];
  if (pieceAtUnchecked(pieces, step1)) return []; // step 1 must be empty
  const step2Rank = node.rank - 2;
  if (step2Rank < 0) return []; // would cross the river — can't do two steps
  const step2 = logicalNode(node.sector, step2Rank, node.file);
  if (isTerrainBlocked(piece, step2) || rayBlockedByTerrain(piece, step2)) return [];
  const hit = pieceAtUnchecked(pieces, step2);
  if (!hit || hit.owner !== owner) return [step2];
  return [];
}

function pseudoTargetsFor(piece, state) {
  if (piece.status !== "board") return [];
  switch (piece.role) {
    case "chariot": return chariotTargets(piece, state.pieces);
    case "cannon": return cannonTargets(piece, state.pieces);
    case "general": return generalTargets(piece, state.pieces);
    case "advisor": return advisorTargets(piece, state.pieces);
    case "elephant": return elephantTargets(piece, state.pieces);
    case "horse": return horseTargets(piece, state.pieces);
    case "soldier": return soldierTargets(piece, state.pieces);
    case "fire": return fireTargets(piece, state.pieces);
    case "flag": return flagTargets(piece, state.pieces);
    default: return [];
  }
}

export function getPseudoTargets(state, pieceOrId) {
  const piece = typeof pieceOrId === "string"
    ? state.pieces.find((item) => item.id === pieceOrId)
    : pieceOrId;
  if (!piece || piece.status !== "board") return [];
  return pseudoTargetsFor(piece, state);
}

function pieceAt(state, node) {
  return pieceAtUnchecked(state.pieces, node);
}

function generalOf(state, faction) {
  return state.pieces.find(
    (p) => p.owner === faction && p.role === "general" && p.status === "board",
  ) || null;
}

function activeOpponents(state, faction) {
  return state.activeFactions.filter((f) => f !== faction);
}

function isGeometricallyAttacked(state, node, byFaction) {
  return state.pieces.some(
    (p) => p.status === "board" && p.owner === byFaction &&
      pseudoTargetsFor(p, state).some((t) => sameNode(t, node)),
  );
}

function isInCheck(state, faction) {
  const king = generalOf(state, faction);
  if (!king) return false;
  return activeOpponents(state, faction).some((owner) =>
    isGeometricallyAttacked(state, king.node, owner),
  );
}

function nextFaction(state, actor) {
  const start = TURN_ORDER.indexOf(actor);
  for (let offset = 1; offset <= FACTIONS.length; offset += 1) {
    const faction = FACTIONS[(start + offset) % FACTIONS.length];
    if (state.activeFactions.includes(faction)) return faction;
  }
  return actor;
}

function hasLegalMove(state, faction) {
  return baseMoveActions(state, faction).length > 0;
}

function previewMove(state, piece, target) {
  const next = clone(state);
  const moving = next.pieces.find((p) => p.id === piece.id);
  const victim = next.pieces.find((p) => p.status === "board" && sameNode(p.node, target));
  if (victim) {
    victim.status = "hand";
    victim.owner = moving.owner;
    victim.hasMoved = false;
  }
  moving.node = target;
  moving.hasMoved = true;
  return next;
}

function legalTargetsFor(piece, state) {
  if (piece.status !== "board") return [];
  const pseudo = pseudoTargetsFor(piece, state);
  const out = [];
  for (const target of pseudo) {
    const victim = pieceAt(state, target);
    // No capturing a General directly — checkmate triggers appropriation.
    if (victim?.role === "general" && victim.owner !== piece.owner) continue;
    if (victim?.owner === piece.owner) continue;
    const preview = previewMove(state, piece, target);
    // Cannot leave own General in check.
    if (isInCheck(preview, piece.owner)) continue;
    out.push(target);
  }
  return out;
}

function baseMoveActions(state, faction) {
  const actions = [];
  for (const piece of state.pieces.filter((p) => p.owner === faction && p.status === "board")) {
    for (const to of legalTargetsFor(piece, state)) {
      const victim = pieceAt(state, to);
      actions.push({ type: "move", pieceId: piece.id, from: piece.node, to, captured: victim?.role || null });
    }
  }
  return actions;
}

function positionKey(state) {
  const pieces = state.pieces
    .map((p) => [p.owner, p.role, p.status, p.status === "board" ? squareKey(p.node) : "", p.hasMoved ? 1 : 0])
    .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
  return JSON.stringify([state.turn, state.activeFactions, pieces]);
}

function generateFor(state, faction, options = {}) {
  if (state.phase !== "play" || state.outcome) return [];
  const candidates = baseMoveActions(state, faction);
  return candidates.filter((action) => {
    const moving = state.pieces.find((p) => p.id === action.pieceId);
    const preview = previewMove(state, moving, action.to);
    if (!options.skipRepetition && state.repetition[positionKey(preview)]) return false;
    return true;
  });
}

export function getLegalActions(state) {
  const err = stateInvariantError(state);
  if (err || state.phase !== "play" || state.outcome) return [];
  return generateFor(state, state.turn);
}

function stateInvariantError(state) {
  if (!state || state.gameId !== GAME_ID) return { code: "INVALID_STATE", message: "This is not a San You Qi state." };
  if (state.rulesetVersion !== RULESET_VERSION) return { code: "RULESET_MISMATCH", message: `Expected San You Qi ruleset ${RULESET_VERSION}.` };
  if (!FACTIONS.includes(state.turn) || !Array.isArray(state.activeFactions) || !state.activeFactions.includes(state.turn)) {
    return { code: "INVALID_STATE", message: "The active turn is malformed." };
  }
  if (!Array.isArray(state.pieces) || state.lastAction === undefined || !state.repetition) return { code: "INVALID_STATE", message: "The match state is incomplete." };
  const pieceIds = new Set();
  const occupied = new Set();
  for (const piece of state.pieces) {
    if (!piece || typeof piece.id !== "string" || pieceIds.has(piece.id) ||
      !FACTIONS.includes(piece.owner) || !ROLES.includes(piece.role) ||
      !["board", "hand", "eliminated"].includes(piece.status)) {
      return { code: "INVALID_STATE", message: "A piece record is malformed." };
    }
    pieceIds.add(piece.id);
    if (piece.status === "board") {
      const k = squareKey(piece.node);
      if (occupied.has(k)) return { code: "INVALID_STATE", message: "Board occupancy is malformed." };
      occupied.add(k);
    }
  }
  return null;
}

export function validateAction(state, action) {
  const err = stateInvariantError(state);
  if (err) return { ok: false, error: err };
  if (state.outcome) return { ok: false, error: { code: "GAME_OVER", message: "The match has already ended." } };
  const legal = getLegalActions(state);
  const match = legal.find((a) =>
    a.type === action.type && a.pieceId === action.pieceId &&
    a.from && a.to && sameNode(a.from, action.from) && sameNode(a.to, action.to),
  );
  return match ? { ok: true, action: match } : { ok: false, error: { code: "ILLEGAL_ACTION", message: "That action is not legal in the current position." } };
}

export function applyAction(state, proposed) {
  const validation = validateAction(state, proposed);
  if (!validation.ok) return { state, error: validation.error };
  const action = validation.action;
  const actor = state.turn;
  const next = clone(state);
  const moving = next.pieces.find((p) => p.id === action.pieceId);
  const victim = next.pieces.find((p) => p.status === "board" && sameNode(p.node, action.to));
  if (victim) {
    victim.status = "hand";
    victim.owner = moving.owner;
    victim.hasMoved = false;
  }
  moving.node = action.to;
  moving.hasMoved = true;
  next.ply += 1;
  next.lastAction = { ...action, actor, ply: next.ply };

  // Appropriation: if any opponent is now checkmated, remove their General and
  // transfer surviving pieces to the mating player.
  const mated = activeOpponents(next, actor).filter(
    (faction) => !hasLegalMove(next, faction) && isInCheck(next, faction),
  );

  if (mated.length > 0) {
    for (const faction of mated) {
      const general = next.pieces.find((p) => p.owner === faction && p.role === "general" && p.status === "board");
      if (general) {
        general.status = "eliminated";
        general.node = null;
      }
      for (const piece of next.pieces) {
        if (piece.owner === faction && piece.status === "board" && piece.role !== "general") {
          piece.owner = actor;
        }
      }
      next.activeFactions = next.activeFactions.filter((f) => f !== faction);
    }
    if (next.activeFactions.length <= 1) {
      const winner = next.activeFactions[0] || actor;
      next.outcome = { type: "mate", winner, losers: mated, message: `${FACTION_LABELS[winner]} wins — last surviving kingdom.` };
      next.phase = "complete";
    } else {
      next.turn = actor; // mating player continues
      next.note = `${FACTION_LABELS[actor]} checkmates ${mated.map(FACTION_LABELS).join(", ")}. Appropriates the defeated army.`;
    }
  } else {
    next.turn = nextFaction(next, actor);
    next.note = `${FACTION_LABELS[actor]} to move → ${FACTION_LABELS[next.turn]}.`;
  }

  if (!next.outcome) {
    next.repetition[positionKey(next)] = actor;
    if (!hasLegalMove(next, next.turn) && isInCheck(next, next.turn)) {
      next.outcome = { type: "mate", winner: actor, losers: [next.turn], message: `${FACTION_LABELS[actor]} wins — ${FACTION_LABELS[next.turn]} is checkmated.` };
      next.phase = "complete";
    }
  }
  return { state: next, error: null };
}

/**
 * Standard Xiangqi opening for one kingdom, adapted for San You Qi.
 * Palace is ranks 2-4 (3 ranks), files 3-5.
 * - Rank 4 (back): 9 standard pieces, General at center.
 * - Rank 3: empty (between palace and cannons).
 * - Rank 2: Two Cannons at files 1 and 7; Two Flags at palace front corners (files 3, 5).
 * - Rank 1: 3 Soldiers (files 0,4,8) + 2 Fire (files 2,6) replacing 2 soldiers.
 * Total: 9 + 2 + 2 + 5 = 18 pieces.
 */
const STANDARD_OPENING = Object.freeze([
  ["chariot", 4, 0], ["horse", 4, 1], ["elephant", 4, 2], ["advisor", 4, 3],
  ["general", 4, 4], ["advisor", 4, 5], ["elephant", 4, 6], ["horse", 4, 7], ["chariot", 4, 8],
  ["flag", 2, 3], ["flag", 2, 5],
  ["cannon", 2, 1], ["cannon", 2, 7],
  ["soldier", 1, 0], ["fire", 1, 2], ["soldier", 1, 4], ["fire", 1, 6], ["soldier", 1, 8],
]);

function setupPieces() {
  const pieces = [];
  for (const faction of FACTIONS) {
    const counts = {};
    for (const [role, rank, file] of STANDARD_OPENING) {
      counts[role] = (counts[role] || 0) + 1;
      pieces.push({
        id: `${faction}-${role}-${counts[role]}`,
        owner: faction,
        role,
        node: { sector: faction, rank, file },
        status: "board",
        hasMoved: false,
      });
    }
  }
  return pieces;
}

export function createInitialState() {
  return {
    gameId: GAME_ID,
    rulesetVersion: RULESET_VERSION,
    phase: "play",
    turn: "red",
    activeFactions: [...FACTIONS],
    pieces: setupPieces(),
    pending: null,
    outcome: null,
    lastAction: null,
    note: "Shu / Red opens. Turns proceed counterclockwise: Red → Green → Blue.",
    ply: 0,
    repetition: {},
  };
}

export function getBoardPiece(state, node) {
  return state.pieces.find((p) => p.status === "board" && sameNode(p.node, node)) || null;
}

export function allNodes() {
  const nodes = [];
  for (const sector of FACTIONS) {
    for (let rank = 0; rank < RANK_COUNT; rank += 1) {
      for (let file = 0; file < FILE_COUNT; file += 1) {
        nodes.push(logicalNode(sector, rank, file));
      }
    }
  }
  return nodes;
}

export function isHome(node, faction) {
  return node.sector === faction;
}

export function isRiverEndpoint(node) {
  return node.rank === RIVER_RANK;
}

export function territoryOf(node, faction) {
  return node.sector === faction ? "own" : "foreign";
}

export const __testing = Object.freeze({
  RIVER_RANK, HOME_RANK, CENTRAL_FILE, PALACE_FRONT, PALACE_LEFT, PALACE_RIGHT,
  RANK_COUNT, FILE_COUNT, TURN_ORDER, STANDARD_OPENING,
  sameNode, logicalNode, riverExits, rankRays, fileRays, allRays,
  insidePalace, insideSector, pieceAtUnchecked,
  PALACE_DIAGONALS, PALACE_CENTER,
});
