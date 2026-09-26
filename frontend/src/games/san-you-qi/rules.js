/*
 * San You Qi — Three Friends Chess
 *
 * This engine uses the finalized Arctic Dominion board: 135 coloured arm
 * intersections plus C1-C24 in the central terrain. Unlike Sanguo Qi, river
 * continuations are not direct mirrored file jumps; every approved C-point is
 * a real playable node and the six central horizontal lines are part of the
 * movement graph.
 */

import {
  ALL_NODE_IDS,
  CONTINUATION_LINES,
  SIDEWAYS_LINES,
  SANYOU_FACTIONS,
  armNodeId,
  backwardNeighbors,
  boardPoint,
  forwardNeighbors,
  isArmNode,
  isCenterNode,
  isEnemyTerritory,
  isOwnArm,
  lineRaysFrom,
  linesThrough,
  nodeLabel,
  parseArmNode,
  pathEdgeAllowedForRole,
  sidewaysNeighbors,
  terrainBetween,
} from "./topology.js";

export const GAME_ID = "san-you-qi";
export const RULESET_VERSION = "arctic-final-159-node-2.0.0";

export const FACTIONS = Object.freeze([...SANYOU_FACTIONS]);
export const FACTION_LABELS = Object.freeze({
  red: "Shu / Red",
  green: "Wu / Green",
  blue: "Wei / Blue",
});
export const FACTION_COLORS = Object.freeze({
  red: "#ef5a4d",
  green: "#43b86a",
  blue: "#318eed",
});

export const ROLES = Object.freeze([
  "general", "advisor", "elephant", "horse", "chariot", "cannon", "soldier", "fire", "flag",
]);

export const ROLE_LABELS = Object.freeze({
  general: "General",
  advisor: "Guard",
  elephant: "Elephant",
  horse: "Horse",
  chariot: "Chariot",
  cannon: "Cannon",
  soldier: "Soldier",
  fire: "Fire",
  flag: "Flag",
});

const TURN_ORDER = Object.freeze(["red", "green", "blue"]);

const PALACE_LANES = new Set([4, 5, 6]);
const PALACE_RANKS = new Set([1, 2, 3]);
const PALACE_DIAGONAL_NEIGHBORS = Object.freeze({
  "L4-1": ["L5-2"],
  "L6-1": ["L5-2"],
  "L5-2": ["L4-1", "L6-1", "L4-3", "L6-3"],
  "L4-3": ["L5-2"],
  "L6-3": ["L5-2"],
});

const STANDARD_OPENING = Object.freeze([
  ["chariot", 1, 1],
  ["horse", 2, 1],
  ["elephant", 3, 1],
  ["advisor", 4, 1],
  ["general", 5, 1],
  ["advisor", 6, 1],
  ["elephant", 7, 1],
  ["horse", 8, 1],
  ["chariot", 9, 1],

  ["cannon", 2, 3],
  ["flag", 4, 3],
  ["flag", 6, 3],
  ["cannon", 8, 3],

  ["soldier", 1, 4],
  ["fire", 3, 4],
  ["soldier", 5, 4],
  ["fire", 7, 4],
  ["soldier", 9, 4],
]);

function clone(value) {
  return typeof structuredClone === "function"
    ? structuredClone(value)
    : JSON.parse(JSON.stringify(value));
}

export function squareKey(node) {
  return typeof node === "string" ? node : "";
}

export function sameNode(a, b) {
  return squareKey(a) === squareKey(b);
}

export function logicalNode(sector, legacyRank, legacyFile) {
  // Backwards-compatible helper for older tests/tools:
  // legacy rank 4..0 maps to visible suffix 1..5; file 0..8 maps to L1..L9.
  return armNodeId(sector, legacyFile + 1, 5 - legacyRank);
}

export function nodeFromLabel(sector, lane, rank) {
  return armNodeId(sector, lane, rank);
}

export function insideSector(node) {
  return Boolean(parseArmNode(node));
}

export function isHome(node, faction) {
  return isOwnArm(faction, node);
}

export function isRiverEndpoint(node) {
  return parseArmNode(node)?.rank === 5;
}

export function territoryOf(node, faction) {
  if (isEnemyTerritory(faction, node)) return "enemy";
  if (isOwnArm(faction, node)) return "own";
  return "neutral";
}

export function terrainAt(node) {
  // Terrain is edge-based on the finalized board; a point itself is not terrain.
  if (!ALL_NODE_IDS.includes(node)) return null;
  return null;
}

function pieceAtUnchecked(pieces, node) {
  return pieces.find((piece) => piece.status === "board" && piece.node === node) || null;
}

function destinationOpenFor(piece, pieces, node) {
  const hit = pieceAtUnchecked(pieces, node);
  return !hit || hit.owner !== piece.owner;
}

function insidePalace(node, faction) {
  const arm = parseArmNode(node);
  return Boolean(
    arm &&
    arm.faction === faction &&
    PALACE_LANES.has(arm.lane) &&
    PALACE_RANKS.has(arm.rank)
  );
}

function localArmTarget(node, dRank, dLane) {
  const arm = parseArmNode(node);
  if (!arm) return null;
  const lane = arm.lane + dLane;
  const rank = arm.rank + dRank;
  if (lane < 1 || lane > 9 || rank < 1 || rank > 5) return null;
  return armNodeId(arm.faction, lane, rank);
}

function dedupeNodes(nodes) {
  return [...new Set(nodes)];
}

function rayTargets(piece, pieces, mode) {
  const out = new Set();

  for (const ray of lineRaysFrom(piece.node)) {
    let previous = piece.node;
    let screened = false;

    for (const node of ray.nodes) {
      if (!pathEdgeAllowedForRole(piece.role, previous, node)) break;

      const hit = pieceAtUnchecked(pieces, node);

      if (mode === "chariot") {
        if (!hit) {
          out.add(node);
        } else {
          if (hit.owner !== piece.owner) out.add(node);
          break;
        }
      } else {
        // Cannon: unrestricted non-capture movement until the first screen;
        // after exactly one screen, the next occupied point may be captured.
        if (!screened) {
          if (hit) screened = true;
          else out.add(node);
        } else if (hit) {
          if (hit.owner !== piece.owner) out.add(node);
          break;
        }
      }

      previous = node;
    }
  }

  return [...out];
}

function chariotTargets(piece, pieces) {
  return rayTargets(piece, pieces, "chariot");
}

function cannonTargets(piece, pieces) {
  return rayTargets(piece, pieces, "cannon");
}

function generalTargets(piece, pieces) {
  const arm = parseArmNode(piece.node);
  if (!arm || !insidePalace(piece.node, piece.faction)) return [];

  const out = [];
  for (const [dRank, dLane] of [[-1,0],[1,0],[0,-1],[0,1]]) {
    const target = localArmTarget(piece.node, dRank, dLane);
    if (!target || !insidePalace(target, piece.faction)) continue;
    if (destinationOpenFor(piece, pieces, target)) out.push(target);
  }

  // Flying-General attack geometry. The direct capture is filtered from legal
  // moves later, but including it here makes self-check and face-to-face checks
  // work on any approved straight continuation line.
  for (const ray of lineRaysFrom(piece.node)) {
    if (ray.kind === "horizontal") continue;
    for (const node of ray.nodes) {
      const hit = pieceAtUnchecked(pieces, node);
      if (!hit) continue;
      if (hit.role === "general" && hit.owner !== piece.owner) out.push(node);
      break;
    }
  }

  return dedupeNodes(out);
}

function advisorTargets(piece, pieces) {
  if (!insidePalace(piece.node, piece.faction)) return [];
  const arm = parseArmNode(piece.node);
  const key = `L${arm.lane}-${arm.rank}`;
  const candidates = PALACE_DIAGONAL_NEIGHBORS[key] || [];
  return candidates
    .map((label) => `${piece.faction}:${label}`)
    .filter((target) => destinationOpenFor(piece, pieces, target));
}

function elephantTargets(piece, pieces) {
  const arm = parseArmNode(piece.node);
  if (!arm || arm.faction !== piece.faction) return [];

  const out = [];
  for (const dRank of [-2, 2]) {
    for (const dLane of [-2, 2]) {
      const target = localArmTarget(piece.node, dRank, dLane);
      if (!target) continue;
      const targetArm = parseArmNode(target);
      if (!targetArm || targetArm.faction !== piece.faction) continue;
      const eye = localArmTarget(piece.node, dRank / 2, dLane / 2);
      if (!eye || pieceAtUnchecked(pieces, eye)) continue;
      if (destinationOpenFor(piece, pieces, target)) out.push(target);
    }
  }
  return out;
}

function normalizedVector(a, b) {
  const pa = boardPoint(a);
  const pb = boardPoint(b);
  if (!pa || !pb) return null;
  const dx = pb[0] - pa[0];
  const dy = pb[1] - pa[1];
  const length = Math.hypot(dx, dy);
  if (!length) return null;
  return [dx / length, dy / length];
}

function roughlyPerpendicular(a, b, c) {
  const first = normalizedVector(a, b);
  const second = normalizedVector(b, c);
  if (!first || !second) return false;
  return Math.abs(first[0] * second[0] + first[1] * second[1]) < 0.58;
}

function horseTargets(piece, pieces) {
  const out = new Set();

  // A Xiangqi horse is represented as two units on one orthogonal line plus
  // one unit on a perpendicular line. The first unit is the blockable "leg".
  for (const ray of lineRaysFrom(piece.node)) {
    if (ray.nodes.length < 2) continue;
    const leg = ray.nodes[0];
    const second = ray.nodes[1];

    if (pieceAtUnchecked(pieces, leg)) continue;
    if (!pathEdgeAllowedForRole("horse", piece.node, leg)) continue;
    if (!pathEdgeAllowedForRole("horse", leg, second)) continue;

    for (const turnLine of linesThrough(second)) {
      for (const direction of [-1, 1]) {
        const index = turnLine.nodes.indexOf(second);
        if (index < 0) continue;
        const target = turnLine.nodes[index + direction];
        if (!target || target === leg || target === piece.node) continue;
        if (!roughlyPerpendicular(leg, second, target)) continue;
        if (!pathEdgeAllowedForRole("horse", second, target)) continue;
        if (destinationOpenFor(piece, pieces, target)) out.add(target);
      }
    }
  }

  return [...out];
}

function diagonalForwardTargets(piece, pieces) {
  const byForwardThenSide = new Set();
  const bySideThenForward = new Set();

  for (const forward of forwardNeighbors(piece.faction, piece.node)) {
    for (const target of sidewaysNeighbors(forward)) {
      if (target !== piece.node) byForwardThenSide.add(target);
    }
  }

  for (const side of sidewaysNeighbors(piece.node)) {
    for (const target of forwardNeighbors(piece.faction, side)) {
      if (target !== piece.node) bySideThenForward.add(target);
    }
  }

  const intersection = [...byForwardThenSide].filter((node) => bySideThenForward.has(node));
  const candidates = intersection.length
    ? intersection
    : [...new Set([...byForwardThenSide, ...bySideThenForward])];

  return candidates.filter((target) => destinationOpenFor(piece, pieces, target));
}

function fireTargets(piece, pieces) {
  return diagonalForwardTargets(piece, pieces);
}

function soldierTargets(piece, pieces) {
  const out = new Set();

  for (const target of forwardNeighbors(piece.faction, piece.node)) {
    if (destinationOpenFor(piece, pieces, target)) out.add(target);
  }

  if (piece.promoted) {
    for (const target of sidewaysNeighbors(piece.node)) {
      if (destinationOpenFor(piece, pieces, target)) out.add(target);
    }
  }

  return [...out];
}

function twoStepForwardTargets(piece, pieces) {
  const out = new Set();
  const firstSteps = forwardNeighbors(piece.faction, piece.node);

  for (const middle of firstSteps) {
    if (pieceAtUnchecked(pieces, middle)) continue;
    for (const target of forwardNeighbors(piece.faction, middle)) {
      if (target === piece.node) continue;
      if (destinationOpenFor(piece, pieces, target)) out.add(target);
    }
  }

  return [...out];
}

function twoStepOrthogonalTargets(piece, pieces) {
  const out = new Set();

  for (const ray of lineRaysFrom(piece.node)) {
    if (ray.nodes.length < 2) continue;
    const middle = ray.nodes[0];
    const target = ray.nodes[1];
    if (pieceAtUnchecked(pieces, middle)) continue;
    if (isOwnArm(piece.faction, target)) continue; // no return to original kingdom
    if (destinationOpenFor(piece, pieces, target)) out.add(target);
  }

  return [...out];
}

function flagTargets(piece, pieces) {
  return piece.leftHome
    ? twoStepOrthogonalTargets(piece, pieces)
    : twoStepForwardTargets(piece, pieces);
}

function pseudoTargetsFor(piece, state) {
  if (!piece || piece.status !== "board") return [];

  switch (piece.role) {
    case "general": return generalTargets(piece, state.pieces);
    case "advisor": return advisorTargets(piece, state.pieces);
    case "elephant": return elephantTargets(piece, state.pieces);
    case "horse": return horseTargets(piece, state.pieces);
    case "chariot": return chariotTargets(piece, state.pieces);
    case "cannon": return cannonTargets(piece, state.pieces);
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
  return pseudoTargetsFor(piece, state);
}

function pieceAt(state, node) {
  return pieceAtUnchecked(state.pieces, node);
}

function generalOf(state, faction) {
  return state.pieces.find(
    (piece) =>
      piece.faction === faction &&
      piece.role === "general" &&
      piece.status === "board",
  ) || null;
}

function activeOpponents(state, faction) {
  return state.activeFactions.filter((candidate) => candidate !== faction);
}

function isGeometricallyAttacked(state, node, byFaction) {
  return state.pieces.some(
    (piece) =>
      piece.status === "board" &&
      piece.owner === byFaction &&
      pseudoTargetsFor(piece, state).some((target) => target === node),
  );
}

export function isInCheck(state, faction) {
  const general = generalOf(state, faction);
  if (!general) return false;
  return activeOpponents(state, faction).some((opponent) =>
    isGeometricallyAttacked(state, general.node, opponent),
  );
}

function previewMove(state, piece, target) {
  const next = clone(state);
  const moving = next.pieces.find((candidate) => candidate.id === piece.id);
  const victim = next.pieces.find(
    (candidate) => candidate.status === "board" && candidate.node === target,
  );

  if (victim) {
    victim.status = "captured";
    victim.node = null;
  }

  moving.node = target;
  moving.hasMoved = true;
  if (!isOwnArm(moving.faction, target)) moving.leftHome = true;
  if (moving.role === "soldier" && isEnemyTerritory(moving.faction, target)) {
    moving.promoted = true;
  }

  return next;
}

function legalTargetsFor(piece, state) {
  const out = [];
  for (const target of pseudoTargetsFor(piece, state)) {
    const victim = pieceAt(state, target);
    if (victim?.owner === piece.owner) continue;

    // Generals are defeated by checkmate/appropriation, not direct capture.
    if (victim?.role === "general" && victim.owner !== piece.owner) continue;

    const preview = previewMove(state, piece, target);
    if (isInCheck(preview, piece.owner)) continue;
    out.push(target);
  }
  return dedupeNodes(out);
}

function baseMoveActions(state, faction) {
  const actions = [];
  for (const piece of state.pieces.filter(
    (candidate) => candidate.owner === faction && candidate.status === "board",
  )) {
    for (const target of legalTargetsFor(piece, state)) {
      const victim = pieceAt(state, target);
      actions.push({
        type: "move",
        pieceId: piece.id,
        from: piece.node,
        to: target,
        captured: victim?.id || null,
      });
    }
  }
  return actions;
}

function positionKey(state) {
  const pieces = state.pieces
    .map((piece) => [
      piece.id,
      piece.faction,
      piece.owner,
      piece.role,
      piece.status,
      piece.node || "",
      piece.promoted ? 1 : 0,
      piece.leftHome ? 1 : 0,
    ])
    .sort((a, b) => a[0].localeCompare(b[0]));

  return JSON.stringify([state.turn, [...state.activeFactions].sort(), pieces]);
}

function generateFor(state, faction, options = {}) {
  if (state.phase !== "play" || state.outcome) return [];
  const candidates = baseMoveActions(state, faction);

  if (options.skipRepetition) return candidates;

  return candidates.filter((action) => {
    const moving = state.pieces.find((piece) => piece.id === action.pieceId);
    const preview = previewMove(state, moving, action.to);
    return !state.repetition[positionKey(preview)];
  });
}

export function getLegalActions(state) {
  const error = stateInvariantError(state);
  if (error || state.phase !== "play" || state.outcome) return [];
  return generateFor(state, state.turn);
}

function hasLegalMove(state, faction) {
  return generateFor(state, faction, { skipRepetition: true }).length > 0;
}

function nextFaction(state, actor) {
  const start = TURN_ORDER.indexOf(actor);
  for (let offset = 1; offset <= TURN_ORDER.length; offset += 1) {
    const faction = TURN_ORDER[(start + offset) % TURN_ORDER.length];
    if (state.activeFactions.includes(faction)) return faction;
  }
  return actor;
}

function stateInvariantError(state) {
  if (!state || state.gameId !== GAME_ID) {
    return { code: "INVALID_STATE", message: "This is not a San You Qi state." };
  }
  if (state.rulesetVersion !== RULESET_VERSION) {
    return {
      code: "RULESET_MISMATCH",
      message: `Expected San You Qi ruleset ${RULESET_VERSION}.`,
    };
  }
  if (
    !FACTIONS.includes(state.turn) ||
    !Array.isArray(state.activeFactions) ||
    !state.activeFactions.includes(state.turn)
  ) {
    return { code: "INVALID_STATE", message: "The active turn is malformed." };
  }
  if (!Array.isArray(state.pieces) || !state.repetition) {
    return { code: "INVALID_STATE", message: "The match state is incomplete." };
  }

  const pieceIds = new Set();
  const occupied = new Set();

  for (const piece of state.pieces) {
    if (
      !piece ||
      typeof piece.id !== "string" ||
      pieceIds.has(piece.id) ||
      !FACTIONS.includes(piece.faction) ||
      !FACTIONS.includes(piece.owner) ||
      !ROLES.includes(piece.role) ||
      !["board", "captured", "eliminated"].includes(piece.status)
    ) {
      return { code: "INVALID_STATE", message: "A piece record is malformed." };
    }

    pieceIds.add(piece.id);

    if (piece.status === "board") {
      if (!ALL_NODE_IDS.includes(piece.node) || occupied.has(piece.node)) {
        return { code: "INVALID_STATE", message: "Board occupancy is malformed." };
      }
      occupied.add(piece.node);
    }
  }

  return null;
}

export function validateAction(state, action) {
  const error = stateInvariantError(state);
  if (error) return { ok: false, error };
  if (state.outcome) {
    return { ok: false, error: { code: "GAME_OVER", message: "The match has already ended." } };
  }

  const match = getLegalActions(state).find(
    (candidate) =>
      candidate.type === action?.type &&
      candidate.pieceId === action?.pieceId &&
      candidate.from === action?.from &&
      candidate.to === action?.to,
  );

  return match
    ? { ok: true, action: match }
    : { ok: false, error: { code: "ILLEGAL_ACTION", message: "That action is not legal in the current position." } };
}

export function applyAction(state, proposed) {
  const validation = validateAction(state, proposed);
  if (!validation.ok) return { state, error: validation.error };

  const action = validation.action;
  const actor = state.turn;
  const movingBefore = state.pieces.find((piece) => piece.id === action.pieceId);
  const next = previewMove(state, movingBefore, action.to);

  next.ply += 1;
  next.lastAction = { ...action, actor, ply: next.ply };

  const mated = activeOpponents(next, actor).filter(
    (faction) => isInCheck(next, faction) && !hasLegalMove(next, faction),
  );

  if (mated.length) {
    for (const defeated of mated) {
      const general = generalOf(next, defeated);
      if (general) {
        general.status = "eliminated";
        general.node = null;
      }

      for (const piece of next.pieces) {
        if (
          piece.faction === defeated &&
          piece.status === "board" &&
          piece.role !== "general"
        ) {
          piece.owner = actor;
        }
      }

      next.activeFactions = next.activeFactions.filter((faction) => faction !== defeated);
    }

    if (next.activeFactions.length <= 1) {
      const winner = next.activeFactions[0] || actor;
      next.outcome = {
        type: "mate",
        winner,
        losers: mated,
        message: `${FACTION_LABELS[winner]} wins — last surviving General.`,
      };
      next.phase = "complete";
    } else {
      next.turn = actor;
      next.note = `${FACTION_LABELS[actor]} checkmates ${mated.map((f) => FACTION_LABELS[f]).join(", ")} and takes control of the surviving army.`;
    }
  } else {
    next.turn = nextFaction(next, actor);
    next.note = `${FACTION_LABELS[next.turn]} to move.`;
  }

  next.repetition[positionKey(next)] = actor;
  return { state: next, error: null };
}

function setupPieces() {
  const pieces = [];

  for (const faction of FACTIONS) {
    const counts = {};

    for (const [role, lane, rank] of STANDARD_OPENING) {
      counts[role] = (counts[role] || 0) + 1;
      pieces.push({
        id: `${faction}-${role}-${counts[role]}`,
        faction,
        owner: faction,
        role,
        node: armNodeId(faction, lane, rank),
        status: "board",
        promoted: false,
        leftHome: false,
        hasMoved: false,
      });
    }
  }

  return pieces;
}

export function createInitialState() {
  const state = {
    gameId: GAME_ID,
    rulesetVersion: RULESET_VERSION,
    phase: "play",
    turn: "red",
    activeFactions: [...FACTIONS],
    pieces: setupPieces(),
    outcome: null,
    lastAction: null,
    note: "Shu / Red opens. Turns proceed Red → Green → Blue.",
    ply: 0,
    repetition: {},
  };

  state.repetition[positionKey(state)] = "initial";
  return state;
}

export function getBoardPiece(state, node) {
  return pieceAtUnchecked(state.pieces, node);
}

export function allNodes() {
  return [...ALL_NODE_IDS];
}

export function getNodeLabel(node) {
  return nodeLabel(node);
}

export function getNodePoint(node) {
  return boardPoint(node);
}

export function hasPromotedSoldier(piece) {
  return piece.role === "soldier" && Boolean(piece.promoted);
}

export const __testing = Object.freeze({
  TURN_ORDER,
  STANDARD_OPENING,
  PALACE_LANES,
  PALACE_RANKS,
  CONTINUATION_LINES,
  SIDEWAYS_LINES,
  pieceAtUnchecked,
  insidePalace,
  parseArmNode,
  forwardNeighbors,
  backwardNeighbors,
  sidewaysNeighbors,
  terrainBetween,
  pathEdgeAllowedForRole,
  isEnemyTerritory,
  isCenterNode,
  isArmNode,
});
