import assert from "node:assert/strict";
import test from "node:test";
import { ARRIVAL, HALLS, ROOM_ENTRY, door, nearby, isWalkable, walk } from "../src/harbor/world.js";
import { getCatalogGame } from "../src/data/gameCatalog.js";

test("each doorway is reachable and hands off to an existing catalogue entry", () => {
  for (const hall of HALLS) {
    const threshold = door(hall);
    assert.ok(isWalkable(threshold, false));
    assert.equal(nearby(threshold, false), hall.key);
    for (const [, query] of hall.actions) {
      assert.ok(getCatalogGame(new URLSearchParams(query).get("game"))?.available);
    }
  }
});

test("walk from the dock to the temple and stop at the building", () => {
  const player = { ...ARRIVAL };
  walk(player, -14, 0, false);
  walk(player, 0, -15, false);
  assert.equal(nearby(player, false), "temple");
  walk(player, 0, -80, false);
  assert.ok(player.z >= 4.42 && player.z < 4.65);
});

test("the quay and the end and sides of the dock keep walkers out of the water", () => {
  const player = { ...ARRIVAL };
  walk(player, 0, 80, false);
  assert.ok(player.z > 29 && player.z <= 29.58);
  walk(player, 30, 0, false);
  assert.ok(player.x < 2.19);
  assert.equal(isWalkable({ x: 12, z: 23 }, false), false);
});

test("the temple table, heritage pedestal and exit have walkable approaches", () => {
  const player = { ...ROOM_ENTRY };
  assert.equal(nearby(player, true), "exit");
  walk(player, 0, -11, true);
  assert.equal(nearby(player, true), "table");
  assert.ok(player.z >= 1.22);
  walk(player, -4.6, 0, true);
  walk(player, 0, -2, true);
  assert.equal(nearby(player, true), "heritage");
  assert.ok(isWalkable(player, true));
});
