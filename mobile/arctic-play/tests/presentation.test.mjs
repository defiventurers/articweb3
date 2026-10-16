import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),engine=require('../build/games.cjs');
const {parseInvitation,describeTransition,APP_VERSION}=require('../build/presentation.cjs');
const sharp=createRequire(new URL('../../../frontend/package.json',import.meta.url))('sharp');

test('Invitations: accept shared links and codes while rejecting unrelated or malformed URLs',()=>{
  for(const value of ['abc234',' ABC234 ','arcticplay://room/abc234','antarctickingdoms://room/abc234','Join my Antarctic Kingdoms table: antarctickingdoms://room/ABC234','https://articweb3.onrender.com/arctic-play/join?room=abc234','Join me for Shogi on Arctic Play. Room: ABC234\nhttps://articweb3.onrender.com/arctic-play/join?room=ABC234'])assert.equal(parseInvitation(value),'ABC234');
  assert.equal(parseInvitation('arcticplay://room/ABC234\narcticplay://room/DEF567'),null,'ambiguous invitations do not join the wrong table');
  for(const value of ['',null,'ABC01D','ABC2347','https://example.com/arctic-play/join?room=ABC234','https://articweb3.onrender.com.evil.example/arctic-play/join?room=ABC234','http://articweb3.onrender.com/arctic-play/join?room=ABC234','arcticplay://room/ABC234/other'])assert.equal(parseInvitation(value),null);
  assert.equal(APP_VERSION,'2.0.0');assert.equal(engine.VERSION,'arctic-play-1.0.0','existing rooms retain the same protocol');
});

test('Last-move markers follow accepted positions for all seven games and ignore unchanged boards',()=>{
  for(const game of engine.GAME_LIST){
    const before=engine.create(game.id);if(game.id==='dominion')before.dice={rolled:true,values:[1,3],used:[false,false]};const action=engine.actions(game.id,before).find(a=>a.source.startsWith('piece:')&&a.target);
    const unit=engine.pieces(game.id,before).find(p=>p.source===action.source),after=engine.apply(game.id,before,action.id);
    const movement=describeTransition(game.id,before,after);
    assert.equal(movement.from,unit.cell);assert.equal(movement.to,action.target);assert.ok(movement.label);
    assert.equal(describeTransition(game.id,after,JSON.parse(JSON.stringify(after))),null);
    assert.equal(describeTransition(game.id,null,after),null);
  }
});

test('A Shogi drop marks the new destination without inventing an origin square',()=>{
  const before=engine.create('shogi');before.hands.red.silver=1;
  const action=engine.actions('shogi',before).find(a=>a.kind==='drop');assert.ok(action);
  const after=engine.apply('shogi',before,action.id),movement=describeTransition('shogi',before,after);
  assert.equal(movement.from,null);assert.equal(movement.to,action.target);assert.match(movement.label,/\(drop\)/);
});

test('Every game has a visible board cover with its canonical cells and initial army',async()=>{
  const root=new URL('../android/app/src/main/assets/art/covers/',import.meta.url);
  const manifest=JSON.parse(fs.readFileSync(new URL('manifest.json',root)));
  assert.equal(manifest.length,engine.GAME_LIST.length);
  for(const game of engine.GAME_LIST){
    const cover=manifest.find(c=>c.id===game.id);assert.ok(cover);
    assert.equal(cover.cells,engine.board(game.id).cells.length);assert.equal(cover.pieces,engine.pieces(game.id,engine.create(game.id)).length);
    assert.ok(cover.keyPieces.length>=2);assert.ok(cover.card);
    for(const name of [cover.scene,cover.board,cover.card]){
      const file=fs.readFileSync(new URL(name,root)),metadata=await sharp(file).metadata(),stats=await sharp(file).stats();
      assert.ok(metadata.width>=640);assert.ok(stats.entropy>2,`${game.id} artwork has visible detail`);
      if(metadata.hasAlpha)assert.ok(stats.channels[3].mean>60,`${game.id} board is visible, rather than an empty transparent image`);
    }
  }
});

test('Piece-led covers are tied to the actual source pieces, including Han and the unicorn',()=>{
  const manifest=JSON.parse(fs.readFileSync(new URL('../art/cards/manifest.json',import.meta.url)));
  assert.equal(manifest.length,engine.GAME_LIST.length);
  const han=manifest.find(c=>c.id==='yanyi');assert.deepEqual(han.keyPieces,['Yellow Han Emperor','Blue Unicorn Horse']);
  assert.ok(han.references.some(p=>p.endsWith('/han-emperor.webp')));assert.ok(han.references.some(p=>p.endsWith('/blue-horse.webp')));
  for(const card of manifest){assert.ok(engine.game(card.id));for(const reference of card.references)assert.ok(fs.existsSync(new URL('../../../'+reference,import.meta.url)),reference);}
});
