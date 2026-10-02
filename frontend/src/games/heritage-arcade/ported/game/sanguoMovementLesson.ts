import { ARCTIC_BOARD_GRAPH } from './sanguoArcticBoardGraph';
import { legalSanguoTargets, roleLabels, type SanguoRole, type SanguoPiece, type SanguoFaction } from './sanguoRules';
const roleMap = { general: 'king', advisor: 'guard', elephant: 'seer', horse: 'rider', chariot: 'icebreaker', cannon: 'cannon', soldier: 'scout', bannerman: 'runner' } as const;
export const ROLE_LABELS = Object.fromEntries(Object.entries(roleMap).map(([key, role]) => [key, roleLabels[role]]));
export const parseArmNode = (id: string) => { const m = /^(red|blue|green):L([1-9])-([1-5])$/.exec(id); return m ? { faction: m[1] as SanguoFaction, lane: +m[2], rank: +m[3] } : null; };
export const ALL_NODE_IDS = Object.keys(ARCTIC_BOARD_GRAPH.nodes).map(id => { const [team, rank, file] = id.split('-'); return `${team}:L${+file + 1}-${5 - +rank}`; });
export function getNodePoint(id: string) { const arm = parseArmNode(id); if (!arm) return null; const point = ARCTIC_BOARD_GRAPH.nodes[`${arm.faction}-${5-arm.rank}-${arm.lane-1}`]; return point ? [point.x, point.y] : null; }
export const getNodeLabel = (id: string) => id.replace(':', ' ').replace(/^(red|green|blue)/, team => team.toUpperCase());
export const territoryOf = (id: string, faction: string) => parseArmNode(id)?.faction === faction ? 'home' : 'enemy';
type LessonPiece = { id: string; role: keyof typeof roleMap; node: string; faction: SanguoFaction; owner: SanguoFaction };
export function nativePiece(p: LessonPiece): SanguoPiece { const arm = parseArmNode(p.node)!; return { id: p.id, role: roleMap[p.role] as SanguoRole, sector: p.faction, controller: p.owner, node: { sector: arm.faction, rank: 5-arm.rank, file: arm.lane-1 } }; }
export function getMovementTargets(state: { pieces: LessonPiece[] }, id: string) { const pieces = state.pieces.map(nativePiece); const piece = pieces.find(p => p.id === id); return piece ? legalSanguoTargets(piece, pieces).map(n => `${n.sector}:L${n.file+1}-${5-n.rank}`) : []; }
