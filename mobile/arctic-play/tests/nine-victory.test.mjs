import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createInitialState as createCommander,applyAction as commanderAction,isFinished} from '../../../frontend/src/games/co-tu-lenh/rules.js';
import {createInitialState as createShanshui,resign,teamOf,TEAMS} from '../../../frontend/src/games/shanshui-xiangqi/rules.js';

const file=path=>readFileSync(new URL(path,import.meta.url),'utf8');

test('Commander Chess win is derived from final rule-engine state; no presentation result mutation',()=>{
 const match=createCommander('youtuber_rules');
 const finished=commanderAction(match,{kind:'concede',id:'turn'});
 assert.equal(finished.winner,'blue');
 assert.equal(isFinished(finished),true);
 assert.equal(finished.draw||false,false);
 const surviving=finished.pieces.filter(p=>p.alive&&p.team===finished.winner);
 assert.ok(surviving.length>0);
 assert.ok(surviving.every(p=>p.team==='blue'));
 assert.equal(match.winner,null,'presentation must not mutate original game state');
});

test('Shanshui team victory chooses both winning armies using rule authority',()=>{
 const initial=createShanshui();
 const final=resign(initial,'white');
 assert.equal(final.outcome?.winner,'black');
 assert.equal(final.outcome?.type,'win');
 assert.deepEqual(TEAMS.black,['blue','green']);
 const winners=final.pieces.filter(p=>teamOf(p.army)===final.outcome.winner);
 assert.ok(winners.length>0);
 assert.ok(winners.every(p=>TEAMS.black.includes(p.army)));
 assert.equal(initial.outcome,null,'display must not change earlier state');
});

test('Standalone Commander Chess has all result actions, original sprites, mode-aware rematch',()=>{
 const app=file('../../../frontend/src/games/co-tu-lenh/CoTuLenhApp.jsx');
 assert.match(app,/isFinished\(state\)&&!resultHidden&&<RoyalResult/);
 assert.match(app,/state\.pieces\.filter\(p=>p\.alive&&\(state\.draw\|\|p\.team===state\.winner\)\)/);
 assert.match(app,/viewerWon=\{mode==='bot'\?state\.winner===human:null\}/);
 assert.match(app,/onRematch=\{isOnline\?/);
 assert.match(app,/onViewBoard=\{\(\)=>setResultHidden\(true\)\}/);
 assert.match(app,/onShare=\{shareResult\}/);
 assert.match(app,/onBack=/);
});

test('Local Shanshui uses team outcome; online Shanshui uses server state and real room API',()=>{
 const local=file('../../../frontend/src/games/shanshui-xiangqi/ShanshuiApp.jsx');
 assert.match(local,/playing&&state\.outcome&&!resultHidden&&<RoyalResult/);
 assert.match(local,/teamOf\(p.army\)===finalTeam/);
 assert.match(local,/onPlayAgain=\{\(\)=>\{setResultHidden\(true\);start\(mode\);\}\}/);
 const online=file('../src/ShanshuiMobile.jsx');
 assert.match(online,/state\?\.outcome&&!resultHidden&&<RoyalResult/);
 assert.match(online,/room\?\.gameState/);
 assert.match(online,/rules\.teamOf\(me\?\.seat\)===winner/);
 assert.match(online,/run\(\(\)=>connect\('create'\)\)/);
 assert.match(online,/onBackToGames/);
});

test('Shared royal component includes the essential, functional controls and source-native piece images',()=>{
 const ui=file('../../../frontend/src/games/shared/RoyalResult.jsx');
 const css=file('../../../frontend/src/games/shared/royal-result.css');
 assert.match(ui,/role="dialog" aria-modal="true"/);
 for(const required of ['onPlayAgain','onRematch','onViewBoard','onBack','onShare'])
   assert.match(ui,new RegExp(required));
 assert.match(ui,/pieces\.map\(\(p,i\)=>/);
 assert.match(ui,/p\.src/);
 assert.match(ui,/onKey/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 assert.match(file('../scripts/build-current.mjs'),/frontend\/src\/games\/shared\/royal-result\.css/);
});
