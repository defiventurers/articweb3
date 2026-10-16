import {GUIDES,GAME_HERITAGE,discoveryCount} from './brand.js';

// Local, authored character dialogue. This module never evaluates legal moves,
// sends room messages, or requests a model/network service.
export const COMPANION_KEY='mascot-companions';
export const DEFAULT_COMPANIONS={mode:'lively',guide:'auto',motion:true};
export const CHAT_PROMPTS=[
  {id:'hello',label:'Say hello'},
  {id:'encourage',label:'Cheer me on'},
  {id:'thought',label:'Share a thought'},
  {id:'celebrate',label:'High five!'},
  {id:'breathe',label:'Take a breath'},
  {id:'journal',label:'My discoveries'},
];
export function companionPreferences(value){
  return {mode:['lively','quiet','off'].includes(value?.mode)?value.mode:'lively',guide:value?.guide==='auto'||Object.hasOwn(GUIDES,value?.guide||'')?value.guide:'auto',motion:typeof value?.motion==='boolean'?value.motion:true};
}

const voices={
  polly:{
    hello:[c=>`Hello, ${c.name||'Explorer'}! There’s room for you at our table. Shall we find a game?`,()=>"I brought the warm welcome. You bring the curiosity. It’s good to see you!"],
    encourage:[()=>"One move at a time. You’re allowed to learn as you go.",()=>"A tricky game can still be a lovely time. Give yourself room to try."],
    thought:[()=>"My favourite opening? Saying hello to the person across the board.",()=>"The Frozen Archive has seven tables. Every one is an invitation to try something new."],
    celebrate:[()=>"Flippers up! A little celebration for showing up and playing.",()=>"High five! A thoughtful try deserves a little cheer, too."],
    breathe:[()=>"Let your shoulders relax. Take one slow breath. The next move can wait.",()=>"No rush from me. A sip of water and a moment to settle?"],
  },
  retsba:{
    hello:[c=>`${c.name||'Explorer'}, welcome to my corner of the Archive. Focused play, friendly company.`,()=>"Ready when you are. Bring your best curiosity; we’ll leave the pressure outside."],
    encourage:[()=>"Stay curious after a mistake. The next decision still belongs to you.",()=>"Take your time. A calm look at the whole board is part of playing well."],
    thought:[()=>"A good rival can teach you something. So can a game you don’t win.",()=>"I like a thoughtful rematch: same friends, a fresh chance to notice something."],
    celebrate:[()=>"A crisp flipper high five. Good effort at the table!",()=>"That’s the spirit. Respect for your rival, and a little pride in your effort."],
    breathe:[()=>"Unclench your hands. Breathe out. You can bring focus without bringing tension.",()=>"Even a focused penguin takes a break. Come back when you feel ready."],
  },
  pengu:{
    hello:[c=>`Hello, ${c.name||'Explorer'}. I’m Pengu. I like making a new board feel a little more familiar.`,()=>"A calm welcome from me. Every game has its own paths; we can take our time."],
    encourage:[()=>"You don’t need to remember everything at once. The game’s legal highlights are here to help.",()=>"Questions belong at the table. There’s no hurry to know every rule."],
    thought:[()=>"Our Antarctic home is imaginary. The games keep their own names, origins and traditions.",()=>"A shared rule gives two strangers a way to begin playing together. I rather like that."],
    celebrate:[()=>"A gentle high five! Another moment of curiosity in the Archive.",()=>"A little happy waddle for you. Enjoy the moment."],
    breathe:[()=>"Breathe in slowly, then out. Let your eyes rest before you return to the board.",()=>"The board will still be here. A comfortable pause is always welcome."],
  },
  abster:{
    hello:[c=>`Hi, ${c.name||'Explorer'}! I’m Abster. I’ll bring a little patience and plenty of curiosity.`,()=>"Welcome to my patch of the Archive. Shall we notice something new together?"],
    encourage:[()=>"You can explore without getting everything right. A new possibility is a fine place to start.",()=>"Small discoveries count. Notice one thing you didn’t see before."],
    thought:[()=>"Sometimes I look away for a moment and return with fresher eyes.",()=>"A familiar board can hide a new pattern. That’s what keeps me curious."],
    celebrate:[()=>"Flipper high five! A tiny happy waddle for a curious explorer.",()=>"A little burst of green cheer. It’s good to make time for play."],
    breathe:[()=>"Soften your gaze. Take a slow breath. You don’t have to solve everything this moment.",()=>"A little pause can be part of the adventure. Stretch, sip, and return at your own pace."],
  },
};

export const EVENT_PRIORITY={welcome:1,navigate:1,idle:0,match:1,room:1,move:1,turn:2,dice:1,capture:3,check:3,discovery:4,win:5,loss:5,draw:5,finished:5,undo:1,restart:1,connection:3};
const important=new Set(['win','loss','draw','finished','discovery','connection']);
// One line at a time. Normal chatter is spaced out; important results may
// replace it. A dismissal silences proactive lines for a minute.
export function allowCompanionEvent({preferences,last,event,now,visible=true,blocked=false,snoozed=false,dismissedUntil=0,key}){
  if(preferences.mode!=='lively'||!visible||blocked||snoozed||now<dismissedUntil)return false;
  if(last?.key===key)return false;
  if(!last)return true;
  const elapsed=now-last.at;
  return important.has(event)||elapsed>=22000||(['match','room'].includes(event)&&elapsed>=1200)||(EVENT_PRIORITY[event]>=3&&elapsed>=6000);
}

export function hostFor(event,context,preferences){
  if(preferences.guide!=='auto')return preferences.guide;
  if(['welcome','room','win','loss','draw','finished'].includes(event))return 'polly';
  if(['capture','check'].includes(event))return 'retsba';
  if(['idle','discovery','undo'].includes(event))return 'abster';
  if(event==='turn'||event==='dice')return 'pengu';
  if(context.screen==='match')return GAME_HERITAGE[context.gameId]?.host||'pengu';
  return {home:'abster',games:'polly',friends:'polly',chats:'pengu',profile:'retsba'}[context.tab]||'polly';
}

export function companionLine(event,context={},variant=0,host='polly'){
  if(event==='journal'){
    const count=discoveryCount(context.journal);
    return count?`Your Archive journal holds first guided moves at ${count} of 7 tables. Explore another whenever you feel like it.`:"Your Archive journal is ready for its first discovery. Try a guided first move when you’re curious.";
  }
  if(voices[host]?.[event])return voices[host][event][variant%voices[host][event].length](context);
  const lines={
    welcome:()=>`Welcome back, ${context.name||'Explorer'}. Tap my portrait whenever you fancy a little company.`,
    navigate:()=>({home:"The Archive is open. Visit our camp, or see the discoveries you’ve made so far.",games:"Seven tables to explore. Pick one that catches your eye; I’ll come along.",friends:"A familiar name and a shared invitation. That’s a lovely start to a game.",chats:"Your table conversations live here. Our camp chats stay on this phone.",profile:"Make yourself comfortable. You can choose your companion or quiet us here."}[context.tab]||'Shall we explore?'),
    match:()=>context.online?"I’m here for company. Your match stays between the players; tap me for a breather.":`A fresh ${context.gameName||'game'} table. I’ll keep you company beside the board.`,
    room:()=>"A place for everyone. Share the room invitation, then get comfortable while friends arrive.",
    idle:()=>["A little curious company, whenever you want it. Tap me to visit the camp.","No hurry to choose. All seven tables will be here when you’re ready."][variant%2],
    move:()=>context.online?"The board has moved on. Enjoy the next moment of the game.":["One move further into the game. Keep exploring.","A new position, a fresh possibility. Take it at your pace."][variant%2],
    turn:()=>"It’s your turn again. Take the time you need.",
    dice:()=>"Dice are rolled. The tray shows which pieces they activate.",
    capture:()=>context.online?"The position has changed. A calm moment before play continues.":"A capture changes the shape of the game. Stay curious about what comes next.",
    check:()=>"The game marks check. The legal highlights already account for your royal piece’s safety.",
    discovery:()=>"A first guided move, saved in your Archive journal! A little discovery worth celebrating.",
    win:()=>"A win for you! Enjoy it, and a friendly flipper salute to your opponent.",
    loss:()=>"That was one game, not a measure of you. A break or a friendly rematch can both be good next steps.",
    draw:()=>"A shared finish. Thank your fellow players, and enjoy the game you made together.",
    finished:()=>"The game is complete. A flipper salute to everyone at the table!",
    undo:()=>"A chance to look again. Your previous practice position is back.",
    restart:()=>"A fresh board and a fresh beginning. Take it at your own pace.",
    connection:()=>"The connection paused. Your seat stays saved; the reconnect control is above the board.",
  };
  return (lines[event]||lines.idle)();
}

export function companionMood(event){return ['celebrate','win','discovery'].includes(event)?'celebrate':['breathe','loss'].includes(event)?'calm':event==='hello'||event==='welcome'?'wave':event==='thought'?'curious':'listening';}

export function finishCompanionEvent({outcome,online=false,seat,humans=[],hotseat=false}){
  if(outcome.draw)return 'draw';
  if(!online&&hotseat)return 'finished';
  const winners=Array.isArray(outcome.winner)?outcome.winner:typeof outcome.winner==='string'?outcome.winner.split(' + '):[];
  if(!winners.length)return 'finished';
  return (online?winners.includes(seat):humans.some(side=>winners.includes(side)))?'win':'loss';
}
