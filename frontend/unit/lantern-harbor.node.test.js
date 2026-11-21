import assert from "node:assert/strict";
import test from "node:test";
import * as T from "three";
import { ARRIVAL, HALLS, ROOM_ENTRY, door } from "../src/harbor/world.js";
import { buildScene as outdoors } from "../src/harbor/exterior.js";
import { buildScene as indoors } from "../src/harbor/interior.js";
import { walk, nearby, canWalk, cameraBlocked } from "../src/harbor/navigation.js";
import { getCatalogGame } from "../src/data/gameCatalog.js";

const scene = new T.Scene(), harbor = outdoors(scene), room = indoors(new T.Scene());

test("four complete hall meshes fit their sockets and offer existing games", () => {
  for (const hall of HALLS) {
    const socket = scene.getObjectByName(hall.key+"Socket");
    assert.deepEqual([socket.position.x,socket.position.z],[hall.x,hall.z]);
    const building = scene.children.find(o=>o.isGroup && o.position.x===hall.x && o.position.z===hall.z);
    assert.ok(new T.Box3().setFromObject(building).getSize(new T.Vector3()).y>3.5);
    const p = door(hall);
    assert.ok(canWalk(harbor,p.x,p.z));
    assert.equal(nearby(harbor,p),hall.key);
    for (const [,query] of hall.actions) assert.ok(getCatalogGame(new URLSearchParams(query).get("game"))?.available);
  }
});

test("walk to the temple, through the gate and stop at the rear wall", () => {
  const p={...ARRIVAL};
  walk(harbor,p,-14,0);
  walk(harbor,p,0,-15);
  assert.equal(nearby(harbor,p),"temple");
  walk(harbor,p,0,-40);
  assert.ok(p.z<0 && p.z>-3.6);
  assert.ok(harbor.ground(-14,2.4)>.25);
  assert.ok(cameraBlocked(harbor,-14,4,0));
});

test("dock, shore and the modeled street furniture have pedestrian boundaries", () => {
  const p={...ARRIVAL};
  walk(harbor,p,0,80);
  assert.ok(p.z>32 && p.z<33);
  walk(harbor,p,30,0);
  assert.ok(p.x<2.5);
  for (const [x,z] of [[12,23],[-2.25,18],[-11,16.3],[-8,13]]) assert.equal(canWalk(harbor,x,z),false);
});

test("temple interior exposes both stations, an open exit and a solid table", () => {
  const p={...ROOM_ENTRY};
  assert.equal(nearby(room,p),"exit");
  walk(room,p,0,-11);
  assert.equal(nearby(room,p),"table");
  assert.ok(p.z>1.3 && p.z<1.7);
  assert.ok(room.ground(p.x,p.z)>.18);
  for (const [x,id] of [[-3.55,"heritage"],[3.55,"tutorial"]]) {
    const q={x,z:1.9};
    walk(room,q,0,-3);
    assert.equal(nearby(room,q),id);
    assert.ok(canWalk(room,q.x,q.z));
  }
});
