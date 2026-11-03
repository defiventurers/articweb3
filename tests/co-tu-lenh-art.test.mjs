import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname,resolve,join} from 'node:path';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const assets=join(root,'frontend/public/assets/co-tu-lenh');
const types=['commander','infantry','tank','militia','engineer','artillery','antiair','missile','aircraft','navy','headquarters'];
test('Antarctic Cờ Tư Lệnh preserves exact 11×12 intersection topology',()=>{
 const d=JSON.parse(readFileSync(join(assets,'board/board-geometry.json'),'utf8'));
 assert.equal(d.columns,11);assert.equal(d.rows,12);assert.equal(d.nodes,132);
 assert.deepEqual(d.river_between_rows,[6,5]);
 assert.equal(d.row_orientation,'11 at top, 0 at bottom');
});
test('both teams include transparent asset for each of 11 source-native unit roles',()=>{
 for(const side of ['red','blue'])for(const type of types)assert.ok(existsSync(join(assets,`pieces/${side}-${type}.webp`)),`${side}-${type}`);
});
test('view geometry is source-aligned and Blue rotation rotates board and pieces',()=>{
 const app=readFileSync(join(root,'frontend/src/games/co-tu-lenh/CoTuLenhApp.jsx'),'utf8');
 assert.match(app,/STEP_X=90\.4,STEP_Y=900\/11/);
 assert.match(app,/rotate\(180/);
 assert.match(app,/length:132/);
 assert.match(app,/board-antarctic-11x12\.webp/);
 assert.match(app,/\.webp/);
});