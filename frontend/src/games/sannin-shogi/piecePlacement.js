import { HEX_CELL_BY_ID } from './hex.js';
export const PLACEMENT_KEY = 'arctic-sannin-wood-placement-v1';
export function sanitisePlacement(value) {
  const result = {};
  if (!value || typeof value !== 'object' || Array.isArray(value)) return result;
  for (const [id,point] of Object.entries(value)) {
    if (HEX_CELL_BY_ID[id] && point && Number.isFinite(point.x) && Number.isFinite(point.y) && Math.abs(point.x)<=120 && Math.abs(point.y)<=120) result[id]={x:point.x,y:point.y};
  }
  return result;
}
export function readPiecePlacement() {
  try { return sanitisePlacement(JSON.parse(localStorage.getItem(PLACEMENT_KEY)||'{}')); } catch { return {}; }
}
const round = value => Math.round(value*10000)/10000;
export function placementCss(map) {
  const valid=sanitisePlacement(map);
  return `/* Sannin Shogi wooden-piece placement. Hex grid stays fixed. */\n.sannin-square { --sannin-piece-x: 0px; --sannin-piece-y: 0px; }\n` + Object.entries(valid).sort(([a],[b])=>a.localeCompare(b)).map(([id,p])=>`.sannin-square[data-cell="${id}"] { --sannin-piece-x: ${round(p.x)}px; --sannin-piece-y: ${round(p.y)}px; }`).join('\n');
}
export function shiftPlacement(map, ids, dx, dy) {
  const next={...map};
  for(const id of ids) {
    const current=next[id]||{x:0,y:0};
    next[id]={x:Math.max(-120,Math.min(120,round(current.x+dx))),y:Math.max(-120,Math.min(120,round(current.y+dy)))};
  }
  return next;
}
