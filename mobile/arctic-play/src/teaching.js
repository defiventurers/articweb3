import {LESSONS} from './learning.js';

export const TURN_STEPS={
  shogi:['Choose a piece, or a captured piece in hand.','Tap one of its highlighted destinations.','Answer check and keep your King safe.'],
  sannin:['Choose a piece, a drop or an offered royal action.','Follow the highlights for your seat’s directions.','Keep your King safe; watch the Garden and alliances.'],
  sanguo:['Choose a piece you control.','Follow its legal route; land on an enemy to capture.','Keep your General safe. Defeated armies transfer automatically.'],
  sanyou:['Choose one controlled piece.','Follow the highlighted lines, gates and terrain.','Answer check immediately; keep your General safe.'],
  yanyi:['Choose an active piece you control.','Move to a highlighted point; allies are not targets.','Protect your King and any allied King. Watch Han activation.'],
  xiangqi:['Choose a piece from your army.','Move to a highlighted intersection.','Answer check; never leave the Generals facing on an empty file.'],
  dominion:['Roll your two dice.','Use either die to move a piece it activates.','Spend the other die if possible; protect your royal King.'],
};
const TERMS={
  check:['Check','Your royal piece is under attack. Your reply must make it safe.'],
  mate:['Checkmate','The royal piece is attacked and has no legal way to escape.'],
  drop:['Drop','Put a captured piece from your hand onto an empty legal spot. It uses your turn.'],
  screen:['Screen','The one piece a Cannon jumps over to make a capture.'],
  inherit:['Owner ring','The art shows the original army; the ring shows who controls an inherited piece.'],
  garden:['Pleasure Garden','The central destination for a safe, unallied Sannin King.'],
  terrain:['Terrain','Rivers, mountains and forts change which routes some pieces can use.'],
  han:['Han','The yellow imperial reserve. A Horse can trigger its activation.'],
  die:['One die, one move','Each rolled die permits one move by an activated piece.'],
  royal:['Royal King','Your original Frost King. Losing it eliminates your whole kingdom.'],
};
const keys={shogi:['check','mate','drop'],sannin:['drop','garden','check'],sanguo:['screen','check','inherit'],sanyou:['terrain','check','inherit'],yanyi:['han','screen','inherit'],xiangqi:['screen','check','mate'],dominion:['die','royal']};
export function quickRules(id){return {goal:LESSONS[id].goal,board:LESSONS[id].board,turn:LESSONS[id].turn,steps:TURN_STEPS[id],terms:keys[id].map(key=>TERMS[key])};}
export function searchChapters(chapters,query){const q=String(query||'').trim().toLocaleLowerCase();return q?chapters.filter(c=>[c.title,...c.paragraphs].join(' ').toLocaleLowerCase().includes(q)):chapters;}
export const GUIDE_TIPS={
  polly:['Start with one little move. You can replay it as often as you like.','A first try counts as exploring. There is no timer in our lessons.'],
  pengu:['Tap the glowing piece, then a blue dot. Orange rings are captures.','Forward follows the army you are learning. The highlights show its routes.'],
  retsba:['For a capture, your piece finishes on the enemy’s spot. Look for its orange ring.','Keep the royal goal close. A clever capture still has to follow this game’s rules.'],
  abster:['Curious about another setup? The free board lets you arrange, undo and try again.','A little replay can make a pattern clearer. Nothing is locked while you learn.'],
};
export const LESSON_CUES={
  shogi:['Tap the glowing Pawn, then a blue dot. One step forward.','Tap your Pawn, then the enemy’s orange ring.','Tap the captured Pawn in hand, then a blue dot. It joins your side.'],
  sannin:['Tap the glowing Pawn, then one of its forward blue dots.','Tap your Pawn, then the enemy’s orange ring.','Tap the Pawn in hand, then a blue dot. A captured helper returns!'],
  sanguo:['Tap the glowing Soldier, then its forward blue dot.','Tap your Soldier, then the enemy’s orange ring.','Tap the Cannon, then the enemy beyond one screen.'],
  sanyou:['Tap the glowing Soldier, then its forward blue dot.','Tap your Soldier, then the enemy’s orange ring.','Tap the Flag. Its blue dot is exactly two clear steps forward.'],
  yanyi:['Tap the glowing Soldier, then a blue dot. Try its own routes.','Tap your Soldier, then the enemy’s orange ring.','Tap Wu’s Horse, then the yellow Emperor. Let’s wake Han!'],
  xiangqi:['Tap the glowing Soldier, then its forward blue dot.','Tap your Soldier, then the enemy’s orange ring.','Tap the Cannon, then the enemy beyond one screen.'],
  dominion:['Practice die 1 wakes your Guard. Tap it, then a blue dot.','Your Guard captures diagonally forward. Choose the orange ring.','Practice die 3 wakes the Unicorn. Tap it, then an L-shaped blue dot.'],
};
