/* Presentation only. Never use screen coordinates to determine move legality. */
import { arcticBoardNode } from "./sanguoArcticBoardGraph";
import { roleLabels, type SanguoFaction, type SanguoNode, type SanguoState } from "./sanguoRules";

export const BOARD_WIDTH = 1280;
export const BOARD_HEIGHT = 1124;
export const kingdomLabel = (faction: SanguoFaction) => faction[0].toUpperCase() + faction.slice(1);
export const coordinateLabel = (node: SanguoNode) => `${kingdomLabel(node.sector)} ${arcticBoardNode(node.sector, node.rank, node.file).coordinate}`;
export type Camera = { zoom: number; x: number; y: number };
export const FIT_CAMERA: Camera = { zoom: 1, x: 0, y: 0 };
export function clampCamera(camera: Camera): Camera {
  const zoom = Math.min(2.5, Math.max(1, camera.zoom));
  return { zoom, x: Math.max(0, Math.min(BOARD_WIDTH - BOARD_WIDTH / zoom, camera.x)), y: Math.max(0, Math.min(BOARD_HEIGHT - BOARD_HEIGHT / zoom, camera.y)) };
}
export function zoomCamera(camera: Camera, zoom: number, anchor = { x: camera.x + BOARD_WIDTH / camera.zoom / 2, y: camera.y + BOARD_HEIGHT / camera.zoom / 2 }): Camera {
  const nextZoom = Math.min(2.5, Math.max(1, zoom));
  return clampCamera({ zoom: nextZoom, x: anchor.x - (anchor.x - camera.x) * camera.zoom / nextZoom, y: anchor.y - (anchor.y - camera.y) * camera.zoom / nextZoom });
}
export function snapLegalTarget(point: { x: number; y: number }, targets: SanguoNode[]): SanguoNode | undefined {
  let distance = 28;
  let closest: SanguoNode | undefined;
  for (const target of targets) {
    const node = arcticBoardNode(target.sector, target.rank, target.file);
    const next = Math.hypot(point.x - node.x * BOARD_WIDTH, point.y - node.y * BOARD_HEIGHT);
    if (next <= distance) { distance = next; closest = target; }
  }
  return closest;
}

export type MatchEvent = { id: string; kind: "move" | "capture" | "transfer" | "resign"; text: string; detail?: string; faction: SanguoFaction; moveNumber: number; pieceIds: string[] };
type Checkpoint = { signature: string; state: SanguoState; events: MatchEvent[] };
export type MatchJournal = { session: string; checkpoints: Checkpoint[]; events: MatchEvent[]; partial: boolean };
const signature = (state: SanguoState) => JSON.stringify([state.pieces, state.turn, state.moveNumber, state.pending, state.winner, state.draw]);
const moveEvent = (state: SanguoState): MatchEvent | undefined => {
  const move = state.lastMove;
  if (!move) return;
  return { id: `move-${state.moveNumber}-${move.pieceId}`, kind: move.captured ? "capture" : "move", faction: move.controller, moveNumber: state.moveNumber - 1, pieceIds: [move.pieceId], text: `${kingdomLabel(move.controller)} · ${roleLabels[move.role]}${move.captured ? ` captures ${roleLabels[move.captured]}` : " moves"}`, detail: `${coordinateLabel(move.from)} → ${coordinateLabel(move.to)}` };
};

/** Journal of observed accepted positions, retained above the board across room/guide views.
 * Exact checkpoint rollback removes bot moves and transfers when local Undo rewinds.
 * On reconnect we only claim the latest move, not unseen server history.
 */
export function updateMatchJournal(journal: MatchJournal | null, state: SanguoState, session: string): MatchJournal {
  const key = signature(state);
  if (!journal || journal.session !== session) {
    const move = moveEvent(state);
    const events = move ? [move] : [];
    return { session, events, partial: state.moveNumber > 1, checkpoints: [{ signature: key, state, events }] };
  }
  const checkpoints = journal.checkpoints;
  const prior = checkpoints.at(-1)!;
  if (prior.signature === key) return journal;
  const rewind = checkpoints.findLastIndex(point => point.signature === key);
  if (rewind >= 0) return { ...journal, checkpoints: checkpoints.slice(0, rewind + 1), events: checkpoints[rewind].events };
  if (state.moveNumber < prior.state.moveNumber) return updateMatchJournal(null, state, session);
  const events = [...journal.events];
  const move = state.moveNumber > prior.state.moveNumber ? moveEvent(state) : undefined;
  if (move) events.push(move);
  const transfers = new Map<string, { from: SanguoFaction; to: SanguoFaction; ids: string[] }>();
  for (const piece of state.pieces) {
    const before = prior.state.pieces.find(p => p.id === piece.id);
    if (!piece.captured && before && !before.captured && before.controller !== piece.controller) {
      const groupKey = `${before.controller}-${piece.controller}`;
      const group = transfers.get(groupKey) || { from: before.controller, to: piece.controller, ids: [] };
      group.ids.push(piece.id); transfers.set(groupKey, group);
    }
  }
  for (const [group, transfer] of transfers) events.push({ id: `transfer-${state.moveNumber}-${group}`, kind: "transfer", faction: transfer.to, moveNumber: state.moveNumber - 1, pieceIds: transfer.ids, text: `${kingdomLabel(transfer.to)} now controls ${kingdomLabel(transfer.from)}’s ${transfer.ids.length} remaining pieces.`, detail: "Original artwork retained; the dashed outer ring identifies the new controller." });
  for (const defeated of state.defeated.filter(f => !prior.state.defeated.includes(f))) {
    if (prior.state.pending?.defeated === defeated || [...transfers.values()].some(t => t.from === defeated)) continue;
    events.push({ id: `resign-${state.moveNumber}-${defeated}`, kind: "resign", faction: defeated, moveNumber: state.moveNumber - 1, pieceIds: [], text: `${kingdomLabel(defeated)} resigned. Its army leaves the board.` });
  }
  const bounded = events.slice(-150);
  return { ...journal, events: bounded, partial: journal.partial || events.length > 150 || state.moveNumber > prior.state.moveNumber + 1, checkpoints: [...checkpoints, { signature: key, state, events: bounded }].slice(-160) };
}
