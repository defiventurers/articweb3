// GENERATED FILE. Do not edit directly.
// Source: frontend/src/games/san-you-qi/{topology.js,rules.js,bot.js}
// Regenerate with: npm run build:sanyou-engine

// Sanyou Qi board topology.
// The 135 coloured arm points come from the latest placement export.
// The central graph has 21 surviving C-points: C1-C18, C20, C22 and C24.

const SANYOU_FACTIONS = Object.freeze(["red", "green", "blue"]);

const ARM_COORDS = Object.freeze({"red":[[0.325114,0.754632],[0.326265,0.716023],[0.326265,0.673419],[0.328566,0.626821],[0.329717,0.578892],[0.366541,0.758626],[0.366541,0.71336],[0.366541,0.672088],[0.367692,0.624159],[0.368842,0.57623],[0.406817,0.759958],[0.406817,0.714691],[0.406817,0.672088],[0.407968,0.624159],[0.407968,0.57623],[0.451696,0.757295],[0.451696,0.71336],[0.449395,0.670756],[0.450545,0.62549],[0.450545,0.577561],[0.493274,0.757295],[0.494274,0.712029],[0.493123,0.670756],[0.494274,0.62549],[0.494274,0.578892],[0.536002,0.756295],[0.538002,0.712029],[0.536852,0.669425],[0.536852,0.626821],[0.536852,0.577561],[0.58058,0.758626],[0.578429,0.714691],[0.579429,0.672088],[0.579429,0.626821],[0.578278,0.577561],[0.621158,0.757626],[0.621158,0.713691],[0.620007,0.672088],[0.620856,0.62549],[0.618555,0.57623],[0.663434,0.759958],[0.661132,0.71336],[0.662283,0.672088],[0.659982,0.626821],[0.658831,0.577561]],"green":[[0.850061,0.426779],[0.810196,0.453106],[0.77069,0.481397],[0.729761,0.512469],[0.688347,0.540235],[0.829891,0.388694],[0.790229,0.412252],[0.749802,0.442909],[0.709389,0.470675],[0.668976,0.498441],[0.805159,0.350937],[0.768496,0.373496],[0.728991,0.400787],[0.687578,0.428553],[0.646759,0.457379],[0.782813,0.309841],[0.74823,0.334766],[0.705913,0.358177],[0.666657,0.386676],[0.625838,0.413503],[0.763814,0.270598],[0.721152,0.294156],[0.688319,0.315874],[0.645062,0.346372],[0.605321,0.373564],[0.748219,0.236294],[0.709558,0.257853],[0.671646,0.281203],[0.62414,0.307494],[0.584243,0.334955],[0.720297,0.189417],[0.688308,0.216402],[0.647803,0.242692],[0.602141,0.267251],[0.562839,0.294773],[0.699297,0.150173],[0.665714,0.176098],[0.627803,0.203449],[0.581657,0.230702],[0.54395,0.257284],[0.677566,0.117417],[0.641015,0.141731],[0.601993,0.167327],[0.564519,0.194007],[0.525217,0.220528]],"blue":[[0.316891,0.117748],[0.351762,0.140623],[0.390485,0.16829],[0.429271,0.193905],[0.467737,0.221083],[0.296154,0.153813],[0.331048,0.176709],[0.368685,0.20176],[0.409152,0.228938],[0.447619,0.256115],[0.274184,0.192055],[0.309078,0.21495],[0.347801,0.240616],[0.386267,0.267794],[0.427331,0.291919],[0.249083,0.236352],[0.286892,0.258633],[0.322808,0.280194],[0.365105,0.308141],[0.406168,0.334266],[0.231005,0.271315],[0.267898,0.29221],[0.302134,0.320209],[0.34443,0.346157],[0.384409,0.373668],[0.21033,0.30933],[0.245224,0.334225],[0.280543,0.358839],[0.321267,0.386506],[0.363415,0.415245],[0.189167,0.353678],[0.221573,0.374906],[0.260295,0.400572],[0.299189,0.429468],[0.341934,0.457153],[0.169089,0.392641],[0.198897,0.414922],[0.238217,0.443535],[0.276792,0.471991],[0.320134,0.496625],[0.147119,0.426882],[0.180291,0.450286],[0.217332,0.480391],[0.257419,0.509181],[0.298165,0.538866]]});
const CENTER_COORDS = Object.freeze({"C1":[0.367515,0.525993],"C2":[0.411515,0.529941],"C3":[0.451667,0.528696],"C4":[0.494485,0.527593],"C5":[0.536303,0.528696],"C6":[0.579515,0.528941],"C7":[0.621424,0.527096],"C8":[0.611212,0.485573],"C9":[0.589303,0.443553],"C10":[0.566485,0.403534],"C11":[0.548303,0.362514],"C12":[0.527576,0.319391],"C13":[0.496212,0.276372],"C14":[0.470121,0.320443],"C15":[0.449212,0.362514],"C16":[0.427394,0.40143],"C17":[0.40797,0.443046],"C18":[0.384242,0.483117],"C20":[0.49397,0.479048],"C22":[0.525061,0.428617],"C24":[0.463424,0.428472]});

const armNodeId = (faction, lane, rank) => `${faction}:L${lane}-${rank}`;
const centerNodeId = (number) => `C${number}`;

function parseArmNode(id) {
  const match = /^(red|green|blue):L([1-9])-([1-5])$/.exec(id);
  if (!match) return null;
  return { faction: match[1], lane: Number(match[2]), rank: Number(match[3]) };
}

function isCenterNode(id) {
  return Object.prototype.hasOwnProperty.call(CENTER_COORDS, id);
}

function boardPoint(id) {
  const arm = parseArmNode(id);
  if (arm) return ARM_COORDS[arm.faction][(arm.lane - 1) * 5 + (arm.rank - 1)];
  return CENTER_COORDS[id] || null;
}

function nodeLabel(id) {
  const arm = parseArmNode(id);
  return arm ? `${arm.faction.toUpperCase()} L${arm.lane}-${arm.rank}` : id;
}

const ALL_NODE_IDS = Object.freeze([
  ...SANYOU_FACTIONS.flatMap((faction) =>
    Array.from({ length: 9 }, (_, laneIndex) =>
      Array.from({ length: 5 }, (_, rankIndex) => armNodeId(faction, laneIndex + 1, rankIndex + 1)),
    ).flat(),
  ),
  ...Object.keys(CENTER_COORDS),
]);

const armPath = (faction, lane) =>
  Object.freeze(Array.from({ length: 5 }, (_, index) => armNodeId(faction, lane, index + 1)));

const reverseArmPath = (faction, lane) => [...armPath(faction, lane)].reverse();

const line = (id, nodes, kind = "continuation") => Object.freeze({ id, kind, nodes: Object.freeze(nodes) });

// User-approved continuation lines. Each path is an uninterrupted straight movement line.
// Alternate routes are intentionally separate lines so a sliding move never turns at a junction.
const CONTINUATION_LINES = Object.freeze([
  line("RB-1", [...armPath("red", 1), ...reverseArmPath("blue", 9)]),
  line("RB-2", [...armPath("red", 2), "C1", ...reverseArmPath("blue", 8)]),
  line("RB-3", [...armPath("red", 3), "C2", "C18", ...reverseArmPath("blue", 7)]),
  line("RB-4", [...armPath("red", 4), "C3", "C17", ...reverseArmPath("blue", 6)]),
  line("RB-5", [...armPath("red", 5), "C4", "C20", "C24", "C16", ...reverseArmPath("blue", 5)]),
  line("RG-5", [...armPath("red", 5), "C4", "C20", "C22", "C10", ...reverseArmPath("green", 5)]),
  line("RG-6", [...armPath("red", 6), "C5", "C9", ...reverseArmPath("green", 4)]),
  line("RG-7", [...armPath("red", 7), "C6", "C8", ...reverseArmPath("green", 3)]),
  line("RG-8", [...armPath("red", 8), "C7", ...reverseArmPath("green", 2)]),
  line("RG-9", [...armPath("red", 9), ...reverseArmPath("green", 1)]),
  line("BG-5", [...armPath("blue", 5), "C16", "C24", "C22", "C10", ...reverseArmPath("green", 5)]),
  line("BG-4", [...armPath("blue", 4), "C15", "C11", ...reverseArmPath("green", 6)]),
  line("BG-3", [...armPath("blue", 3), "C14", "C12", ...reverseArmPath("green", 7)]),
  line("BG-2", [...armPath("blue", 2), "C13", ...reverseArmPath("green", 8)]),
  line("BG-1", [...armPath("blue", 1), ...reverseArmPath("green", 9)]),
]);

// Only H1-H3 remain. C20, C22 and C24 are each alone in their horizontal row.
const CENTER_HORIZONTAL_LINES = Object.freeze([
  line("H1", ["C1","C2","C3","C4","C5","C6","C7"], "horizontal"),
  line("H2", ["C13","C14","C15","C16","C17","C18","C1"], "horizontal"),
  line("H3", ["C7","C8","C9","C10","C11","C12","C13"], "horizontal"),
]);

const ARM_FILE_LINES = Object.freeze(
  SANYOU_FACTIONS.flatMap((faction) =>
    Array.from({ length: 9 }, (_, index) =>
      line(`${faction}-F${index + 1}`, [...armPath(faction, index + 1)], "file"),
    ),
  ),
);

const ARM_RANK_LINES = Object.freeze(
  SANYOU_FACTIONS.flatMap((faction) =>
    Array.from({ length: 5 }, (_, rankIndex) =>
      line(
        `${faction}-R${rankIndex + 1}`,
        Array.from({ length: 9 }, (_, laneIndex) => armNodeId(faction, laneIndex + 1, rankIndex + 1)),
        "horizontal",
      ),
    ),
  ),
);

const SLIDING_LINES = Object.freeze([
  ...ARM_FILE_LINES,
  ...ARM_RANK_LINES,
  ...CONTINUATION_LINES,
  ...CENTER_HORIZONTAL_LINES,
]);

const SIDEWAYS_LINES = Object.freeze([
  ...ARM_RANK_LINES,
  ...CENTER_HORIZONTAL_LINES,
]);

const edgeKey = (a, b) => [a, b].sort().join("|");
const directedEdgeKey = (a, b) => `${a}>${b}`;

const SEA_EDGES = new Set([
  edgeKey("C3", "C17"),
  edgeKey("C5", "C9"),
  edgeKey("C15", "C11"),
  edgeKey("C4", "C20"),
  edgeKey("C20", "C22"),
  edgeKey("C20", "C24"),
  edgeKey("C24", "C22"),
]);

const SEA_HORSE_CHARIOT_BLOCKS = new Set([
  edgeKey("C3", "C17"),
  edgeKey("C5", "C9"),
  edgeKey("C15", "C11"),
]);

const MOUNTAIN_EDGES = new Set([
  edgeKey("C2", "C18"),
  edgeKey("C6", "C8"),
  edgeKey("C14", "C12"),
]);

const CITY_EDGES = new Set([
  edgeKey(armNodeId("red", 1, 5), armNodeId("blue", 9, 5)),
  edgeKey(armNodeId("red", 2, 5), "C1"),
  edgeKey("C1", armNodeId("blue", 8, 5)),
  edgeKey(armNodeId("red", 8, 5), "C7"),
  edgeKey("C7", armNodeId("green", 2, 5)),
  edgeKey(armNodeId("red", 9, 5), armNodeId("green", 1, 5)),
  edgeKey(armNodeId("blue", 2, 5), "C13"),
  edgeKey("C13", armNodeId("green", 8, 5)),
  edgeKey(armNodeId("blue", 1, 5), armNodeId("green", 9, 5)),
]);

const FORT_DIRECT_CANNON_BLOCKS = new Set([
  edgeKey(armNodeId("red", 1, 5), armNodeId("blue", 9, 5)),
  edgeKey(armNodeId("red", 9, 5), armNodeId("green", 1, 5)),
  edgeKey(armNodeId("blue", 1, 5), armNodeId("green", 9, 5)),
]);

const FORT_CANNON_EXIT_BLOCKS = Object.freeze({
  red: new Set([
    directedEdgeKey("C1", armNodeId("blue", 8, 5)),
    directedEdgeKey("C7", armNodeId("green", 2, 5)),
  ]),
  blue: new Set([
    directedEdgeKey("C1", armNodeId("red", 2, 5)),
    directedEdgeKey("C13", armNodeId("green", 8, 5)),
  ]),
  green: new Set([
    directedEdgeKey("C7", armNodeId("red", 8, 5)),
    directedEdgeKey("C13", armNodeId("blue", 2, 5)),
  ]),
});

function terrainBetween(a, b) {
  const key = edgeKey(a, b);
  if (SEA_EDGES.has(key)) return "sea";
  if (MOUNTAIN_EDGES.has(key)) return "mountain";
  if (CITY_EDGES.has(key)) return "city";
  return null;
}

const lineMembership = new Map();
for (const entry of SLIDING_LINES) {
  entry.nodes.forEach((node) => {
    if (!lineMembership.has(node)) lineMembership.set(node, []);
    lineMembership.get(node).push(entry);
  });
}

function linesThrough(node) {
  return lineMembership.get(node) || [];
}

function lineRaysFrom(node) {
  const rays = [];
  for (const entry of linesThrough(node)) {
    const indexes = [];
    entry.nodes.forEach((id, index) => { if (id === node) indexes.push(index); });
    for (const index of indexes) {
      const before = entry.nodes.slice(0, index).reverse();
      const after = entry.nodes.slice(index + 1);
      if (before.length) rays.push({ lineId: entry.id, kind: entry.kind, nodes: before });
      if (after.length) rays.push({ lineId: entry.id, kind: entry.kind, nodes: after });
    }
  }
  return rays;
}

const sideMembership = new Map();
for (const entry of SIDEWAYS_LINES) {
  entry.nodes.forEach((node, index) => {
    if (!sideMembership.has(node)) sideMembership.set(node, new Set());
    if (index > 0) sideMembership.get(node).add(entry.nodes[index - 1]);
    if (index < entry.nodes.length - 1) sideMembership.get(node).add(entry.nodes[index + 1]);
  });
}

function sidewaysNeighbors(node) {
  return [...(sideMembership.get(node) || [])];
}

const directNeighbors = new Map();
for (const entry of SLIDING_LINES) {
  for (let index = 0; index < entry.nodes.length - 1; index += 1) {
    const a = entry.nodes[index];
    const b = entry.nodes[index + 1];
    if (!directNeighbors.has(a)) directNeighbors.set(a, new Set());
    if (!directNeighbors.has(b)) directNeighbors.set(b, new Set());
    directNeighbors.get(a).add(b);
    directNeighbors.get(b).add(a);
  }
}

function neighbors(node) {
  return [...(directNeighbors.get(node) || [])];
}

// A faction's "forward" is the direction from that faction's back rank through
// the central network and onward into the opposing arm. The continuation lines
// themselves are the authoritative orientation source.
const forwardMaps = Object.fromEntries(SANYOU_FACTIONS.map((faction) => [faction, new Map()]));

for (const faction of SANYOU_FACTIONS) {
  for (const entry of CONTINUATION_LINES) {
    const first = parseArmNode(entry.nodes[0]);
    const last = parseArmNode(entry.nodes[entry.nodes.length - 1]);
    let oriented = null;
    if (first?.faction === faction && first.rank === 1) oriented = entry.nodes;
    else if (last?.faction === faction && last.rank === 1) oriented = [...entry.nodes].reverse();
    if (!oriented) continue;
    for (let index = 0; index < oriented.length - 1; index += 1) {
      const from = oriented[index];
      const to = oriented[index + 1];
      if (!forwardMaps[faction].has(from)) forwardMaps[faction].set(from, new Set());
      forwardMaps[faction].get(from).add(to);
    }
  }
}

function forwardNeighbors(faction, node) {
  return [...(forwardMaps[faction]?.get(node) || [])];
}

function backwardNeighbors(faction, node) {
  const result = new Set();
  const map = forwardMaps[faction];
  if (!map) return [];
  for (const [from, tos] of map.entries()) {
    if (tos.has(node)) result.add(from);
  }
  return [...result];
}

// Canonical camp ownership for every surviving central point.
//
// Exclusive Red:   C2-C6, C20
// Exclusive Green: C8-C12, C22
// Exclusive Blue:  C14-C18, C24
//
// Shared gates:
// C1  = Red + Blue
// C7  = Red + Green
// C13 = Green + Blue
//
// These memberships drive promotion and "cannot return home" mechanics.
// Shared gates count as home territory for either owning camp, so they do not
// trigger promotion for those camps and remain legal return boundary points.
const CENTER_TERRITORY_CAMPS = Object.freeze({
  C1: Object.freeze(["red", "blue"]),
  C2: Object.freeze(["red"]),
  C3: Object.freeze(["red"]),
  C4: Object.freeze(["red"]),
  C5: Object.freeze(["red"]),
  C6: Object.freeze(["red"]),
  C7: Object.freeze(["red", "green"]),

  C8: Object.freeze(["green"]),
  C9: Object.freeze(["green"]),
  C10: Object.freeze(["green"]),
  C11: Object.freeze(["green"]),
  C12: Object.freeze(["green"]),
  C13: Object.freeze(["green", "blue"]),

  C14: Object.freeze(["blue"]),
  C15: Object.freeze(["blue"]),
  C16: Object.freeze(["blue"]),
  C17: Object.freeze(["blue"]),
  C18: Object.freeze(["blue"]),

  C20: Object.freeze(["red"]),
  C22: Object.freeze(["green"]),
  C24: Object.freeze(["blue"]),
});

function territoryCamps(node) {
  const arm = parseArmNode(node);
  if (arm) return [arm.faction];
  return CENTER_TERRITORY_CAMPS[node] || [];
}

function isOwnTerritory(faction, node) {
  return territoryCamps(node).includes(faction);
}

function isSharedTerritory(node) {
  return territoryCamps(node).length > 1;
}

const ENEMY_CENTER_POINTS = Object.freeze(
  Object.fromEntries(
    SANYOU_FACTIONS.map((faction) => [
      faction,
      new Set(
        Object.entries(CENTER_TERRITORY_CAMPS)
          .filter(([, camps]) => !camps.includes(faction))
          .map(([node]) => node),
      ),
    ]),
  ),
);

function isEnemyTerritory(faction, node) {
  const camps = territoryCamps(node);
  return camps.length > 0 && !camps.includes(faction);
}

function isOwnArm(faction, node) {
  return parseArmNode(node)?.faction === faction;
}

function isArmNode(node) {
  return Boolean(parseArmNode(node));
}

function pathEdgeAllowedForRole(role, from, to, faction = null) {
  const key = edgeKey(from, to);

  if ((role === "chariot" || role === "horse") && SEA_HORSE_CHARIOT_BLOCKS.has(key)) {
    return false;
  }

  if (role === "cannon") {
    if (MOUNTAIN_EDGES.has(key)) return false;
    if (FORT_DIRECT_CANNON_BLOCKS.has(key)) return false;
    if (faction && FORT_CANNON_EXIT_BLOCKS[faction]?.has(directedEdgeKey(from, to))) {
      return false;
    }
  }

  return true;
}

const SANYOU_TOPOLOGY_DEBUG = Object.freeze({
  CENTER_TERRITORY_CAMPS,
  SEA_EDGES,
  SEA_HORSE_CHARIOT_BLOCKS,
  MOUNTAIN_EDGES,
  CITY_EDGES,
  FORT_DIRECT_CANNON_BLOCKS,
  FORT_CANNON_EXIT_BLOCKS,
});


/*
 * San You Qi — Three Friends Chess
 *
 * This engine uses the finalized Arctic Dominion board: 135 coloured arm
 * intersections plus 21 surviving central C-points (C1-C18, C20, C22, C24).
 * Unlike Sanguo Qi, river continuations are not direct mirrored file jumps;
 * every approved C-point is a real playable node and the three long central
 * horizontal lines are part of the movement graph.
 */

const GAME_ID = "san-you-qi";
const RULESET_VERSION = "arctic-final-156-node-3.3.4";

const FACTIONS = Object.freeze([...SANYOU_FACTIONS]);
const FACTION_LABELS = Object.freeze({
  red: "Shu / Red",
  green: "Wu / Green",
  blue: "Wei / Blue",
});
const FACTION_COLORS = Object.freeze({
  red: "#ef5a4d",
  green: "#43b86a",
  blue: "#318eed",
});

const ROLES = Object.freeze([
  "general", "advisor", "elephant", "horse", "chariot", "cannon", "soldier", "fire", "flag",
]);

const ROLE_LABELS = Object.freeze({
  general: "General",
  advisor: "Guard",
  elephant: "Elephant",
  horse: "Horse",
  chariot: "Chariot",
  cannon: "Cannon",
  soldier: "Soldier",
  fire: "Fire",
  flag: "Flag",
});

const TURN_ORDER = Object.freeze(["red", "green", "blue"]);

const PALACE_LANES = new Set([4, 5, 6]);
const PALACE_RANKS = new Set([1, 2, 3]);
const PALACE_DIAGONAL_NEIGHBORS = Object.freeze({
  "L4-1": ["L5-2"],
  "L6-1": ["L5-2"],
  "L5-2": ["L4-1", "L6-1", "L4-3", "L6-3"],
  "L4-3": ["L5-2"],
  "L6-3": ["L5-2"],
});

const STANDARD_OPENING = Object.freeze([
  ["chariot", 1, 1],
  ["horse", 2, 1],
  ["elephant", 3, 1],
  ["advisor", 4, 1],
  ["general", 5, 1],
  ["advisor", 6, 1],
  ["elephant", 7, 1],
  ["horse", 8, 1],
  ["chariot", 9, 1],

  ["cannon", 2, 3],
  ["flag", 4, 3],
  ["flag", 6, 3],
  ["cannon", 8, 3],

  ["soldier", 1, 4],
  ["fire", 3, 4],
  ["soldier", 5, 4],
  ["fire", 7, 4],
  ["soldier", 9, 4],
]);

function clone(value) {
  return typeof structuredClone === "function"
    ? structuredClone(value)
    : JSON.parse(JSON.stringify(value));
}

function squareKey(node) {
  return typeof node === "string" ? node : "";
}

function sameNode(a, b) {
  return squareKey(a) === squareKey(b);
}

function logicalNode(sector, legacyRank, legacyFile) {
  // Backwards-compatible helper for older tests/tools:
  // legacy rank 4..0 maps to visible suffix 1..5; file 0..8 maps to L1..L9.
  return armNodeId(sector, legacyFile + 1, 5 - legacyRank);
}

function nodeFromLabel(sector, lane, rank) {
  return armNodeId(sector, lane, rank);
}

function insideSector(node) {
  return Boolean(parseArmNode(node));
}

function isHome(node, faction) {
  return isOwnTerritory(faction, node);
}

function isRiverEndpoint(node) {
  return parseArmNode(node)?.rank === 5;
}

function territoryOf(node, faction) {
  if (isOwnTerritory(faction, node)) {
    return isSharedTerritory(node) ? "shared-own" : "own";
  }
  if (isEnemyTerritory(faction, node)) return "enemy";
  return "neutral";
}

function terrainAt(node) {
  // Terrain is edge-based on the finalized board; a point itself is not terrain.
  if (!ALL_NODE_IDS.includes(node)) return null;
  return null;
}

function pieceAtUnchecked(pieces, node) {
  return pieces.find((piece) => piece.status === "board" && piece.node === node) || null;
}

function destinationOpenFor(piece, pieces, node) {
  const hit = pieceAtUnchecked(pieces, node);
  return !hit || hit.owner !== piece.owner;
}

function insidePalace(node, faction) {
  const arm = parseArmNode(node);
  return Boolean(
    arm &&
    arm.faction === faction &&
    PALACE_LANES.has(arm.lane) &&
    PALACE_RANKS.has(arm.rank)
  );
}

function localArmTarget(node, dRank, dLane) {
  const arm = parseArmNode(node);
  if (!arm) return null;
  const lane = arm.lane + dLane;
  const rank = arm.rank + dRank;
  if (lane < 1 || lane > 9 || rank < 1 || rank > 5) return null;
  return armNodeId(arm.faction, lane, rank);
}

function dedupeNodes(nodes) {
  return [...new Set(nodes)];
}

function rayTargets(piece, pieces, mode) {
  const out = new Set();

  for (const ray of lineRaysFrom(piece.node)) {
    let previous = piece.node;
    let screened = false;

    for (const node of ray.nodes) {
      if (!pathEdgeAllowedForRole(piece.role, previous, node, piece.faction)) break;

      const hit = pieceAtUnchecked(pieces, node);

      if (mode === "chariot") {
        if (!hit) {
          out.add(node);
        } else {
          if (hit.owner !== piece.owner) out.add(node);
          break;
        }
      } else {
        // Cannon: unrestricted non-capture movement until the first screen;
        // after exactly one screen, the next occupied point may be captured.
        if (!screened) {
          if (hit) screened = true;
          else out.add(node);
        } else if (hit) {
          if (hit.owner !== piece.owner) out.add(node);
          break;
        }
      }

      previous = node;
    }
  }

  return [...out];
}

function chariotTargets(piece, pieces) {
  return rayTargets(piece, pieces, "chariot");
}

function cannonTargets(piece, pieces) {
  return rayTargets(piece, pieces, "cannon");
}

function generalTargets(piece, pieces) {
  const arm = parseArmNode(piece.node);
  if (!arm || !insidePalace(piece.node, piece.faction)) return [];

  const out = [];
  for (const [dRank, dLane] of [[-1,0],[1,0],[0,-1],[0,1]]) {
    const target = localArmTarget(piece.node, dRank, dLane);
    if (!target || !insidePalace(target, piece.faction)) continue;
    if (destinationOpenFor(piece, pieces, target)) out.push(target);
  }

  // Flying-General attack geometry. On any approved straight continuation
  // line, two opposing Generals may not face each other with no intervening
  // piece. A pinned blocker therefore cannot legally leave that line.
  for (const ray of lineRaysFrom(piece.node)) {
    if (ray.kind === "horizontal") continue;
    for (const node of ray.nodes) {
      const hit = pieceAtUnchecked(pieces, node);
      if (!hit) continue;
      if (hit.role === "general" && hit.owner !== piece.owner) out.push(node);
      break;
    }
  }

  return dedupeNodes(out);
}

function advisorTargets(piece, pieces) {
  if (!insidePalace(piece.node, piece.faction)) return [];
  const arm = parseArmNode(piece.node);
  const key = `L${arm.lane}-${arm.rank}`;
  const candidates = PALACE_DIAGONAL_NEIGHBORS[key] || [];
  return candidates
    .map((label) => `${piece.faction}:${label}`)
    .filter((target) => destinationOpenFor(piece, pieces, target));
}

function elephantTargets(piece, pieces) {
  const arm = parseArmNode(piece.node);
  if (!arm || arm.faction !== piece.faction) return [];

  const out = [];
  for (const dRank of [-2, 2]) {
    for (const dLane of [-2, 2]) {
      const target = localArmTarget(piece.node, dRank, dLane);
      if (!target) continue;
      const targetArm = parseArmNode(target);
      if (!targetArm || targetArm.faction !== piece.faction) continue;
      const eye = localArmTarget(piece.node, dRank / 2, dLane / 2);
      if (!eye || pieceAtUnchecked(pieces, eye)) continue;
      if (destinationOpenFor(piece, pieces, target)) out.push(target);
    }
  }
  return out;
}

function normalizedVector(a, b) {
  const pa = boardPoint(a);
  const pb = boardPoint(b);
  if (!pa || !pb) return null;
  const dx = pb[0] - pa[0];
  const dy = pb[1] - pa[1];
  const length = Math.hypot(dx, dy);
  if (!length) return null;
  return [dx / length, dy / length];
}

function roughlyPerpendicular(a, b, c) {
  const first = normalizedVector(a, b);
  const second = normalizedVector(b, c);
  if (!first || !second) return false;
  return Math.abs(first[0] * second[0] + first[1] * second[1]) < 0.58;
}

const HORSE_CENTER_JUMPS = Object.freeze({
  [armNodeId("red", 4, 5)]: Object.freeze([{ target: "C20", leg: "C3" }]),
  [armNodeId("red", 6, 5)]: Object.freeze([{ target: "C20", leg: "C5" }]),
  C20: Object.freeze([
    { target: armNodeId("red", 4, 5), leg: "C4" },
    { target: armNodeId("red", 6, 5), leg: "C4" },
  ]),

  [armNodeId("green", 4, 5)]: Object.freeze([{ target: "C22", leg: "C9" }]),
  [armNodeId("green", 6, 5)]: Object.freeze([{ target: "C22", leg: "C11" }]),
  C22: Object.freeze([
    { target: armNodeId("green", 4, 5), leg: "C10" },
    { target: armNodeId("green", 6, 5), leg: "C10" },
  ]),

  [armNodeId("blue", 4, 5)]: Object.freeze([{ target: "C24", leg: "C15" }]),
  [armNodeId("blue", 6, 5)]: Object.freeze([{ target: "C24", leg: "C17" }]),
  C24: Object.freeze([
    { target: armNodeId("blue", 4, 5), leg: "C16" },
    { target: armNodeId("blue", 6, 5), leg: "C16" },
  ]),
});

function horseTargets(piece, pieces) {
  const out = new Set();

  // A Xiangqi horse is represented as two units on one orthogonal line plus
  // one unit on a perpendicular line. The first unit is the blockable "leg".
  for (const ray of lineRaysFrom(piece.node)) {
    if (ray.nodes.length < 2) continue;
    const leg = ray.nodes[0];
    const second = ray.nodes[1];

    if (pieceAtUnchecked(pieces, leg)) continue;

    // The Sea restriction applies to the Horse's first orthogonal leg only.
    // A Sea edge used as the second straight unit or the final turning unit
    // does not "block the horse leg". This matters at the three extended-river
    // links such as Red L4-5 -> C3 -> C17 -> C18.
    if (!pathEdgeAllowedForRole("horse", piece.node, leg, piece.faction)) continue;

    for (const turnLine of linesThrough(second)) {
      for (const direction of [-1, 1]) {
        const index = turnLine.nodes.indexOf(second);
        if (index < 0) continue;
        const target = turnLine.nodes[index + direction];
        if (!target || target === leg || target === piece.node) continue;
        if (!roughlyPerpendicular(leg, second, target)) continue;
        if (destinationOpenFor(piece, pieces, target)) out.add(target);
      }
    }
  }

  // The triangular center has three compressed Horse destinations that are
  // not representable as a simple 2+1 walk over SLIDING_LINES. They are still
  // ordinary blocked Horse jumps: the listed first leg must be clear.
  for (const jump of HORSE_CENTER_JUMPS[piece.node] || []) {
    if (pieceAtUnchecked(pieces, jump.leg)) continue;
    if (!pathEdgeAllowedForRole("horse", piece.node, jump.leg, piece.faction)) continue;
    if (destinationOpenFor(piece, pieces, jump.target)) out.add(jump.target);
  }

  return [...out];
}

function diagonalForwardTargets(piece, pieces) {
  const byForwardThenSide = new Set();
  const bySideThenForward = new Set();

  for (const forward of forwardNeighbors(piece.faction, piece.node)) {
    for (const target of sidewaysNeighbors(forward)) {
      if (target !== piece.node) byForwardThenSide.add(target);
    }
  }

  for (const side of sidewaysNeighbors(piece.node)) {
    for (const target of forwardNeighbors(piece.faction, side)) {
      if (target !== piece.node) bySideThenForward.add(target);
    }
  }

  const intersection = [...byForwardThenSide].filter((node) => bySideThenForward.has(node));
  const candidates = intersection.length
    ? intersection
    : [...new Set([...byForwardThenSide, ...bySideThenForward])];

  return candidates.filter((target) => destinationOpenFor(piece, pieces, target));
}

// The arm-side Fort seams have six additional forward diagonals that are not
// recoverable reliably from the generic forward/side graph intersection.
const FIRE_FORT_EXTRA_DIAGONALS = Object.freeze({
  red: Object.freeze({
    [armNodeId("red", 2, 5)]: Object.freeze([armNodeId("blue", 9, 5)]),
    [armNodeId("red", 8, 5)]: Object.freeze([armNodeId("green", 1, 5)]),
  }),

  green: Object.freeze({
    [armNodeId("green", 2, 5)]: Object.freeze([armNodeId("red", 9, 5)]),
    [armNodeId("green", 8, 5)]: Object.freeze([armNodeId("blue", 1, 5)]),
  }),

  blue: Object.freeze({
    [armNodeId("blue", 2, 5)]: Object.freeze([armNodeId("green", 9, 5)]),
    [armNodeId("blue", 8, 5)]: Object.freeze([armNodeId("red", 1, 5)]),
  }),
});

// At the six inner Fort-adjacent C-points, the board geometry is authoritative.
// These are the exact two forward-diagonal Fire destinations for each faction.
// Do not infer an arm destination from the old compressed-junction heuristic.
const FIRE_CENTER_EXACT_DIAGONALS = Object.freeze({
  red: Object.freeze({
    C2: Object.freeze(["C1", "C17"]),
    C6: Object.freeze(["C7", "C9"]),
  }),

  green: Object.freeze({
    C8: Object.freeze(["C5", "C7"]),
    C12: Object.freeze(["C13", "C15"]),
  }),

  blue: Object.freeze({
    C14: Object.freeze(["C13", "C11"]),
    C18: Object.freeze(["C1", "C3"]),
  }),
});

function fireTargets(piece, pieces) {
  const exactCenterTargets = FIRE_CENTER_EXACT_DIAGONALS[piece.faction]?.[piece.node];
  if (exactCenterTargets) {
    return exactCenterTargets.filter((target) => destinationOpenFor(piece, pieces, target));
  }

  const out = new Set(diagonalForwardTargets(piece, pieces));

  for (const target of FIRE_FORT_EXTRA_DIAGONALS[piece.faction]?.[piece.node] || []) {
    if (destinationOpenFor(piece, pieces, target)) out.add(target);
  }

  return [...out];
}

function soldierTargets(piece, pieces) {
  const out = new Set();

  for (const target of forwardNeighbors(piece.faction, piece.node)) {
    if (destinationOpenFor(piece, pieces, target)) out.add(target);
  }

  if (piece.promoted) {
    for (const target of sidewaysNeighbors(piece.node)) {
      if (destinationOpenFor(piece, pieces, target)) out.add(target);
    }
  }

  return [...out];
}

function twoStepForwardTargets(piece, pieces) {
  const out = new Set();
  const firstSteps = forwardNeighbors(piece.faction, piece.node);

  for (const middle of firstSteps) {
    if (pieceAtUnchecked(pieces, middle)) continue;
    for (const target of forwardNeighbors(piece.faction, middle)) {
      if (target === piece.node) continue;
      if (destinationOpenFor(piece, pieces, target)) out.add(target);
    }
  }

  return [...out];
}

function foreignFlagTargets(piece, pieces) {
  const out = new Set();

  // After crossing into enemy territory the Flag becomes Chariot-like, but it
  // may not re-enter its own exclusive territory. The three shared Fort gates
  // are a deliberate exception: a Flag may return to C1/C7/C13 when that gate
  // belongs to its original camp, but the gate is a stopping boundary and the
  // Flag may not continue beyond it into exclusive home territory.
  for (const ray of lineRaysFrom(piece.node)) {
    for (const node of ray.nodes) {
      const ownTerritory = isOwnTerritory(piece.faction, node);
      const sharedHomeGate = ownTerritory && isSharedTerritory(node);

      if (ownTerritory && !sharedHomeGate) break;

      const hit = pieceAtUnchecked(pieces, node);
      if (!hit) {
        out.add(node);
      } else {
        if (hit.owner !== piece.owner) out.add(node);
        break;
      }

      if (sharedHomeGate) break;
    }
  }

  return [...out];
}

function flagTargets(piece, pieces) {
  return piece.leftHome
    ? foreignFlagTargets(piece, pieces)
    : twoStepForwardTargets(piece, pieces);
}

function pseudoTargetsFor(piece, state) {
  if (!piece || piece.status !== "board") return [];

  switch (piece.role) {
    case "general": return generalTargets(piece, state.pieces);
    case "advisor": return advisorTargets(piece, state.pieces);
    case "elephant": return elephantTargets(piece, state.pieces);
    case "horse": return horseTargets(piece, state.pieces);
    case "chariot": return chariotTargets(piece, state.pieces);
    case "cannon": return cannonTargets(piece, state.pieces);
    case "soldier": return soldierTargets(piece, state.pieces);
    case "fire": return fireTargets(piece, state.pieces);
    case "flag": return flagTargets(piece, state.pieces);
    default: return [];
  }
}

function getPseudoTargets(state, pieceOrId) {
  const piece = typeof pieceOrId === "string"
    ? state.pieces.find((item) => item.id === pieceOrId)
    : pieceOrId;
  return pseudoTargetsFor(piece, state);
}

function pieceAt(state, node) {
  return pieceAtUnchecked(state.pieces, node);
}

function generalOf(state, faction) {
  return state.pieces.find(
    (piece) =>
      piece.faction === faction &&
      piece.role === "general" &&
      piece.status === "board",
  ) || null;
}

function activeOpponents(state, faction) {
  return state.activeFactions.filter((candidate) => candidate !== faction);
}

function isGeometricallyAttacked(state, node, byFaction) {
  return state.pieces.some(
    (piece) =>
      piece.status === "board" &&
      piece.owner === byFaction &&
      pseudoTargetsFor(piece, state).some((target) => target === node),
  );
}

function checkingFactions(state, faction) {
  const general = generalOf(state, faction);
  if (!general) return [];
  return activeOpponents(state, faction).filter((opponent) =>
    isGeometricallyAttacked(state, general.node, opponent),
  );
}

function isInCheck(state, faction) {
  return checkingFactions(state, faction).length > 0;
}

function previewMove(state, piece, target) {
  const next = clone(state);
  const moving = next.pieces.find((candidate) => candidate.id === piece.id);
  const victim = next.pieces.find(
    (candidate) => candidate.status === "board" && candidate.node === target,
  );

  if (victim) {
    victim.status = "captured";
    victim.node = null;
  }

  moving.node = target;
  moving.hasMoved = true;

  // Crossing a central point owned by the piece's own camp does not count as
  // leaving home. C1/C7/C13 likewise remain home for their two owning camps.
  // The state becomes permanent only after the piece actually enters enemy
  // territory.
  if (isEnemyTerritory(moving.faction, target)) moving.leftHome = true;

  if (moving.role === "soldier" && isEnemyTerritory(moving.faction, target)) {
    moving.promoted = true;
  }

  return next;
}

function legalTargetsFor(piece, state) {
  const out = [];
  for (const target of pseudoTargetsFor(piece, state)) {
    const victim = pieceAt(state, target);
    if (victim?.owner === piece.owner) continue;

    // Generals are defeated by checkmate/appropriation, not direct capture.
    if (victim?.role === "general" && victim.owner !== piece.owner) continue;

    const preview = previewMove(state, piece, target);
    if (isInCheck(preview, piece.owner)) continue;
    out.push(target);
  }
  return dedupeNodes(out);
}

function baseMoveActions(state, faction) {
  const actions = [];
  for (const piece of state.pieces.filter(
    (candidate) => candidate.owner === faction && candidate.status === "board",
  )) {
    for (const target of legalTargetsFor(piece, state)) {
      const victim = pieceAt(state, target);
      actions.push({
        type: "move",
        pieceId: piece.id,
        from: piece.node,
        to: target,
        captured: victim?.id || null,
      });
    }
  }
  return actions;
}

function positionKey(state) {
  const pieces = state.pieces
    .map((piece) => [
      piece.id,
      piece.faction,
      piece.owner,
      piece.role,
      piece.status,
      piece.node || "",
      piece.promoted ? 1 : 0,
      piece.leftHome ? 1 : 0,
    ])
    .sort((a, b) => a[0].localeCompare(b[0]));

  return JSON.stringify([
    state.turn,
    state.resumeTurn || "",
    [...state.activeFactions].sort(),
    pieces,
  ]);
}

function generateFor(state, faction, options = {}) {
  if (state.phase !== "play" || state.outcome) return [];
  const candidates = baseMoveActions(state, faction);

  if (options.skipRepetition) return candidates;

  return candidates.filter((action) => {
    const moving = state.pieces.find((piece) => piece.id === action.pieceId);
    const preview = previewMove(state, moving, action.to);
    return !state.repetition[positionKey(preview)];
  });
}

function getLegalActions(state) {
  const error = stateInvariantError(state);
  if (error || state.phase !== "play" || state.outcome) return [];
  return generateFor(state, state.turn);
}

function hasLegalMove(state, faction) {
  return generateFor(state, faction, { skipRepetition: true }).length > 0;
}

function nextFaction(state, actor) {
  const start = TURN_ORDER.indexOf(actor);
  for (let offset = 1; offset <= TURN_ORDER.length; offset += 1) {
    const faction = TURN_ORDER[(start + offset) % TURN_ORDER.length];
    if (state.activeFactions.includes(faction)) return faction;
  }
  return actor;
}

function stateInvariantError(state) {
  if (!state || state.gameId !== GAME_ID) {
    return { code: "INVALID_STATE", message: "This is not a San You Qi state." };
  }
  if (state.rulesetVersion !== RULESET_VERSION) {
    return {
      code: "RULESET_MISMATCH",
      message: `Expected San You Qi ruleset ${RULESET_VERSION}.`,
    };
  }
  if (
    !FACTIONS.includes(state.turn) ||
    !Array.isArray(state.activeFactions) ||
    !state.activeFactions.includes(state.turn)
  ) {
    return { code: "INVALID_STATE", message: "The active turn is malformed." };
  }
  if (!Array.isArray(state.pieces) || !state.repetition) {
    return { code: "INVALID_STATE", message: "The match state is incomplete." };
  }
  if (
    state.resumeTurn != null &&
    (!FACTIONS.includes(state.resumeTurn) || !state.activeFactions.includes(state.resumeTurn))
  ) {
    return { code: "INVALID_STATE", message: "The interrupted turn state is malformed." };
  }

  const pieceIds = new Set();
  const occupied = new Set();

  for (const piece of state.pieces) {
    if (
      !piece ||
      typeof piece.id !== "string" ||
      pieceIds.has(piece.id) ||
      !FACTIONS.includes(piece.faction) ||
      !FACTIONS.includes(piece.owner) ||
      !ROLES.includes(piece.role) ||
      !["board", "captured", "eliminated"].includes(piece.status)
    ) {
      return { code: "INVALID_STATE", message: "A piece record is malformed." };
    }

    pieceIds.add(piece.id);

    if (piece.status === "board") {
      if (!ALL_NODE_IDS.includes(piece.node) || occupied.has(piece.node)) {
        return { code: "INVALID_STATE", message: "Board occupancy is malformed." };
      }
      occupied.add(piece.node);
    }
  }

  return null;
}

function validateAction(state, action) {
  const error = stateInvariantError(state);
  if (error) return { ok: false, error };
  if (state.outcome) {
    return { ok: false, error: { code: "GAME_OVER", message: "The match has already ended." } };
  }

  const match = getLegalActions(state).find(
    (candidate) =>
      candidate.type === action?.type &&
      candidate.pieceId === action?.pieceId &&
      candidate.from === action?.from &&
      candidate.to === action?.to,
  );

  return match
    ? { ok: true, action: match }
    : { ok: false, error: { code: "ILLEGAL_ACTION", message: "That action is not legal in the current position." } };
}

function applyAction(state, proposed) {
  const validation = validateAction(state, proposed);
  if (!validation.ok) return { state, error: validation.error };

  const action = validation.action;
  const actor = state.turn;
  const movingBefore = state.pieces.find((piece) => piece.id === action.pieceId);
  const next = previewMove(state, movingBefore, action.to);

  next.ply += 1;
  next.lastAction = { ...action, actor, ply: next.ply };

  const checked = next.activeFactions.filter(
    (faction) => faction !== actor && isInCheck(next, faction),
  );
  const mated = checked.filter((faction) => !hasLegalMove(next, faction));

  if (mated.length) {
    const mateWinners = new Map();

    for (const defeated of mated) {
      const checkers = checkingFactions(next, defeated);
      // Credit the army to the faction whose piece actually gives mate.
      // If the mover is one of the checking factions, it keeps precedence.
      // This also handles a third-party discovered check: e.g. Blue uncovers
      // a Red Cannon attack on Green, so Red — not Blue — is the mating side.
      const victor = checkers.includes(actor) ? actor : (checkers[0] || actor);
      mateWinners.set(defeated, victor);

      const general = generalOf(next, defeated);
      if (general) {
        general.status = "eliminated";
        general.node = null;
      }

      for (const piece of next.pieces) {
        if (
          piece.faction === defeated &&
          piece.status === "board" &&
          piece.role !== "general"
        ) {
          piece.owner = victor;
        }
      }

      next.activeFactions = next.activeFactions.filter((faction) => faction !== defeated);
    }

    next.resumeTurn = null;

    if (next.activeFactions.length <= 1) {
      const winner = next.activeFactions[0] || mateWinners.values().next().value || actor;
      next.outcome = {
        type: "mate",
        winner,
        losers: mated,
        message: `${FACTION_LABELS[winner]} wins — last surviving General.`,
      };
      next.phase = "complete";
    } else {
      const victors = [...new Set(mated.map((faction) => mateWinners.get(faction)))];
      next.turn = victors.find((faction) => next.activeFactions.includes(faction))
        || nextFaction(next, actor);
      next.note = mated
        .map((faction) => `${FACTION_LABELS[mateWinners.get(faction)]} checkmates ${FACTION_LABELS[faction]}`)
        .join(" · ");
    }
  } else if (checked.length) {
    // Check interrupts the ordinary three-player cycle. The checked kingdom
    // must answer immediately; the turn that would normally have followed is
    // remembered and resumes after the check is resolved.
    const ordinaryNext = state.resumeTurn && next.activeFactions.includes(state.resumeTurn)
      ? state.resumeTurn
      : nextFaction(next, actor);

    const checkedSet = new Set(checked);
    let responder = ordinaryNext;
    if (!checkedSet.has(responder)) {
      const start = TURN_ORDER.indexOf(actor);
      responder = null;
      for (let offset = 1; offset <= TURN_ORDER.length; offset += 1) {
        const candidate = TURN_ORDER[(start + offset) % TURN_ORDER.length];
        if (checkedSet.has(candidate)) {
          responder = candidate;
          break;
        }
      }
      responder ||= checked[0];
    }

    next.turn = responder;
    next.resumeTurn = responder === ordinaryNext ? null : ordinaryNext;
    const checkers = checkingFactions(next, responder);
    next.note = `${FACTION_LABELS[responder]} is in check${checkers.length ? ` by ${checkers.map((faction) => FACTION_LABELS[faction]).join(" and ")}` : ""} — respond immediately.`;
  } else {
    const resumed = state.resumeTurn && next.activeFactions.includes(state.resumeTurn)
      ? state.resumeTurn
      : null;
    next.turn = resumed || nextFaction(next, actor);
    next.resumeTurn = null;
    next.note = `${FACTION_LABELS[next.turn]} to move.`;
  }

  next.repetition[positionKey(next)] = actor;
  return { state: next, error: null };
}

function setupPieces() {
  const pieces = [];

  for (const faction of FACTIONS) {
    const counts = {};

    for (const [role, lane, rank] of STANDARD_OPENING) {
      counts[role] = (counts[role] || 0) + 1;
      pieces.push({
        id: `${faction}-${role}-${counts[role]}`,
        faction,
        owner: faction,
        role,
        node: armNodeId(faction, lane, rank),
        status: "board",
        promoted: false,
        leftHome: false,
        hasMoved: false,
      });
    }
  }

  return pieces;
}

function createInitialState() {
  const state = {
    gameId: GAME_ID,
    rulesetVersion: RULESET_VERSION,
    phase: "play",
    turn: "red",
    activeFactions: [...FACTIONS],
    pieces: setupPieces(),
    outcome: null,
    lastAction: null,
    note: "Shu / Red opens. Turns proceed Red → Green → Blue.",
    ply: 0,
    resumeTurn: null,
    repetition: {},
  };

  state.repetition[positionKey(state)] = "initial";
  return state;
}

function getBoardPiece(state, node) {
  return pieceAtUnchecked(state.pieces, node);
}

function allNodes() {
  return [...ALL_NODE_IDS];
}

function getNodeLabel(node) {
  return nodeLabel(node);
}

function getNodePoint(node) {
  return boardPoint(node);
}

function hasPromotedSoldier(piece) {
  return piece.role === "soldier" && Boolean(piece.promoted);
}

const __testing = Object.freeze({
  TURN_ORDER,
  STANDARD_OPENING,
  PALACE_LANES,
  PALACE_RANKS,
  CONTINUATION_LINES,
  SIDEWAYS_LINES,
  pieceAtUnchecked,
  insidePalace,
  parseArmNode,
  forwardNeighbors,
  backwardNeighbors,
  sidewaysNeighbors,
  terrainBetween,
  pathEdgeAllowedForRole,
  checkingFactions,
  isEnemyTerritory,
  isOwnTerritory,
  isSharedTerritory,
  territoryCamps,
  FIRE_FORT_EXTRA_DIAGONALS,
  FIRE_CENTER_EXACT_DIAGONALS,
  isCenterNode,
  isArmNode,
});


/**
 * San You Qi is not zero-sum while three kingdoms are alive.
 *
 * Medium / Hard therefore use MaxN while all three kingdoms remain so each
 * player is assumed to maximize its own position, not cooperate in a fictional
 * coalition against the root player. After one kingdom is eliminated the game
 * becomes genuinely two-player and Hard switches to alpha-beta.
 */
const BOT_LEVELS = Object.freeze({
  easy: Object.freeze({
    label: "Easy",
    description: "Varied legal moves with a light preference for captures.",
    search: "random",
    depth: 1,
    beam: 6,
    rootBeam: 8,
    qDepth: 0,
    qBeam: 0,
    budgetMs: 140,
    tableSize: 0,
  }),
  medium: Object.freeze({
    label: "Medium",
    description: "Independent three-kingdom tactical search with checks, recaptures and promotion threats.",
    search: "maxn",
    depth: 4,
    beam: 14,
    rootBeam: 28,
    qDepth: 2,
    qBeam: 10,
    budgetMs: 2800,
    tableSize: 50000,
  }),
  hard: Object.freeze({
    label: "Hard",
    description: "Deep MaxN strategy; converts to alpha-beta after one kingdom falls. No deliberate mistakes.",
    search: "hybrid",
    depth: 6,
    beam: 20,
    rootBeam: 42,
    qDepth: 4,
    qBeam: 16,
    budgetMs: 10500,
    tableSize: 220000,
  }),
});

const SAN_YOU_EVAL_WEIGHTS = Object.freeze({
  strongestRival: 0.34,
  secondRival: 0.16,
  promotedSoldier: 165,
  crossedFlag: 285,
  enemyTerritory: 24,
  sharedGateOccupancy: 42,
  innerSeaOccupancy: 38,
  centralOccupancy: 16,
  currentMobility: 2.1,
  check: 1450,
  checkToMove: 650,
  checkingMove: 380,
  activeOpponentEliminated: 6800,
  ownEliminated: 1_500_000,
});

const PIECE_VALUE = Object.freeze({
  general: 50000,
  chariot: 1100,
  cannon: 620,
  horse: 540,
  flag: 470,
  fire: 360,
  elephant: 260,
  advisor: 255,
  soldier: 145,
});

const SHARED_GATES = new Set(["C1", "C7", "C13"]);
const INNER_SEA = new Set(["C20", "C22", "C24"]);
const MATE_SCORE = 50_000_000;
const INF = 100_000_000;

const actionKey = (action) =>
  `${action?.pieceId || ""}|${action?.from || ""}|${action?.to || ""}`;

function nowMs() {
  return typeof performance !== "undefined" && performance.now
    ? performance.now()
    : Date.now();
}

function pieceValue(piece) {
  let value = PIECE_VALUE[piece.role] || 0;
  if (piece.role === "soldier" && piece.promoted) value += 180;
  if (piece.role === "flag" && piece.leftHome) value += 300;
  return value;
}

function boardKey(state) {
  const pieces = state.pieces
    .filter((piece) => piece.status === "board")
    .map((piece) =>
      `${piece.id}:${piece.owner}:${piece.node}:${piece.promoted ? 1 : 0}:${piece.leftHome ? 1 : 0}`,
    )
    .sort()
    .join(";");

  return [
    state.turn,
    state.resumeTurn || "",
    state.activeFactions.join(","),
    state.ply || 0,
    Object.keys(state.repetition || {}).length,
    pieces,
  ].join("|");
}

function terminalVector(state) {
  if (!state.outcome) return null;
  return Object.fromEntries(
    FACTIONS.map((faction) => [
      faction,
      state.outcome.winner === faction ? MATE_SCORE : -MATE_SCORE,
    ]),
  );
}

function staticVector(state, weights = SAN_YOU_EVAL_WEIGHTS) {
  const terminal = terminalVector(state);
  if (terminal) return terminal;

  const raw = Object.fromEntries(FACTIONS.map((faction) => [faction, 0]));

  for (const faction of FACTIONS) {
    if (!state.activeFactions.includes(faction)) {
      raw[faction] = -weights.ownEliminated;
    }
  }

  for (const piece of state.pieces) {
    if (piece.status !== "board") continue;

    const owner = piece.owner;
    let value = pieceValue(piece);

    if (piece.role === "soldier" && piece.promoted) {
      value += weights.promotedSoldier;
    }
    if (piece.role === "flag" && piece.leftHome) {
      value += weights.crossedFlag;
    }

    if (territoryOf(piece.node, piece.faction) === "enemy") {
      value += weights.enemyTerritory;
    }
    if (piece.node?.startsWith("C")) value += weights.centralOccupancy;
    if (SHARED_GATES.has(piece.node)) value += weights.sharedGateOccupancy;
    if (INNER_SEA.has(piece.node)) value += weights.innerSeaOccupancy;

    raw[owner] += value;
  }

  const scores = { ...raw };

  for (const faction of FACTIONS) {
    if (!state.activeFactions.includes(faction)) continue;

    const rivals = FACTIONS
      .filter((candidate) => candidate !== faction && state.activeFactions.includes(candidate))
      .map((candidate) => raw[candidate])
      .sort((a, b) => b - a);

    if (rivals[0] != null) scores[faction] -= rivals[0] * weights.strongestRival;
    if (rivals[1] != null) scores[faction] -= rivals[1] * weights.secondRival;

    const defeatedOpponents = FACTIONS.filter(
      (candidate) => candidate !== faction && !state.activeFactions.includes(candidate),
    ).length;
    scores[faction] += defeatedOpponents * weights.activeOpponentEliminated;

    if (isInCheck(state, faction)) {
      scores[faction] -= weights.check;
      if (state.turn === faction) scores[faction] -= weights.checkToMove;
    }
  }

  if (
    state.lastAction?.actor &&
    state.activeFactions.includes(state.lastAction.actor)
  ) {
    const checkedRivals = FACTIONS.filter(
      (faction) =>
        faction !== state.lastAction.actor &&
        state.activeFactions.includes(faction) &&
        isInCheck(state, faction),
    ).length;
    scores[state.lastAction.actor] += checkedRivals * weights.checkingMove;
  }

  return scores;
}

function evaluateVector(state, context) {
  const key = boardKey(state);
  const cached = context.evalCache.get(key);
  if (cached) {
    context.evalHits += 1;
    return cached;
  }

  const scores = staticVector(state, context.weights);

  // Mobility is useful, but generating all three kingdoms' legal move sets at
  // every leaf is prohibitively expensive. Reward the actual side-to-move's
  // choices, which also makes cramped / checked positions evaluate correctly.
  if (!state.outcome && state.activeFactions.includes(state.turn)) {
    const mobility = getLegalActions(state).length;
    scores[state.turn] += Math.min(70, mobility) * context.weights.currentMobility;
  }

  if (context.evalCache.size >= context.level.tableSize) {
    const first = context.evalCache.keys().next();
    if (!first.done) context.evalCache.delete(first.value);
  }
  context.evalCache.set(key, scores);
  return scores;
}

function evaluateSanYouState(
  state,
  faction,
  weights = SAN_YOU_EVAL_WEIGHTS,
) {
  const fakeContext = {
    weights,
    level: { tableSize: 2000 },
    evalCache: new Map(),
    evalHits: 0,
  };
  return evaluateVector(state, fakeContext)[faction];
}

function capturedPiece(state, action) {
  if (!action?.captured) return null;
  return state.pieces.find((piece) => piece.id === action.captured) || null;
}

function movePromotionBonus(state, action) {
  const moving = state.pieces.find((piece) => piece.id === action.pieceId);
  if (!moving) return 0;

  if (moving.role === "soldier" && !moving.promoted) {
    return territoryOf(action.to, moving.faction) === "enemy" ? 1 : 0;
  }
  if (moving.role === "flag" && !moving.leftHome) {
    return territoryOf(action.to, moving.faction) === "enemy" ? 1 : 0;
  }
  return 0;
}

function movePriority(state, action, actor, context, ply, preferred = "") {
  const moving = state.pieces.find((piece) => piece.id === action.pieceId);
  const victim = capturedPiece(state, action);
  const key = actionKey(action);

  let score = 0;
  if (key === preferred) score += 9_000_000;

  if (victim) {
    // MVV/LVA style ordering. Generals are never captured directly.
    score += 2_000_000 + pieceValue(victim) * 140 - pieceValue(moving) * 8;
  }

  if (movePromotionBonus(state, action)) score += 700_000;
  if (INNER_SEA.has(action.to)) score += 18_000;
  if (SHARED_GATES.has(action.to)) score += 16_000;
  else if (action.to?.startsWith("C")) score += 9_000;

  const killers = context.killers.get(`${actor}:${ply}`) || [];
  if (killers.includes(key)) score += 500_000;
  score += context.history.get(`${actor}:${key}`) || 0;

  return score;
}

function buildChildren(
  state,
  context,
  ply,
  limit,
  preferred = "",
  forcingOnly = false,
) {
  const actor = state.turn;
  const actions = getLegalActions(state);
  if (!actions.length) return [];

  const actorChecked = isInCheck(state, actor);
  const children = [];

  for (const action of actions) {
    context.checkDeadline();
    const result = applyAction(state, action);
    if (result.error) continue;

    const child = result.state;
    const movingBefore = state.pieces.find((piece) => piece.id === action.pieceId);
    const movingAfter = child.pieces.find((piece) => piece.id === action.pieceId);
    const victim = capturedPiece(state, action);

    const eliminated = state.activeFactions.length - child.activeFactions.length;
    const promoted =
      (movingBefore?.role === "soldier" && !movingBefore.promoted && movingAfter?.promoted) ||
      (movingBefore?.role === "flag" && !movingBefore.leftHome && movingAfter?.leftHome);

    let checks = 0;
    for (const rival of child.activeFactions) {
      if (rival !== actor && isInCheck(child, rival)) checks += 1;
    }

    const forcing =
      actorChecked ||
      Boolean(victim) ||
      Boolean(promoted) ||
      checks > 0 ||
      eliminated > 0 ||
      Boolean(child.outcome);

    if (forcingOnly && !forcing) continue;

    let priority = movePriority(state, action, actor, context, ply, preferred);
    if (child.outcome?.winner === actor) priority += 30_000_000;
    if (eliminated) priority += 12_000_000 * eliminated;
    if (checks) priority += 1_100_000 * checks;
    if (promoted) priority += 650_000;

    children.push({
      action,
      child,
      forcing,
      quiet: !victim && !promoted && !checks && !eliminated,
      priority,
    });
  }

  children.sort(
    (a, b) =>
      b.priority - a.priority ||
      actionKey(a.action).localeCompare(actionKey(b.action)),
  );

  if (!Number.isFinite(limit) || children.length <= limit) return children;

  // Tactical moves are never removed by the selective beam.
  const forcing = children.filter((entry) => entry.forcing);
  const quiet = children.filter((entry) => !entry.forcing);
  const room = Math.max(0, limit - forcing.length);
  return [...forcing, ...quiet.slice(0, room)];
}

function recordCutoff(context, actor, action, ply, depth, quiet) {
  if (!quiet) return;
  const key = actionKey(action);
  const killerKey = `${actor}:${ply}`;
  const killers = context.killers.get(killerKey) || [];

  if (!killers.includes(key)) {
    killers.unshift(key);
    if (killers.length > 2) killers.pop();
    context.killers.set(killerKey, killers);
  }

  const historyKey = `${actor}:${key}`;
  context.history.set(
    historyKey,
    Math.min(
      3_000_000,
      (context.history.get(historyKey) || 0) + depth * depth * 700,
    ),
  );
}

function actorTieBreak(vector, actor) {
  const strongestRival = Math.max(
    ...FACTIONS
      .filter((faction) => faction !== actor)
      .map((faction) => vector[faction]),
  );
  return -strongestRival;
}

function maxNQuiescence(state, qDepth, context, ply) {
  context.checkDeadline();
  context.nodes += 1;
  context.qNodes += 1;

  const stand = evaluateVector(state, context);
  if (state.outcome || qDepth <= 0) return stand;

  const actor = state.turn;
  const checked = isInCheck(state, actor);
  const children = buildChildren(
    state,
    context,
    ply,
    context.level.qBeam,
    "",
    !checked,
  );

  if (!children.length) return stand;

  let best = checked ? null : stand;

  for (const entry of children) {
    const vector = maxNQuiescence(
      entry.child,
      qDepth - 1,
      context,
      ply + 1,
    );

    if (
      !best ||
      vector[actor] > best[actor] ||
      (
        vector[actor] === best[actor] &&
        actorTieBreak(vector, actor) > actorTieBreak(best, actor)
      )
    ) {
      best = vector;
    }
  }

  return best || stand;
}

function maxNSearch(state, depth, context, ply) {
  context.checkDeadline();
  context.nodes += 1;

  if (state.outcome) return evaluateVector(state, context);
  if (depth <= 0) {
    return maxNQuiescence(state, context.level.qDepth, context, ply);
  }

  const key = `M|${depth}|${boardKey(state)}`;
  const tt = context.table.get(key);
  if (tt) {
    context.ttHits += 1;
    return tt.vector;
  }

  const preferred = context.pvMoves.get(boardKey(state)) || "";
  const children = buildChildren(
    state,
    context,
    ply,
    context.level.beam,
    preferred,
  );

  if (!children.length) return evaluateVector(state, context);

  const actor = state.turn;
  let best = null;
  let bestMove = "";

  for (const entry of children) {
    const vector = maxNSearch(entry.child, depth - 1, context, ply + 1);

    if (
      !best ||
      vector[actor] > best[actor] ||
      (
        vector[actor] === best[actor] &&
        actorTieBreak(vector, actor) > actorTieBreak(best, actor)
      )
    ) {
      best = vector;
      bestMove = actionKey(entry.action);
    }
  }

  context.pvMoves.set(boardKey(state), bestMove);

  if (context.table.size >= context.level.tableSize) {
    const first = context.table.keys().next();
    if (!first.done) context.table.delete(first.value);
  }
  context.table.set(key, { vector: best });

  return best;
}

function alphaBeta(state, rootFaction, depth, alpha, beta, context, ply) {
  context.checkDeadline();
  context.nodes += 1;

  const scores = evaluateVector(state, context);
  if (state.outcome) return scores[rootFaction];
  if (depth <= 0) {
    return maxNQuiescence(
      state,
      context.level.qDepth,
      context,
      ply,
    )[rootFaction];
  }

  const key = `A|${rootFaction}|${depth}|${boardKey(state)}`;
  const cached = context.table.get(key);
  if (cached && typeof cached.value === "number") {
    context.ttHits += 1;
    return cached.value;
  }

  const maximizing = state.turn === rootFaction;
  const preferred = context.pvMoves.get(boardKey(state)) || "";
  const children = buildChildren(
    state,
    context,
    ply,
    context.level.beam,
    preferred,
  );
  if (!children.length) return scores[rootFaction];

  let best = maximizing ? -INF : INF;
  let bestMove = "";

  for (const entry of children) {
    const value = alphaBeta(
      entry.child,
      rootFaction,
      depth - 1,
      alpha,
      beta,
      context,
      ply + 1,
    );

    if (
      (maximizing && value > best) ||
      (!maximizing && value < best)
    ) {
      best = value;
      bestMove = actionKey(entry.action);
    }

    if (maximizing) alpha = Math.max(alpha, best);
    else beta = Math.min(beta, best);

    if (alpha >= beta) {
      context.cutoffs += 1;
      recordCutoff(
        context,
        state.turn,
        entry.action,
        ply,
        depth,
        entry.quiet,
      );
      break;
    }
  }

  context.pvMoves.set(boardKey(state), bestMove);
  if (context.table.size >= context.level.tableSize) {
    const first = context.table.keys().next();
    if (!first.done) context.table.delete(first.value);
  }
  context.table.set(key, { value: best });
  return best;
}

function deterministicFallback(state, actions, context) {
  return [...actions].sort(
    (a, b) =>
      movePriority(state, b, state.turn, context, 0) -
        movePriority(state, a, state.turn, context, 0) ||
      actionKey(a).localeCompare(actionKey(b)),
  )[0];
}

function chooseSearchedAction(state, difficulty, options = {}) {
  const configured = BOT_LEVELS[difficulty] || BOT_LEVELS.medium;
  const level = {
    ...configured,
    depth: options.maxDepth ?? configured.depth,
    beam: options.beam ?? configured.beam,
    rootBeam: options.rootBeam ?? configured.rootBeam,
    qDepth: options.qDepth ?? configured.qDepth,
    qBeam: options.qBeam ?? configured.qBeam,
    budgetMs: options.budgetMs ?? configured.budgetMs,
  };

  if (state.activeFactions.length === 2) {
    level.depth += difficulty === "hard" ? 2 : 1;
    level.beam += difficulty === "hard" ? 8 : 4;
    level.rootBeam += difficulty === "hard" ? 12 : 6;
  }

  const started = nowMs();
  const deadline = started + level.budgetMs;
  const timeoutSignal = Symbol("sanyou-search-timeout");
  const rootFaction = state.turn;

  const context = {
    level,
    rootFaction,
    weights: options.evalWeights || SAN_YOU_EVAL_WEIGHTS,
    table: new Map(),
    evalCache: new Map(),
    killers: new Map(),
    history: new Map(),
    pvMoves: new Map(),
    nodes: 0,
    qNodes: 0,
    cutoffs: 0,
    ttHits: 0,
    evalHits: 0,
    checkDeadline() {
      if (nowMs() >= deadline) throw timeoutSignal;
    },
  };

  const rootActions = getLegalActions(state);
  if (!rootActions.length) {
    return {
      action: null,
      score: null,
      stats: {
        nodes: 0,
        qNodes: 0,
        cutoffs: 0,
        ttHits: 0,
        evalHits: 0,
        completedDepth: 0,
        elapsedMs: Math.round(nowMs() - started),
      },
    };
  }

  let bestAction = deterministicFallback(state, rootActions, context);
  let bestVector = null;
  let bestScore = -INF;
  let completedDepth = 0;

  // Guaranteed one-ply scan. This deliberately has no deadline check around
  // the cheap static evaluator so Medium/Hard never collapse to a raw move-
  // ordering fallback simply because the device is slow.
  const onePly = [];
  for (const action of rootActions) {
    const result = applyAction(state, action);
    if (result.error) continue;
    const vector = staticVector(result.state, context.weights);
    const eliminated = state.activeFactions.length - result.state.activeFactions.length;
    onePly.push({
      action,
      child: result.state,
      vector,
      priority:
        vector[rootFaction] +
        eliminated * 1_000_000 +
        (result.state.outcome?.winner === rootFaction ? 20_000_000 : 0),
    });
  }

  onePly.sort(
    (a, b) =>
      b.priority - a.priority ||
      actionKey(a.action).localeCompare(actionKey(b.action)),
  );

  if (onePly.length) {
    bestAction = onePly[0].action;
    bestVector = onePly[0].vector;
    bestScore = onePly[0].vector[rootFaction];
    completedDepth = 1;
  }

  // Immediate forced win beats every search budget.
  const mate = onePly.find((entry) => entry.child.outcome?.winner === rootFaction);
  if (mate) {
    return {
      action: mate.action,
      score: MATE_SCORE,
      stats: {
        nodes: context.nodes,
        qNodes: context.qNodes,
        cutoffs: context.cutoffs,
        ttHits: context.ttHits,
        evalHits: context.evalHits,
        completedDepth: 1,
        elapsedMs: Math.round(nowMs() - started),
        tableSize: 0,
        search: state.activeFactions.length === 2 ? "alpha-beta" : "maxn",
      },
    };
  }

  try {
    for (let depth = 2; depth <= level.depth; depth += 1) {
      context.checkDeadline();

      const preferred = actionKey(bestAction);
      const rootChildren = buildChildren(
        state,
        context,
        0,
        level.rootBeam,
        preferred,
      );

      let iterationAction = null;
      let iterationVector = null;
      let iterationScore = -INF;

      for (const entry of rootChildren) {
        context.checkDeadline();

        if (state.activeFactions.length === 2) {
          const value = alphaBeta(
            entry.child,
            rootFaction,
            depth - 1,
            -INF,
            INF,
            context,
            1,
          );

          if (
            iterationAction == null ||
            value > iterationScore ||
            (
              value === iterationScore &&
              actionKey(entry.action).localeCompare(actionKey(iterationAction)) < 0
            )
          ) {
            iterationAction = entry.action;
            iterationScore = value;
            iterationVector = evaluateVector(entry.child, context);
          }
        } else {
          const vector = maxNSearch(
            entry.child,
            depth - 1,
            context,
            1,
          );
          const value = vector[rootFaction];

          if (
            iterationAction == null ||
            value > iterationScore ||
            (
              value === iterationScore &&
              actionKey(entry.action).localeCompare(actionKey(iterationAction)) < 0
            )
          ) {
            iterationAction = entry.action;
            iterationScore = value;
            iterationVector = vector;
          }
        }
      }

      if (iterationAction) {
        bestAction = iterationAction;
        bestVector = iterationVector;
        bestScore = iterationScore;
        completedDepth = depth;
        context.pvMoves.set(boardKey(state), actionKey(bestAction));
      }
    }
  } catch (error) {
    if (error !== timeoutSignal) throw error;
  }

  return {
    action: bestAction,
    score: bestScore,
    vector: bestVector,
    stats: {
      nodes: context.nodes,
      qNodes: context.qNodes,
      cutoffs: context.cutoffs,
      ttHits: context.ttHits,
      evalHits: context.evalHits,
      completedDepth,
      elapsedMs: Math.round(nowMs() - started),
      tableSize: context.table.size,
      search: state.activeFactions.length === 2
        ? "iterative-alpha-beta"
        : "iterative-maxn",
    },
  };
}

function easyBotAction(state, options = {}) {
  const actions = getLegalActions(state);
  if (!actions.length) {
    return {
      action: null,
      score: null,
      stats: { nodes: 0, completedDepth: 0 },
    };
  }

  const random = options.random || Math.random;
  const captures = actions.filter((action) => action.captured);
  const pool = captures.length && random() < 0.7 ? captures : actions;
  const action = pool[Math.floor(random() * pool.length)] || pool[0];

  const result = applyAction(state, action);
  const score = result.error
    ? -INF
    : staticVector(result.state, options.evalWeights || SAN_YOU_EVAL_WEIGHTS)[state.turn];

  return {
    action,
    score,
    stats: {
      nodes: 1,
      qNodes: 0,
      cutoffs: 0,
      ttHits: 0,
      evalHits: 0,
      completedDepth: 1,
      elapsedMs: 0,
      search: "capture-biased-random",
    },
  };
}

function chooseSanYouBotAction(
  state,
  difficulty = "medium",
  options = {},
) {
  if (difficulty === "easy") return easyBotAction(state, options);
  return chooseSearchedAction(state, difficulty, options);
}

function botLabel(difficulty) {
  return BOT_LEVELS[difficulty]?.label || BOT_LEVELS.medium.label;
}

function describeBotMove(state, action) {
  if (!action) return "No legal move.";
  const piece = state.pieces.find((candidate) => candidate.id === action.pieceId);
  return `${ROLE_LABELS[piece?.role] || "Piece"}: ${action.from} → ${action.to}`;
}


module.exports = {
  GAME_ID,
  RULESET_VERSION,
  FACTIONS,
  FACTION_LABELS,
  BOT_LEVELS,
  SAN_YOU_EVAL_WEIGHTS,
  createInitialState,
  getLegalActions,
  validateAction,
  applyAction,
  allNodes,
  chooseSanYouBotAction,
  evaluateSanYouState,
  isInCheck,
};
