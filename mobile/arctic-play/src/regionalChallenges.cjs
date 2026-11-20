// Modern micro-puzzles built from documented Xiangqi and hon-shogi mechanics.
// They are NOT independent historical games or claims about a game's invention.
// These keys unlock only catalogue halls from the same documented game tradition.
const ORIGINS=Object.freeze({
  china:Object.freeze({country:'China',tradition:'Xiangqi family',label:'River Lantern Key',sourceGame:'xiangqi',halls:Object.freeze(['sanguo','sanyou','yanyi']),sources:Object.freeze(['https://www.wxf-xiangqi.org/images/wxf-rules/2018_World_XiangQi_Rules_English2018.pdf'])}),
  japan:Object.freeze({country:'Japan',tradition:'Shogi family',label:'Sunrise Lantern Key',sourceGame:'shogi',halls:Object.freeze(['sannin']),sources:Object.freeze(['https://www.shogi.or.jp/knowledge/shogi/','https://www.shogi.or.jp/knowledge/shogi/05.php'])})
});
const q=(id,region,title,question,choices,answer,explanation)=>Object.freeze({id,region,title,question,choices:Object.freeze(choices),answer,explanation,kind:'modern-rule-puzzle'});
const CHALLENGES=Object.freeze([
  q('china-cannon-screen','china','The Cannon Bridge','A Cannon is lined up with a rival piece. How many pieces must stand strictly between them for that capture to be legal?',['None','Exactly one','Exactly two'],1,'A Xiangqi Cannon captures by jumping exactly one intervening screen.'),
  q('china-chariot-route','china','The Open Chariot','Which route is a legal Chariot movement when its path is clear?',['Along a rank or file','One diagonal step only','Jumping over any friendly piece'],0,'A Chariot moves any clear distance horizontally or vertically.'),
  q('china-horse-leg','china','The Stopped Horse','What can prevent an otherwise correctly shaped Horse move?',['An enemy across the river','A piece on its first orthogonal leg','A vacant destination'],1,'A Horse is blocked by a piece immediately adjacent on its first orthogonal step.'),
  q('china-elephant-eye','china','The Elephant Eye','Why might a two-point diagonal Elephant move be illegal?',['It passes through an occupied midpoint','It captures an enemy on the destination','The target is on its home side'],0,'The midpoint (the Elephant eye) must be empty. Standard Xiangqi Elephants also cannot cross the river.'),
  q('china-river-soldier','china','Across the River','After crossing the river, which NEW direction may a Soldier also move one point?',['Backward','Sideways','Diagonally'],1,'A Soldier gains one-point sideways movement after crossing; it never moves backward.'),
  q('china-palace-advisor','china','The Palace Guard','An Advisor in Xiangqi moves…',['Any distance horizontally','One point diagonally within the palace','One point straight forward outside the palace'],1,'An Advisor moves one diagonal point and remains in its own palace.'),
  q('china-cannon-quiet','china','The Quiet Cannon','When NOT capturing, a Cannon moves…',['Only by jumping a screen','One diagonal point','Along an unobstructed rank or file'],2,'Without capturing, a Cannon moves like a Chariot on clear ranks or files.'),
  q('china-facing-generals','china','Two Palaces Face','Both Generals stand on the same file with no pieces between them. Is this a legal position?',['No, the Generals cannot face unobstructed','Yes, if neither has moved','Yes, the river protects them'],0,'The flying-General rule forbids an unobstructed direct facing.'),
  q('china-horse-check','china','Horse or Elephant?','Which piece makes a one-orthogonal-then-one-outward-diagonal move, subject to a blocked leg?',['Elephant','Horse','Advisor'],1,'The Horse uses the stepped L-shaped route; the Elephant moves two diagonal points.'),
  q('japan-unpromoted-drop','japan','A Second Sunrise','You capture an opponent’s promoted piece. If you later drop it, how does it enter the board?',['In its unpromoted form','Still promoted','As a King'],0,'Captured shogi pieces revert to their unpromoted type when held in hand and dropped.'),
  q('japan-pawn-file','japan','The Pawn File','Can you drop a Pawn onto a file already containing your own unpromoted Pawn?',['Yes, on any empty square','No, this violates nifu','Only if your King is in check'],1,'The nifu restriction forbids two unpromoted friendly Pawns on the same file.'),
  q('japan-knight-promotion','japan','The Last Two Ranks','Your Knight reaches one of the final two ranks. What must happen?',['It remains a Knight','It must be dropped instead','It must promote'],2,'A Knight must promote on those ranks because it would otherwise have no legal forward move.')
]);
const BY_ID=Object.freeze(Object.fromEntries(CHALLENGES.map(c=>[c.id,c])));
const getRegionForHall=id=>Object.keys(ORIGINS).find(region=>ORIGINS[region].halls.includes(id))||null;
const challengesFor=region=>CHALLENGES.filter(c=>c.region===region);
const solved=(id,choice)=>!!(BY_ID[id]&&Number.isInteger(choice)&&BY_ID[id].answer===choice);
module.exports={ORIGINS,CHALLENGES,BY_ID,getRegionForHall,challengesFor,solved};
