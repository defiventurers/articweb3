import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {GAME_HISTORY,chronologicalGames} from '../src/gameHistory.js';
const e=createRequire(import.meta.url)('../build/games.cjs');


test('All Games chronology uses dated roots without mutating stable engine order',()=>{
  const original=e.GAME_LIST.map(g=>g.id);
  assert.deepEqual(chronologicalGames(e.GAME_LIST).map(g=>g.id),['dominion','xiangqi','shogi','sanguo','sanyou','sannin','yanyi']);
  assert.deepEqual(e.GAME_LIST.map(g=>g.id),original);
  assert.match(GAME_HISTORY.sanguo.period,/disputed/);
  assert.equal(GAME_HISTORY.yanyi.english,'The Romance of the Three Kingdoms');
  assert.match(GAME_HISTORY.yanyi.period,/2005/);
  assert.doesNotMatch(GAME_HISTORY.yanyi.period+GAME_HISTORY.yanyi.detail,/patent|filed/i);
});

test('Shogi runtime uses the exact GitHub upload with all 81 cells aligned to its published grid',()=>{
  const original=fs.readFileSync(new URL('../art/boards/shogi-github-board.png',import.meta.url));
  const runtime=fs.readFileSync(new URL('../android/app/src/main/assets/art/shogi/board-github-v1.png',import.meta.url));
  assert.deepEqual(runtime,original);
  assert.equal(createHash('sha1').update(Buffer.concat([Buffer.from('blob '+original.length+'\0'),original])).digest('hex'),'cc50869110a93bee180dff8010516df1b8240519');
  const css=fs.readFileSync(new URL('../../../frontend/src/styles/shogiFrozenShogunate.css',import.meta.url),'utf8');
  const source=css.match(/\.shogi-board-grid\{([^}]+)\}/)[1];
  const fraction=key=>Number(source.match(new RegExp('(?:^|;)'+key+':([0-9.]+)%'))[1])/100;
  const geometry=e.board('shogi');
  assert.equal(geometry.image,'art/shogi/board-github-v1.png');
  assert.equal(geometry.viewBox,'0 0 1536 1536');
  assert.equal(geometry.cells.length,81);
  for(let i=0;i<81;i++){
    const cell=geometry.cells[i];assert.equal(cell.id,String(i));
    assert.ok(Math.abs(cell.x-(fraction('left')+(i%9+.5)*fraction('width')/9)*1536)<1e-9);
    assert.ok(Math.abs(cell.y-(fraction('top')+(Math.floor(i/9)+.5)*fraction('height')/9)*1536)<1e-9);
  }
  assert.equal(e.pieces('shogi',e.create('shogi')).length,40);
  for(const piece of e.pieces('shogi',e.create('shogi')))assert.ok(geometry.cells.some(c=>c.id===piece.cell));
});
