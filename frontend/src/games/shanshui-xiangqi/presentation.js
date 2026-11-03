import { ARMY_META, ROLE_LABELS, ROLES, ARMIES, teamOf } from './rules.js';
export const ASSET_ROOT = '/assets/games/shanshui-xiangqi';
export const YAN_YI_ROOT = '/assets/heritage-arcade/sanguo-yan-yi/pieces';
export const BOARD_SIZE = 1536, GRID_START = 120, GRID_STEP = 108, PIECE_SIZE = 102;
export const pixelPoint = p => ({ x: GRID_START + p.col * GRID_STEP, y: GRID_START + p.row * GRID_STEP });
export const POINTS = Array.from({ length: 169 }, (_, i) => ({ row: Math.floor(i / 13), col: i % 13 }));
export const capital = text => text[0].toUpperCase() + text.slice(1);
export function spriteFor(piece, { root = ASSET_ROOT, yanYiRoot = YAN_YI_ROOT } = {}) {
  const role = piece.role.endsWith('soldier') ? 'soldier' : piece.role;
  return piece.army === 'purple' ? `${root}/pieces/purple-${role}.webp` : `${yanYiRoot}/${piece.army}-${role}.webp`;
}
export const teamLabel = team => team === 'white' ? 'Red + Purple' : 'Blue + Green';
export const MODES = Object.freeze([
  { id: 'bot', title: 'Quick play (vs bot)', detail: 'You command two allied armies.' },
  { id: 'local', title: 'Two players', detail: 'Two people. Two armies each.' },
  { id: 'four', title: 'Four-player 2v2', detail: 'One army each · Antarctic adaptation.' },
]);
export const ROLE_HELP = Object.freeze({
  king: 'One orthogonal step inside your palace. Along a clear row or column, capture an enemy General and return in one action.',
  advisor: 'One diagonal step along the four-point diamond inside your corner palace.',
  elephant: 'Two diagonal steps with an empty midpoint. You may reach the river centre or mountain summit, but never cross either.',
  horse: 'Two steps along one axis and one along the other. An occupied first orthogonal step blocks that direction.',
  chariot: 'Any clear horizontal or vertical distance. Capture the first enemy; allies block the line.',
  cannon: 'Move along a clear horizontal or vertical line. To capture, exactly one piece of any army must stand between you and the enemy.',
  'mountain-soldier': 'One step towards the mountain. After reaching the opposite foot, also one sideways. Never retreat or enter the river centre.',
  'river-soldier': 'One step towards the river. After reaching the opposite bank, also one sideways. Never retreat or enter the mountain summit.',
});
export const CHAPTERS = Object.freeze([
  { title: 'Four armies. Two teams.', paragraphs: ['Red + Purple are allies. Blue + Green are allies. Two-player mode gives you both allied armies; four-player 2v2 gives each person one army.', 'The 169 intersections hold four corner palaces. Each army starts with 17 pieces. Win by defeating both opposing armies.'] },
  { title: 'Follow the army order', paragraphs: ['Red opens, then Blue, Purple and Green. Move one piece from the scheduled army. Even if you control two armies, you cannot choose which one moves.', 'Eliminated slots are skipped. The board view stays fixed; the active army is highlighted. No dice, promotion, drops or army inheritance.'] },
  { title: 'Mountains and rivers', paragraphs: ['Mountain infantry crosses the mountain. River infantry crosses the river. Each starts with a different forward direction, so select a piece to reveal its arrow.', 'Move one forward. On reaching the opposite foot or bank, also move one sideways. Never retreat. Mountain infantry cannot enter the river centre; river infantry cannot enter the mountain summit. The central crossing has both terrain tags.'] },
  { title: 'Learn each piece', paragraphs: ROLES.map(role => `${ROLE_LABELS[role]}: ${ROLE_HELP[role]}`) },
  { title: 'Capture an army', paragraphs: ['An army whose ally remains is defeated by actual General capture. It may leave its General under attack; this is a warning rather than enforced check.', 'Capture that General and every piece of that colour leaves the board. Its ally stays. A facing-General capture returns the acting General to its starting point within the same turn.'] },
  { title: 'The last ally', paragraphs: ['An army whose ally has fallen must keep its General safe. At its scheduled turn, checkmate or stalemate removes that army. Defeat both opposing armies to win as a team.', 'An army that still has its ally and has no geometric move must pass. Threefold repetition, 400 actions without capture or every surviving army passing consecutively draws.'] },
  { title: 'About this edition', paragraphs: ['Shanshui Xiangqi is a Chinese Xiangqi adaptation, explained by the publisher Qi Xing Shan Shui in its 2024 basic-rules video. Its exact inventor and invention date are unverified.', 'Antarctic v1 completes gaps explicitly: eliminated turns are skipped; lone-army check safety is applied independently to each team; terrain-centre boundaries define crossing; friendly captures are forbidden; facing-General capture works on rows and columns. The draw and resignation rules are digital decisions. Four-human 2v2 is a labelled adaptation.'] },
]);
export const QUICK_RULES = ['Command Red + Purple against Blue + Green.', 'Move in Red → Blue → Purple → Green order.', 'Mountain infantry crosses mountains; river infantry crosses rivers.', 'Capture a General to remove its army. A lone ally must also answer check.', 'Defeat both enemy armies to win together.'];
export const pieceLabel = p => `${capital(p.army)} ${ROLE_LABELS[p.role]} · ${teamLabel(teamOf(p.army))}`;
export const ARMY_OPTIONS = ARMIES.map(army => ({ army, label: capital(army), color: ARMY_META[army].color }));
