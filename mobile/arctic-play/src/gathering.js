// Fiction, presentation and personal progress. Never used by a game engine.
import {HALL_ART} from './celebration.js';
export const GATHERING_KEY='eternal-gathering.v1';
export const STORY_SETTINGS_KEY='gathering-settings.v1';
export const HALL_ORDER=['xiangqi','shogi','sannin','sanguo','sanyou','yanyi','dominion'];
export const WORLD={name:'The Eternal Gathering',home:'Lantern Harbor',mystery:'The Eighth Lantern',tagline:'Where remarkable games are celebrated.',
  invitation:'Seven remarkable games. Four penguin clans. A celebration with a seat for you.',
  premise:'Beneath the auroras of Antarctica, four penguin clans welcome remarkable games from distant cultures. Each arrival inspires a new ceremonial hall. They study its rules, honour its origins and celebrate the distinctive strategy around its table.',
  truth:'The Antarctic civilization is fictional. Shogi and Xiangqi are living traditions. The other tables include historical variants, a selected digital ruleset and a modern Chaturanga-inspired adaptation. These episodes are destinations, not a historical chronology.',
  quiet:'The hosts call an empty table “The Quiet”. Their answer is simple: make room for another guest. Every table celebrates a game and the people who enjoy it. This is the folklore of a fictional Antarctic festival.'};

export const OPENING=[
  {duration:4500,title:'At the farthest edge of the world…',text:'At the farthest edge of the world, beneath a sky that never stops dancing… There is a place no map has ever quite managed to find.'},
  {duration:5000,title:'A place for extraordinary games.',text:'A place where kings return, rival kingdoms become friends, and legends are celebrated beneath the stars.'},
  {duration:6500,title:'Every arrival brings a new story.',text:'For generations, its four penguin clans have welcomed games from distant lands. Some are centuries old. Some have rarely been seen. Some are being created here for the very first time.'},
  {duration:5000,title:'The celebration has continued.',text:'And through every Antarctic winter, the celebrations have continued. The world is only just discovering them.'},
  {duration:4000,title:'Welcome to Antarctic Gaming Co.',text:'Welcome to Antarctic Gaming Co. Where remarkable games are celebrated. We saved you a seat.'},
];

export const CAST={
  polly:{title:'The Heart',trait:'Adventurous and welcoming',arc:'Nova worries the Gathering might seem intimidating. She makes a first move feel like an invitation, and every newcomer feel included.',line:'Hey! We saved you a seat!'},
  retsba:{title:'The Rival',trait:'Competitive, friendly and fair',arc:'Rocco loves tactics and rematches. Learning to celebrate another player’s clever move is part of his own story.',line:'Okay, that move was impressive.'},
  pengu:{title:'The Keeper',trait:'Observant, calm and careful',arc:'Piko keeps names, origins and rules straight. He learns that protecting accuracy and welcoming discovery belong together.',line:'Every hall has a story worth knowing.'},
  abster:{title:'The Inventor',trait:'Curious and thoughtful',arc:'Ziggy makes playful displays and notices unusual patterns. He celebrates experiments and second tries as much as winning.',line:'Wait… I think I found something!'},
};

export const HALLS={
  xiangqi:{chapter:1,name:'The River Between Stars',place:'The River Gate',signature:'Two palaces. One river. A thousand possibilities.',question:'Some boundaries separate us. How can a game bring us to the same table?',
    scene:['An ice river divides two glowing palaces. Red and blue banners move beneath the aurora as lantern-bearing penguins gather beside the bridge. The River Gate looks impassable in the snow, until Piko invites you to look more closely.',
      'The river is not a puzzle to erase. It is a reminder that different pieces follow different rules. Rocco has arranged a Cannon, one intervening screen and a surprising capture. Make the move yourself, and your River Lantern will shine.'],
    architecture:'Two winter palaces, a luminous ice channel and bridges reflected in moon lanterns.',atmosphere:'Still water, distant bells and the anticipation before a brilliant capture.',
    hosts:['pengu','retsba'],dialogue:[['pengu','The river changes a Soldier’s choices. The Cannon has a different surprise.'],['retsba','One screen. Not zero. Not two. Ready to see it?'],['pengu','The rules lead the celebration. Watch the highlighted route.']],
    memory:'River Lantern',memoryLine:'Distance can be part of the strategy.',fact:'A Cannon captures across exactly one intervening piece. A Soldier gains sideways moves after crossing the river.',
    mechanics:'90 intersections, two palaces, a river, Generals, Advisors, Elephants, Horses, Chariots, Cannons and Soldiers. Blue artwork represents the customary Black side.',
    challenges:[{mission:'cannon-bridge',variant:'one',title:'Light the River Lantern'},{mission:'river-passport',variant:'across',title:'A Soldier crosses the river'},{mission:'palace-home',variant:'open',title:'Protect the palace'}],
    motif:{name:'River bells',notes:[293.66,440,587.33,659.25,587.33],wave:'sine'},clue:'Follow the reflected lantern toward the hall where a captured piece can return.',next:'shogi',
    evidence:'Living Chinese tradition. Movement reference: World Xiangqi Federation, World Xiangqi Rules (2018). This app’s edition excludes tournament perpetual-chase and repetition adjudication.',
    sources:[['World Xiangqi Federation · 2018 rules','https://www.wxf-xiangqi.org/images/wxf-rules/2018_World_XiangQi_Rules_English2018.pdf']]},
  shogi:{chapter:2,name:'The Hall of Second Sunrises',place:'The Second Sunrise Hall',signature:'Here, even a fallen piece may have another story to tell.',question:'Can something that leaves the board return with a new purpose?',
    scene:['Beyond the river stands a Japanese-inspired winter pavilion. Its red lanterns dim and then reappear on the other side of the hall. Nova insists the palace is simply very fond of second chances.',
      'Piko explains the real surprise: captured pieces can return under a new player’s command. Their next appearance follows the drop rules, not magic. On this arranged teaching board, a captured Pawn is waiting in your hand. Give it a legal place to begin again.'],
    architecture:'A snow-lit winter pavilion with indigo-red banners and returning piece silhouettes.',atmosphere:'A quiet wooden pulse, snowflakes and a rising phrase that finds its way home.',
    hosts:['polly','pengu'],dialogue:[['polly','I knew that little piece had another chapter!'],['pengu','A captured piece can return unpromoted. A drop uses your turn.'],['polly','A second chance still needs the right square. I like that.']],
    memory:'Second Sunrise',memoryLine:'A good idea may have another turn.',fact:'Captured pieces can be dropped back into play. Pawn-file, immobility and Pawn-drop-mate restrictions still apply.',
    mechanics:'Hon-shōgi, a 9 × 9 board, two armies, promotion, captured-piece drops and royal safety. A dropped piece returns unpromoted.',
    challenges:[{mission:'helper-drop',title:'Bring a piece back'},{mission:'golden-pawn',title:'Explore promotion'}],
    motif:{name:'Returning light',notes:[329.63,392,493.88,392,329.63],wave:'triangle'},clue:'Three paths beyond the pavilion lead toward a garden with a different kind of King.',next:'sannin',
    evidence:'Living Japanese tradition. Rules and forbidden-drop reference: Japan Shogi Association. The game uses this app’s documented Heritage Arcade edition.',
    sources:[['Japan Shogi Association · basic rules','https://www.shogi.or.jp/knowledge/shogi/'],['Japan Shogi Association · illegal moves','https://www.shogi.or.jp/knowledge/shogi/05.php']]},
  sannin:{chapter:3,name:'The Garden of Three Paths',place:'The Three-Path Garden',signature:'Two rivals make a contest. Three make a story nobody can predict.',question:'What changes when there are three minds at a table?',
    scene:['Three illuminated paths wind through the ice toward the central Pleasure Garden. Rocco arrived expecting one rival. Nova has invited another friend. Suddenly every decision has a third perspective.',
      'This is Kokusai Sannin Shogi: a 1930s Japanese variant, not ordinary two-player Shogi. Three armies meet on a 127-cell hexagonal board. Drops, promotion, alliances and special royal powers transform the experience. In this arranged scene, guide a safe, unallied King into the Garden according to the chosen rules.'],
    architecture:'Three entrances converge on an ice garden; the true hexagonal board remains visible.',atmosphere:'Three small phrases meeting in the centre, with room for an unexpected reply.',
    hosts:['pengu','polly'],dialogue:[['retsba','I prepared a plan for my rival.'],['polly','Which one? We brought two.'],['pengu','The Pleasure Garden has special royal and alliance rules. Let’s explore this edition carefully.']],
    memory:'Third Path',memoryLine:'Every extra guest changes the game.',fact:'In this edition, a safe unallied King can win by reaching the Pleasure Garden. An allied King cannot use that route.',
    mechanics:'127 hexagonal cells, three armies, drops, promotion, alliances and special Garden/royal powers. This app uses its specified Fairbairn–Kapitan-inspired digital edition.',
    challenges:[{mission:'garden-visit',title:'Find the Pleasure Garden'},{mission:'returning-helper',title:'A captured helper returns'}],
    motif:{name:'Three converging paths',notes:[261.63,329.63,392,523.25,392,329.63],wave:'sine'},clue:'Beyond the garden, three banners move even when the pieces keep their colours.',next:'sanguo',
    evidence:'A twentieth-century Japanese variant attributed to Tanigasaki Jisuke, circa 1930. The selected digital rules are specified in the bundled rulebook; the historical publication and edition differences need further archival verification.',
    sources:[['Sannin Shogi · background and bibliography','https://en.wikipedia.org/wiki/Sannin_shogi']]},
  sanguo:{chapter:4,name:'The Hall of Changing Banners',place:'The Hall of Changing Banners',signature:'Kingdoms change hands. The story continues.',question:'Who commands a kingdom after its leader is defeated?',
    scene:['Three ice citadels face one another beneath enormous banners. When a kingdom falls at the festival table, its surviving pieces do not simply vanish. Their command changes in this chosen digital ruleset.',
      'Ziggy notices the pieces still wear their original colours. Rocco points to the ring around each one: that shows who controls it now. The next chapter does not erase a piece’s appearance. Try an arranged inherited position and read the controller before choosing a move.'],
    architecture:'Three sector citadels joined around a shared centre, with banner light moving between towers.',atmosphere:'Three alternating low notes answered by a bright changing-banner chime.',
    hosts:['retsba','abster'],dialogue:[['abster','The banner changed. Why didn’t the piece change colour?'],['retsba','Because the next chapter doesn’t erase the first. Read the owner ring.'],['abster','Right—watch who commands, not just the colour I see.']],
    memory:'Changing Banner',memoryLine:'Watch who commands, not just the colour you see.',fact:'In this digital edition, a defeated kingdom’s surviving army transfers automatically, while artwork colours remain and owner rings show control.',
    mechanics:'Three Xiangqi-derived sectors, 135 intersections, three armies, palace and route rules, and the selected digital takeover behaviour.',
    challenges:[{mission:'owner-ring',title:'Read a changing banner'},{mission:'one-screen',variant:'one',title:'A Cannon in three kingdoms'}],
    motif:{name:'Banner exchange',notes:[220,293.66,349.23,440,293.66],wave:'triangle'},clue:'Look toward the mountain signals: a Flag and a spark of Fire are waiting.',next:'sanyou',
    evidence:'A historical Chinese Xiangqi variant. Historical descriptions differ on takeover timing and board continuations. The app implements its explicitly selected digital rules; precise early textual provenance remains unresolved.',
    sources:[['Sanguo Qi · historical bibliography','https://en.wikipedia.org/wiki/Game_of_the_Three_Kingdoms']]},
  sanyou:{chapter:5,name:'The Three Friends Observatory',place:'The Three Friends Observatory',signature:'Three friends. New rules. A world of unexpected moves.',question:'What happens when familiar strategy meets surprising pieces?',
    scene:['High in the mountains, three extraordinary paths lead into an observatory. Signals shaped like Fire and Flags illuminate the night. River, mountain and fort motifs trace the routes below the sky.',
      'Ziggy has found a hall where familiar chess instincts cannot explain everything. Piko agrees: the actual paths and rule markers matter. Fire advances on a forward diagonal; a Flag has its own changing possibilities. Curiosity, rather than guessing, opens this hall.'],
    architecture:'An angular three-way mountain observatory, with signal flags and terrain marks inspired by the actual board.',atmosphere:'A small bright spark, two measured Flag beats and a spacious observatory echo.',
    hosts:['abster','pengu'],dialogue:[['abster','A Fire! A Flag! I can’t explain this board with yesterday’s pattern.'],['pengu','That is a good reason to look more closely. Terrain restricts different pieces differently.'],['abster','Two clear steps for the Flag. I think I found something!']],
    memory:'Three Signals',memoryLine:'Curiosity notices what experience misses.',fact:'At home, a Flag needs exactly two clear forward steps. Fire moves one forward diagonal step and never retreats in this edition.',
    mechanics:'Three sides on the approved 156-intersection digital board, with Fire, Flags and river, mountain, Sea and fort restrictions. Historical variants must be distinguished from this chosen topology.',
    challenges:[{mission:'fire-spark',title:'Follow a spark of Fire'},{mission:'flag-path',variant:'clear',title:'Give the Flag two clear steps'},{mission:'terrain-lines',variant:'cannon',title:'Read the terrain'}],
    motif:{name:'Observatory signals',notes:[523.25,659.25,523.25,783.99,659.25],wave:'sine'},clue:'A yellow light below the mountains belongs to an Emperor, not a fourth guest team.',next:'yanyi',
    evidence:'Three Friends Chess is associated in historical accounts with Zheng Jinde and Qing-era China. Exact textual provenance and regional rule differences require further verification. The 156-point board and restrictions here are the app’s digital edition.',
    sources:[['Three Friends Chess · historical bibliography','https://en.wikipedia.org/wiki/Game_of_the_Three_Friends']]},
  yanyi:{chapter:6,name:'The Yellow Lantern Court',place:'The Yellow Lantern Court',signature:'Three kingdoms. One imperial light. Every decision has consequences.',question:'Can a single central figure change every plan?',
    scene:['At the centre of an illuminated cross-shaped battlefield stands the yellow Han Emperor. Three surrounding armies watch the silent fourth light. It cannot simply be claimed because it is beautiful: its activation has special rules.',
      'Rocco studies the alliances; Piko keeps the changing loyalties clear. The Emperor, three Han Chariots and Cannon retain their dignified yellow artwork when command changes. Make the Horse activation on the real teaching board, then explore who can capture whom after alliances form.'],
    architecture:'A yellow-gold ceremonial imperial pavilion within a landscape watched by three surrounding armies.',atmosphere:'A low suspended tone, a warm golden bell and an unresolved reply from three directions.',
    hosts:['retsba','pengu'],dialogue:[['retsba','Three armies, and everyone is watching that one light.'],['pengu','Han is a separate imperial force. A Horse capture is one activation route in our chosen rules.'],['retsba','After the change, read the owner rings—and protect the allied Kings.']],
    memory:'Imperial Lantern',memoryLine:'One decision can change every alliance.',fact:'A Horse can activate Han by capturing the Emperor. Han’s surviving fighters transfer control and the other two teams become allies.',
    mechanics:'225 intersections, three controlling armies and a separate yellow Han force, with the selected activation, takeover, alliance, palace and capture rules.',
    challenges:[{mission:'wake-han',title:'Awaken the Yellow Lantern Court'},{mission:'allied-colours',title:'Read the alliance after Han'}],
    motif:{name:'Imperial light',notes:[196,293.66,392,440,392],wave:'sine'},clue:'The four hosts have one more table to reveal. This time, they made the game themselves.',next:'dominion',
    evidence:'Three Kingdoms is the theme. This app’s selected free-play ruleset is not evidence that this particular game is ancient. The source-native Han roles and selected rules are documented in the bundled rulebook.',
    sources:[]},
  dominion:{chapter:7,name:'The Four Clans Arena',place:'The Four Clans Arena',signature:'Four clans. One frozen arena. A new tradition begins.',question:'What new tradition will the four Antarctic clans create together?',
    scene:['After celebrating games from distant cultures, the hosts reveal a table they have been making for their own Gathering. Four kingdoms assemble on an 8 × 8 ice battlefield: Frost Kings, Aurora Unicorns, War Mammoths, Icebreakers and Snow Guards.',
      'Nova welcomes the teams, Piko explains the fair rules, Rocco studies the opening and Ziggy brings the great arena lanterns to life. Two dice activate particular piece families. This is the festival’s modern Chaturanga-inspired creation. Traditions are inherited—and new ones can begin tonight.'],
    architecture:'A four-quadrant ice arena beneath a glowing ceremonial crown and the aurora.',atmosphere:'Four confident pulses, a playful dice beat and a shared rising finish.',
    hosts:['polly','pengu','retsba','abster'],dialogue:[['polly','We’ve celebrated so many remarkable traditions. This table is ours to begin.'],['pengu','Two dice, up to two moves. You can end your turn after rolling. The original royal King holds each kingdom together.'],['retsba','A friendly match. I am still planning to win.'],['abster','And I’m planning the rematch lights!']],
    memory:'The New Winter',memoryLine:'A tradition can begin tonight.',fact:'Each die activates a piece family and can be spent independently. After rolling, you may end your turn with zero or one move. Capturing an original royal King eliminates its kingdom in this adaptation.',
    mechanics:'Modern Chaturanga-inspired adaptation: 8 × 8, four clans, one or two dice, Guard promotion and royal elimination. It does not claim to reproduce all historical Chaturanga variants.',
    challenges:[{mission:'two-dice',title:'Spend two dice in one turn'},{mission:'icebreaker-hop',variant:'occupied',title:'An Icebreaker leaps'},{mission:'royal-watch',title:'Watch the royal King'}],
    motif:{name:'Four clans together',notes:[261.63,329.63,392,523.25,659.25,523.25],wave:'triangle'},clue:'Return to Lantern Harbor. Seven lights surround an empty chair. Who is the eighth for?',next:'xiangqi',
    evidence:'A modern game created for this collection and inspired by four-player Chaturanga traditions. The selected dice and elimination rules are defined by the existing Chaturanga engine and bundled rulebook.',sources:[]},
};

export const INTERLUDE=[['polly','Three halls already! Rocco, must every welcome become a tournament?'],['retsba','A very friendly tournament. With a rematch.'],['abster','Wait—look at the pattern between the lanterns!'],['pengu','Every guest finds a different route. There is no required order.'],['polly','Then let’s keep exploring. There is always room at the next table.']];
export const REVEAL=[['polly','Piko, why is there an eighth lantern? We only have seven halls.'],['retsba','Perhaps it’s another competition!'],['abster','Or something we haven’t invented yet!'],['pengu','Neither. Look at the empty chair.'],['pengu','The eighth lantern was never for another game.'],['polly','It was for our next guest.'],['pengu','The eighth light was always for you.']];

const time=value=>Number.isFinite(value)&&value>0?value:null;
export function gatheringProgress(value={},journal={}){
  const clean={version:1,halls:{},revealedAt:time(value?.revealedAt),interludeAt:time(value?.interludeAt),friendVisitAt:time(value?.friendVisitAt)};
  for(const id of HALL_ORDER){const h=value?.halls?.[id]||{};const learnedAt=time(h.learnedAt)||time(journal?.[id]);clean.halls[id]={visitedAt:time(h.visitedAt),learnedAt,challenges:Object.fromEntries(HALLS[id].challenges.filter(c=>time(h.challenges?.[c.mission])).map(c=>[c.mission,h.challenges[c.mission]]))};}
  if(HALL_ORDER.some(id=>!clean.halls[id].learnedAt))clean.revealedAt=null;
  return clean;
}
export function visitHall(value,id,at=Date.now()){const p=gatheringProgress(value);if(Object.hasOwn(HALLS,id)&&time(at))p.halls[id].visitedAt ||= at;return p;}
export function earnLantern(value,id,{mission,at=Date.now()}={}){const p=gatheringProgress(value);if(!Object.hasOwn(HALLS,id)||!time(at))return p;if(mission&&!HALLS[id].challenges.some(c=>c.mission===mission))return p;p.halls[id].learnedAt ||= at;p.halls[id].visitedAt ||= at;if(mission)p.halls[id].challenges[mission] ||= at;return p;}
export const lanternCount=value=>HALL_ORDER.filter(id=>time(value?.halls?.[id]?.learnedAt)).length;
export function revealGathering(value,at=Date.now()){const p=gatheringProgress(value);if(lanternCount(p)===7&&time(at))p.revealedAt ||= at;return p;}
export function storySettings(value={}){return {enabled:value?.enabled!==false,sound:value?.sound===true};}
export function featuredHall(now=new Date()){const days=Math.floor(now.getTime()/86400000),week=Math.floor((days-4)/7);return HALL_ORDER[((week%7)+7)%7];}
export function hallPostcard(id){const h=HALLS[id];return{key:'hall:'+id,gameId:id,host:h.hosts[0],hallName:h.name,title:h.memory,caption:h.memoryLine,art:HALL_ART[id].image};}
export function guestPostcard(){return{key:'gathering-guest',gameId:'dominion',host:'polly',hallName:'Lantern Harbor',title:'Gathering Guest',caption:'The eighth light was always for you.',art:'art/celebration/scenes/eighth-lantern-celebration.webp'};}
export function hallInvitation(id,code,url){const h=HALLS[id];return `Meet me at ${h.name} in The Eternal Gathering.\n${({shogi:'Shogi',sannin:'Sannin Shogi',sanguo:'Sanguo Qi',sanyou:'San You Qi',yanyi:'Sanguo Yan Yi Qi',xiangqi:'Xiangqi',dominion:'Chaturanga'})[id]} · ${{shogi:2,sannin:3,sanguo:3,sanyou:3,yanyi:3,xiangqi:2,dominion:4}[id]} seats\nPrivate room: ${code}\n${url}\nOpen in Safari to play in your browser, or use the Android app.`;}
