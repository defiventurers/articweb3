/** Sanguo Yan Yi Qi, tutorial Free Play edition. Independent of the Y-board Sanguo engine.
 * Authority: the user-supplied 36:52 tutorial; disagreements with the 2020 article
 * are documented in the accompanying rulebook. No Xiangqi flying-General rule.
 */
export const YAN_YI_VERSION = "sanguo-yan-yi-free-play-1";
export const YAN_YI_FACTIONS = ["green", "blue", "red"] as const;
export type YanYiFaction = typeof YAN_YI_FACTIONS[number];
export type YanYiRole = "king" | "advisor" | "elephant" | "horse" | "chariot" | "cannon" | "soldier" | "emperor";
export type YanYiPoint = { x: number; y: number };
export type YanYiPiece = YanYiPoint & { id: string; origin: YanYiFaction | "han"; owner: YanYiFaction | null; role: YanYiRole; inactive?: boolean };
export type YanYiOptions = { checkLimit: 6 | 9; balanceHan: boolean };
export type YanYiEvent = { number: number; actor: YanYiFaction; text: string; from?: YanYiPoint; to?: YanYiPoint; pieceId?: string; capture?: YanYiRole };
export type YanYiState = {
  version: string; pieces: YanYiPiece[]; turn: YanYiFaction; defeated: YanYiFaction[];
  alliance: [YanYiFaction, YanYiFaction] | null; hanOwner: YanYiFaction | null;
  activationUsed: boolean; claims: Record<YanYiFaction, YanYiFaction>;
  opening: Record<YanYiFaction, boolean>; checks: Record<YanYiFaction, { target: YanYiFaction | null; count: number; positions?: string[] }>;
  winner: YanYiFaction | null; draw: boolean; options: YanYiOptions; ply: number; note: string; events: YanYiEvent[];
};
export const YAN_YI_NAMES: Record<YanYiFaction, string> = { blue: "Wei / Pengu Order", green: "Wu / Abster Tribe", red: "Shu / Retsba Legion" };
export const YAN_YI_COLORS = { blue: "#58bfff", green: "#55e5a3", red: "#ff807b", han: "#efc879" };
export const YAN_YI_ROLE_NAMES: Record<YanYiRole, string> = { king: "King", advisor: "Shield Guard (Advisor)", elephant: "Royal Mammoth (Elephant)", horse: "Ice Unicorn (Horse)", chariot: "War Chariot", cannon: "Frost Cannon", soldier: "Penguin Spearman (Soldier)", emperor: "Han Emperor" };
export const YAN_YI_ROLE_SHORT: Record<YanYiRole, string> = { king: "King", advisor: "Advisor", elephant: "Elephant", horse: "Horse", chariot: "Chariot", cannon: "Cannon", soldier: "Soldier", emperor: "Emperor" };
export const YAN_YI_ALLIANCE_POINTS: { faction: YanYiFaction; point: YanYiPoint }[] = [
  { faction: "red", point: { x: 0, y: 7 } }, { faction: "green", point: { x: 1, y: 8 } }, { faction: "blue", point: { x: 0, y: 9 } },
];
export const sameYanYiPoint = (a: YanYiPoint, b: YanYiPoint) => a.x === b.x && a.y === b.y;
export const yanYiPointKey = (p: YanYiPoint) => `${p.x},${p.y}`;
export const inYanYiBoard = (p: YanYiPoint) => Number.isInteger(p.x) && Number.isInteger(p.y) && p.x >= 0 && p.x <= 16 && p.y >= 0 && p.y <= 16 && ((p.x >= 4 && p.x <= 12) || (p.y >= 4 && p.y <= 12));
const inCross = (x: number, y: number) => x >= 0 && x <= 16 && y >= 0 && y <= 16 && ((x >= 4 && x <= 12) || (y >= 4 && y <= 12));
export const YAN_YI_POINTS: YanYiPoint[] = Array.from({ length: 289 }, (_, i) => ({ x: i % 17, y: Math.floor(i / 17) })).filter(inYanYiBoard);
export const yanYiPieceAt = (state: Pick<YanYiState, "pieces">, p: YanYiPoint) => state.pieces.find(piece => sameYanYiPoint(piece, p));
export const yanYiAllied = (state: Pick<YanYiState, "alliance">, a: YanYiFaction | null, b: YanYiFaction | null) => Boolean(a && b && (a === b || state.alliance?.includes(a) && state.alliance.includes(b)));
export function yanYiLocalPoint(faction: YanYiFaction | "han", file: number, depth: number): YanYiPoint {
  if (faction === "blue") return { x: file + 4, y: depth };
  if (faction === "red") return { x: 12 - file, y: 16 - depth };
  if (faction === "green") return { x: 16 - depth, y: file + 4 };
  return { x: depth, y: 12 - file };
}
const homeDepth = (faction: YanYiFaction, p: YanYiPoint) => faction === "blue" ? p.y : faction === "red" ? 16 - p.y : 16 - p.x;
export const yanYiFile = (faction: YanYiFaction, p: YanYiPoint) => faction === "blue" ? 17 - p.x : faction === "red" ? p.x + 1 : 17 - p.y;
export const yanYiCoordinate = (faction: YanYiFaction, p: YanYiPoint) => `file ${yanYiFile(faction, p)} / depth ${homeDepth(faction, p) + 1}`;
const palacePoints = (faction: YanYiFaction) => [0, 1, 2].flatMap(depth => [3, 4, 5].map(file => yanYiLocalPoint(faction, file, depth)));
export const yanYiAdvisorPoints = (faction: YanYiFaction) => [[3, 0], [5, 0], [4, 1], [3, 2], [5, 2]].map(([file, depth]) => yanYiLocalPoint(faction, file, depth));
export const yanYiElephantPoints = (faction: YanYiFaction | "han") => [[2, 0], [6, 0], [0, 2], [4, 2], [8, 2], [2, 4], [6, 4]].map(([file, depth]) => yanYiLocalPoint(faction, file, depth));
const inPoints = (point: YanYiPoint, points: YanYiPoint[]) => points.some(p => sameYanYiPoint(p, point));
const directions = [[1, 0], [-1, 0], [0, 1], [0, -1]];

export function createYanYiState(options: Partial<YanYiOptions> = {}): YanYiState {
  const pieces: YanYiPiece[] = [];
  for (const faction of YAN_YI_FACTIONS) {
    const add = (role: YanYiRole, file: number, depth: number) => pieces.push({ id: `${faction}-${role}-${file}`, origin: faction, owner: faction, role, ...yanYiLocalPoint(faction, file, depth) });
    (["chariot", "horse", "elephant", "advisor", "king", "advisor", "elephant", "horse", "chariot"] as YanYiRole[]).forEach((role, file) => add(role, file, 0));
    add("cannon", 1, 2); add("cannon", 7, 2);
    [0, 2, 4, 6, 8].forEach(file => add("soldier", file, 3));
  }
  [6, 8, 10].forEach(y => pieces.push({ id: `han-chariot-${y}`, origin: "han", owner: null, role: "chariot", x: 3, y }));
  pieces.push({ id: "han-cannon", origin: "han", owner: null, role: "cannon", x: 2, y: 8 }, { id: "han-emperor", origin: "han", owner: null, role: "emperor", x: 0, y: 8 });
  return {
    version: YAN_YI_VERSION, pieces, turn: "green", defeated: [], alliance: null, hanOwner: null, activationUsed: false,
    claims: { blue: "blue", green: "green", red: "red" }, opening: { blue: false, green: false, red: false },
    checks: { blue: { target: null, count: 0 }, green: { target: null, count: 0 }, red: { target: null, count: 0 } },
    winner: null, draw: false, options: { checkLimit: options.checkLimit === 9 ? 9 : 6, balanceHan: options.balanceHan ?? false }, ply: 0,
    note: "Wu opens. Normal order: Wu → Wei → Shu. A single checked king answers immediately.", events: [],
  };
}
function canLand(state: YanYiState, piece: YanYiPiece, point: YanYiPoint) {
  if (!inYanYiBoard(point)) return false;
  const victim = yanYiPieceAt(state, point);
  if (!victim) return true;
  if (victim.inactive) return true;
  if (victim.origin === "han" && victim.owner === null) return victim.role === "emperor" && piece.role === "horse" && !state.activationUsed;
  return !yanYiAllied(state, piece.owner, victim.owner);
}
/** Horse legs are NOT blocked by pieces; the complete straight + diagonal route must stay on the cross. */
export function yanYiHorseRoute(from: YanYiPoint, to: YanYiPoint) {
  const dx = to.x - from.x, dy = to.y - from.y;
  if (!((Math.abs(dx) === 2 && Math.abs(dy) === 1) || (Math.abs(dx) === 1 && Math.abs(dy) === 2))) return false;
  const leg = { x: from.x + (Math.abs(dx) === 2 ? Math.sign(dx) : 0), y: from.y + (Math.abs(dy) === 2 ? Math.sign(dy) : 0) };
  return inYanYiBoard(to) && inYanYiBoard(leg) && [0.25, 0.5, 0.75].every(t => inCross(leg.x + (to.x - leg.x) * t, leg.y + (to.y - leg.y) * t));
}
export function pseudoYanYiTargets(state: YanYiState, piece: YanYiPiece): YanYiPoint[] {
  if (!piece.owner || piece.inactive || piece.role === "emperor") return [];
  const targets: YanYiPoint[] = [];
  const add = (p: YanYiPoint) => { if (canLand(state, piece, p)) targets.push(p); };
  if (piece.role === "chariot" || piece.role === "cannon") {
    for (const [dx, dy] of directions) {
      let screen = false;
      for (let distance = 1; distance <= 16; distance++) {
        const p = { x: piece.x + dx * distance, y: piece.y + dy * distance };
        if (!inYanYiBoard(p)) break;
        const victim = yanYiPieceAt(state, p);
        if (piece.role === "chariot") { add(p); if (victim) break; }
        else if (!screen) { if (victim) screen = true; else add(p); }
        else if (victim) { add(p); break; }
      }
    }
    // The video specifically restricts the first FULL round to the soldier defensive line.
    return piece.role === "cannon" && !state.opening[piece.owner] && state.ply < 3 ? targets.filter(p => homeDepth(piece.owner!, p) <= 3) : targets;
  }
  if (piece.role === "horse") {
    for (const [dx, dy] of [[2, 1], [2, -1], [-2, 1], [-2, -1], [1, 2], [1, -2], [-1, 2], [-1, -2]]) {
      const p = { x: piece.x + dx, y: piece.y + dy }; if (yanYiHorseRoute(piece, p)) add(p);
    }
  } else if (piece.role === "king") {
    for (const [dx, dy] of directions) { const p = { x: piece.x + dx, y: piece.y + dy }; if (inPoints(p, palacePoints(piece.owner))) add(p); }
  } else if (piece.role === "advisor") {
    const camps = YAN_YI_FACTIONS.filter(f => state.claims[f] === piece.owner);
    const points = camps.flatMap(yanYiAdvisorPoints);
    for (const dx of [-1, 1]) for (const dy of [-1, 1]) { const p = { x: piece.x + dx, y: piece.y + dy }; if (inPoints(p, points)) add(p); }
    // One inherited Advisor transfers per move, to an EMPTY legal point of the receiving king's palace.
    if (piece.origin !== piece.owner) for (const p of yanYiAdvisorPoints(piece.owner)) if (!sameYanYiPoint(piece, p) && !yanYiPieceAt(state, p) && !inPoints(p, targets)) targets.push(p);
  } else if (piece.role === "elephant") {
    const camps: (YanYiFaction | "han")[] = YAN_YI_FACTIONS.filter(f => state.claims[f] === piece.owner);
    if (state.hanOwner === piece.owner) camps.push("han");
    const points = camps.flatMap(yanYiElephantPoints);
    for (const dx of [-2, 2]) for (const dy of [-2, 2]) {
      const p = { x: piece.x + dx, y: piece.y + dy };
      if (inPoints(p, points) && inYanYiBoard({ x: piece.x + dx / 2, y: piece.y + dy / 2 })) add(p);
    }
  } else if (piece.role === "soldier") {
    const depth = homeDepth(piece.owner, piece);
    for (const [dx, dy] of directions) {
      const p = { x: piece.x + dx, y: piece.y + dy }, destinationDepth = homeDepth(piece.owner, p);
      if (depth <= 4 ? destinationDepth >= depth : destinationDepth >= 4) add(p);
    }
  }
  return targets;
}
function activateHan(state: YanYiState, owner: YanYiFaction, alliance: [YanYiFaction, YanYiFaction] | null) {
  return { ...state, activationUsed: true, hanOwner: owner, alliance, pieces: state.pieces.filter(p => p.role !== "emperor").map(p => p.origin === "han" && p.owner === null ? { ...p, owner } : p) };
}
function simulateYanYiMove(state: YanYiState, piece: YanYiPiece, to: YanYiPoint): YanYiState {
  const victim = yanYiPieceAt(state, to);
  // Occupied destinations can be full piece objects from the UI. Move only the
  // coordinates; never replace the attacker's identity, role or controller.
  let next: YanYiState = { ...state, pieces: state.pieces.filter(p => !victim || p.id !== victim.id).map(p => p.id === piece.id ? { ...p, x: to.x, y: to.y } : p) };
  if (piece.role === "horse" && !state.activationUsed) {
    const survivors = YAN_YI_FACTIONS.filter(f => !state.defeated.includes(f));
    if (victim?.role === "emperor") {
      const opponents = survivors.filter(f => f !== piece.owner);
      next = activateHan(next, piece.owner!, opponents.length === 2 ? opponents as [YanYiFaction, YanYiFaction] : null);
    } else {
      const point = YAN_YI_ALLIANCE_POINTS.find(p => sameYanYiPoint(p.point, to));
      if (point && point.faction !== piece.owner && survivors.length === 3) next = activateHan(next, survivors.find(f => f !== piece.owner && f !== point.faction)!, [piece.owner!, point.faction]);
    }
  }
  return next;
}
export function yanYiIsInCheck(state: YanYiState, faction: YanYiFaction) {
  if (state.defeated.includes(faction)) return false;
  const king = state.pieces.find(p => p.role === "king" && p.owner === faction && !p.inactive);
  return Boolean(king && state.pieces.some(p => p.owner && !p.inactive && !yanYiAllied(state, faction, p.owner) && pseudoYanYiTargets(state, p).some(to => sameYanYiPoint(to, king))));
}
export function legalYanYiTargets(state: YanYiState, piece: YanYiPiece) {
  if (!piece.owner || piece.inactive || state.winner || state.draw || state.defeated.includes(piece.owner)) return [];
  return pseudoYanYiTargets(state, piece).filter(to => {
    const victim = yanYiPieceAt(state, to);
    if (victim?.role === "king" && !victim.inactive) return false;
    const next = simulateYanYiMove(state, piece, to);
    const protectedFactions = YAN_YI_FACTIONS.filter(f => yanYiAllied(next, piece.owner, f) && !next.defeated.includes(f));
    return protectedFactions.every(f => !yanYiIsInCheck(next, f));
  });
}
export const yanYiHasMove = (state: YanYiState, faction: YanYiFaction) => state.pieces.some(p => p.owner === faction && !p.inactive && legalYanYiTargets(state, p).length > 0);
export const yanYiPositionKey = (state: YanYiState) => `${state.alliance?.join("+") || "none"}:${state.hanOwner || "none"}:` + state.pieces.map(p => `${p.id}:${p.owner}:${p.x},${p.y}:${p.inactive ? 1 : 0}`).sort().join(";");
export function nextYanYiFaction(current: YanYiFaction, defeated: YanYiFaction[]) {
  for (let n = 1; n <= 3; n++) { const f = YAN_YI_FACTIONS[(YAN_YI_FACTIONS.indexOf(current) + n) % 3]; if (!defeated.includes(f)) return f; }
  return current;
}
function checkingOwners(state: YanYiState, faction: YanYiFaction) {
  const king = state.pieces.find(p => p.role === "king" && p.owner === faction && !p.inactive);
  return king ? YAN_YI_FACTIONS.filter(owner => !yanYiAllied(state, owner, faction) && state.pieces.some(p => p.owner === owner && !p.inactive && pseudoYanYiTargets(state, p).some(to => sameYanYiPoint(to, king)))) : [];
}
function annex(state: YanYiState, loser: YanYiFaction, victor: YanYiFaction): YanYiState {
  const defeated = [...new Set([...state.defeated, loser])];
  const survivors = YAN_YI_FACTIONS.filter(f => !defeated.includes(f));
  let next: YanYiState = {
    ...state, defeated, alliance: state.alliance && survivors.length === 3 ? state.alliance : null,
    hanOwner: state.hanOwner === loser ? victor : state.hanOwner,
    claims: Object.fromEntries(YAN_YI_FACTIONS.map(f => [f, state.claims[f] === loser ? victor : state.claims[f]])) as YanYiState["claims"],
    pieces: state.pieces.filter(p => !(p.owner === loser && p.role === "king")).map(p => p.owner === loser && !p.inactive ? { ...p, owner: victor } : p),
    winner: survivors.length === 1 ? survivors[0] : null,
  };
  if (state.options.balanceHan && !state.activationUsed && survivors.length === 2) next = activateHan(next, survivors.find(f => f !== victor)!, null);
  return next;
}
function finishTurn(state: YanYiState, actor: YanYiFaction, messages: string[]): YanYiState {
  let next = state;
  // Remove a mated king immediately; credit the direct checker, preferring the mover when it also checks.
  for (let iteration = 0; iteration < 3; iteration++) {
    const loser = YAN_YI_FACTIONS.find(f => !next.defeated.includes(f) && yanYiIsInCheck(next, f) && !yanYiHasMove(next, f));
    if (!loser) break;
    const checkers = checkingOwners(next, loser), victor = checkers.includes(actor) ? actor : checkers[0];
    if (!victor) break;
    next = annex(next, loser, victor); messages.push(`${YAN_YI_NAMES[victor]} checkmates ${YAN_YI_NAMES[loser]} and inherits its surviving army.`);
    if (next.winner) break;
  }
  if (next.winner) return { ...next, note: `${messages.join(" ")} ${YAN_YI_NAMES[next.winner]} unifies the kingdoms.` };
  const checked = YAN_YI_FACTIONS.filter(f => !next.defeated.includes(f) && yanYiIsInCheck(next, f));
  let turn = checked.length === 1 ? checked[0] : nextYanYiFaction(actor, next.defeated);
  // The tutorial does not adjudicate stalemate. Use the original patent's pass rule, disclosed in the manual.
  let skipped = 0;
  while (!yanYiHasMove(next, turn) && !yanYiIsInCheck(next, turn) && skipped < 3) { messages.push(`${YAN_YI_NAMES[turn]} has no legal move and passes.`); turn = nextYanYiFaction(turn, next.defeated); skipped++; }
  const noOffense = !next.pieces.some(p => p.owner && !p.inactive && ["horse", "chariot", "cannon", "soldier"].includes(p.role));
  const draw = skipped >= 3 || noOffense;
  return { ...next, turn, draw, note: `${messages.join(" ")} ${draw ? "Draw: no remaining mating force or legal continuation." : `${YAN_YI_NAMES[turn]} to move${checked.includes(turn) ? "; answer check immediately" : ""}.`}` };
}
export function applyYanYiMove(state: YanYiState, pieceId: string, to: YanYiPoint): YanYiState | null {
  const piece = state.pieces.find(p => p.id === pieceId);
  if (!piece || piece.owner !== state.turn || !legalYanYiTargets(state, piece).some(p => sameYanYiPoint(p, to))) return null;
  const victim = yanYiPieceAt(state, to), actor = state.turn;
  let next = simulateYanYiMove(state, piece, to);
  next = { ...next, ply: state.ply + 1, opening: { ...state.opening, [actor]: true }, checks: { ...state.checks } };
  const transfer = piece.role === "advisor" && Math.max(Math.abs(to.x - piece.x), Math.abs(to.y - piece.y)) > 1;
  const messages = [`${YAN_YI_NAMES[actor]}: ${transfer ? "palace transfer" : YAN_YI_ROLE_SHORT[piece.role]} ${yanYiCoordinate(actor, piece)} → ${yanYiCoordinate(actor, to)}${victim ? `; captures ${YAN_YI_ROLE_SHORT[victim.role]}` : ""}.`];
  if (!state.activationUsed && next.activationUsed) messages.push(victim?.role === "emperor" ? `${YAN_YI_NAMES[actor]} takes Han. The other surviving kingdoms unite.` : `${next.alliance!.map(f => YAN_YI_NAMES[f]).join(" + ")} form an irreversible alliance. Han joins ${YAN_YI_NAMES[next.hanOwner!]}.`);
  const previous = YAN_YI_FACTIONS[(YAN_YI_FACTIONS.indexOf(actor) + 2) % 3];
  const checkingPrevious = !next.defeated.includes(previous) && yanYiIsInCheck(next, previous) && checkingOwners(next, previous).includes(actor);
  const prior = state.checks[actor], positionKey = yanYiPositionKey(next);
  const continuous = checkingPrevious && prior.target === previous && !victim;
  const positions = checkingPrevious ? [...(continuous ? prior.positions ?? [] : []), positionKey].slice(-40) : [];
  // Count repetition of a checking cycle, never a progressing series of distinct positions or captures.
  const count = checkingPrevious ? continuous && prior.positions?.includes(positionKey) ? prior.count + 1 : 1 : 0;
  next.checks[actor] = { target: checkingPrevious ? previous : null, count, positions };
  if (count > state.options.checkLimit && yanYiHasMove(next, previous)) { next = annex(next, actor, previous); messages.push(`Perpetual check: ${YAN_YI_NAMES[actor]} continued after the ${state.options.checkLimit}-check limit and forfeits its army to ${YAN_YI_NAMES[previous]}.`); }
  else if (count === state.options.checkLimit) messages.push(`Perpetual-check warning: change on your next move or forfeit to ${YAN_YI_NAMES[previous]}.`);
  next = finishTurn(next, actor, messages);
  const event: YanYiEvent = { number: next.ply, actor, text: next.note, from: { x: piece.x, y: piece.y }, to: { x: to.x, y: to.y }, pieceId, ...(victim ? { capture: victim.role } : {}) };
  return { ...next, events: [...state.events, event].slice(-2000) };
}
export function resignYanYi(state: YanYiState, faction: YanYiFaction): YanYiState | null {
  if (state.winner || state.draw || state.defeated.includes(faction)) return null;
  const defeated = [...state.defeated, faction], survivors = YAN_YI_FACTIONS.filter(f => !defeated.includes(f));
  const next: YanYiState = {
    ...state, defeated, alliance: null, winner: survivors.length === 1 ? survivors[0] : null,
    pieces: state.pieces.map(p => p.owner === faction ? { ...p, inactive: true } : p),
    hanOwner: state.hanOwner === faction ? null : state.hanOwner,
    turn: state.turn === faction ? nextYanYiFaction(faction, defeated) : state.turn,
    note: `${YAN_YI_NAMES[faction]} resigns. Its face-down king and surviving army remain as capturable, inactive obstacles.`,
  };
  const resolved = finishTurn(next, state.turn === faction ? faction : YAN_YI_FACTIONS[(YAN_YI_FACTIONS.indexOf(state.turn) + 2) % 3], [next.note]);
  return { ...resolved, events: [...state.events, { number: state.ply, actor: faction, text: resolved.note }].slice(-2000) };
}
export function agreeYanYiDraw(state: YanYiState, approvals: YanYiFaction[]): YanYiState | null {
  if (state.winner || state.draw || YAN_YI_FACTIONS.some(f => !state.defeated.includes(f) && !approvals.includes(f))) return null;
  return { ...state, draw: true, note: "All surviving kingdoms agree to a draw. Previously defeated kingdoms have lost." };
}
export function yanYiLegalActions(state: YanYiState) {
  return state.pieces.filter(p => p.owner === state.turn && !p.inactive).flatMap(p => legalYanYiTargets(state, p).map(to => ({ pieceId: p.id, to })));
}
const values: Record<YanYiRole, number> = { king: 0, emperor: 2800, chariot: 900, cannon: 450, horse: 420, elephant: 180, advisor: 180, soldier: 130 };
export function chooseYanYiBotMove(state: YanYiState, difficulty = "medium", random = Math.random) {
  const actions = yanYiLegalActions(state);
  if (!actions.length) return null;
  if (difficulty === "easy") return actions[Math.floor(random() * actions.length)];
  const actor = state.turn;
  let best = actions[0], bestScore = -Infinity;
  for (const action of actions) {
    const piece = state.pieces.find(p => p.id === action.pieceId)!, victim = yanYiPieceAt(state, action.to);
    const next = simulateYanYiMove(state, piece, action.to);
    let score = victim ? values[victim.role] : 0;
    if (!state.activationUsed && next.activationUsed) {
      const myArmy = next.pieces.filter(p => p.owner === actor).reduce((n, p) => n + values[p.role], 0);
      const enemy = next.pieces.filter(p => p.owner && !yanYiAllied(next, actor, p.owner)).reduce((n, p) => n + values[p.role], 0);
      score += next.hanOwner === actor ? 800 : myArmy - enemy > 0 ? 100 : -400;
    }
    const enemies = next.pieces.filter(p => p.owner && !p.inactive && !yanYiAllied(next, actor, p.owner));
    if (enemies.some(p => pseudoYanYiTargets(next, p).some(to => sameYanYiPoint(to, action.to)))) score -= values[piece.role] * 0.82;
    if (YAN_YI_FACTIONS.some(f => f !== actor && yanYiIsInCheck(next, f))) score += 95;
    const depthGain = homeDepth(actor, action.to) - homeDepth(actor, piece);
    score += piece.role === "soldier" ? depthGain * 12 : piece.role === "horse" ? depthGain * 4 : 0;
    score += random() * 12;
    if (score > bestScore) { best = action; bestScore = score; }
  }
  return best;
}
export function validYanYiSave(value: unknown): value is YanYiState {
  if (!value || typeof value !== "object") return false;
  const s = value as YanYiState;
  if (s.version !== YAN_YI_VERSION || !YAN_YI_FACTIONS.includes(s.turn) || !Array.isArray(s.pieces) || s.pieces.length > 53 || !Array.isArray(s.defeated) || !Array.isArray(s.events) || !s.opening || !s.claims || !s.checks || !s.options) return false;
  return s.pieces.every(p => inYanYiBoard(p) && p.id && p.role in YAN_YI_ROLE_NAMES && (p.owner === null || YAN_YI_FACTIONS.includes(p.owner)) && ([...YAN_YI_FACTIONS, "han"] as string[]).includes(p.origin)) && new Set(s.pieces.map(yanYiPointKey)).size === s.pieces.length;
}
