// Presentation and learning progress only. Online IDs, rules and saved seats keep
// their existing identities so the rebrand installs over Arctic Play.
export const BRAND={name:'Antarctic Kingdoms',company:'Antarctic Gaming Co.',tagline:'Timeless games. A new world.',icon:'art/brand/icon.webp'};

export const GUIDES={
  polly:{name:'Polly',clan:'Polly Clan',color:'#f5a9cd',image:'art/brand/hosts-cute-v3/polly.webp',role:'Your welcoming practice guide',detail:'Start with one move. Learn at your own pace, then bring a friend.'},
  retsba:{name:'Retsba',clan:'Retsba Legion',color:'#f17b86',image:'art/brand/hosts-cute-v3/retsba.webp',role:'Your focused tactics guide',detail:'Look for captures, read the formation and protect your royal piece.'},
  pengu:{name:'Pengu',clan:'Pengu Order',color:'#8eb9ff',image:'art/brand/hosts-cute-v3/pengu.webp',role:'Your calm rules guide',detail:'Every board has its own paths. Let the legal highlights show the way.'},
  abster:{name:'Abster',clan:'Abster Tribe',color:'#68d7a8',image:'art/brand/hosts-cute-v3/abster.webp',role:'Your patient puzzle guide',detail:'Pause, notice the pattern and explore another possibility.'},
};

// Edition descriptions follow the supplied catalogue and the existing rulebooks.
// The fictional Archive never substitutes for a game's documented origin.
export const GAME_HERITAGE={
  shogi:{origin:'Japan',kind:'Living tradition',name:'Hon-shōgi',host:'pengu',story:'Japanese chess, where captured pieces return to play on your side.',edition:'The 9 × 9 Heritage Arcade edition, with promotion, captured-piece drops and King safety. Read the full rules for repetition and forbidden drops.'},
  sannin:{origin:'Japan',kind:'1930s historical variant',name:'Kokusai Sannin Shogi',host:'pengu',story:'Three armies meet on a hexagonal board around the Pleasure Garden.',edition:'The Fairbairn–Kapitan digital rules used by Heritage Arcade: 127 cells, drops, promotion, royal powers and alliances. This is a specified variant, not the rules of ordinary two-player Shogi.'},
  sanguo:{origin:'China',kind:'Historical Xiangqi variant',name:'Sanguo Qi',host:'retsba',story:'A three-kingdom strategy table built around connected sectors and shifting control.',edition:'The existing three-sector Heritage Arcade rules. Defeating a kingdom transfers its surviving army automatically. Original piece colours stay visible with an owner ring.'},
  sanyou:{origin:'China',kind:'Qing-era variant · digital edition',name:'San You Qi · Three Friends Chess',host:'pengu',story:'A meeting of three armies, with Fire, Flags and distinctive terrain.',edition:'The approved 156-intersection digital board, with its river, mountain, fort and central continuation rules. The digital topology and chosen restrictions are explained in the complete rulebook.'},
  yanyi:{origin:'Three Kingdoms theme',kind:'Chosen free-play ruleset',name:'Sanguo Yan Yi Qi',host:'retsba',story:'Three rival armies share a board with the separate yellow Han imperial force.',edition:'The selected free-play rules already used by Heritage Arcade, including Han activation and takeover. The historical setting is a theme; this listing does not claim the game itself is ancient.'},
  xiangqi:{origin:'China',kind:'Living tradition',name:'Xiangqi',host:'pengu',story:'The strategy of rivers, palaces, horses, chariots and screened Cannon captures.',edition:'The 90-intersection Heritage Arcade edition. Blue represents the traditional Black side. Tournament perpetual-chase and repetition adjudication are not included in this edition.'},
  dominion:{origin:'Modern adaptation',kind:'Chaturanga-inspired',name:'Arctic Dominion',host:'polly',story:'Four penguin kingdoms meet on an 8 × 8 battlefield, with dice activating their armies.',edition:'The existing Arctic Dominion rules: two dice, independently spent activations, Guard promotion and elimination on royal King capture. This is a modern Chaturanga-inspired adaptation, not a claim to reproduce every historical Chaturanga ruleset.'},
};

export const JOURNAL_KEY='archive-journal';
export function discoveryCount(journal){return Object.keys(GAME_HERITAGE).filter(id=>Number.isFinite(journal?.[id])&&journal[id]>0).length;}
export function recordDiscovery(journal,id,at=Date.now()){
  const clean=Object.fromEntries(Object.keys(GAME_HERITAGE).filter(key=>Number.isFinite(journal?.[key])&&journal[key]>0).map(key=>[key,journal[key]]));
  if(Object.hasOwn(GAME_HERITAGE,id)&&!clean[id])clean[id]=at;
  return clean;
}
