// Sanyou Qi board topology.
// The 135 coloured arm points come from the latest placement export.
// The central graph has 21 surviving C-points: C1-C18, C20, C22 and C24.

export const SANYOU_FACTIONS = Object.freeze(["red", "green", "blue"]);

export const ARM_COORDS = Object.freeze({"red":[[0.325114,0.754632],[0.326265,0.716023],[0.326265,0.673419],[0.328566,0.626821],[0.329717,0.578892],[0.366541,0.758626],[0.366541,0.71336],[0.366541,0.672088],[0.367692,0.624159],[0.368842,0.57623],[0.406817,0.759958],[0.406817,0.714691],[0.406817,0.672088],[0.407968,0.624159],[0.407968,0.57623],[0.451696,0.757295],[0.451696,0.71336],[0.449395,0.670756],[0.450545,0.62549],[0.450545,0.577561],[0.493274,0.757295],[0.494274,0.712029],[0.493123,0.670756],[0.494274,0.62549],[0.494274,0.578892],[0.536002,0.756295],[0.538002,0.712029],[0.536852,0.669425],[0.536852,0.626821],[0.536852,0.577561],[0.58058,0.758626],[0.578429,0.714691],[0.579429,0.672088],[0.579429,0.626821],[0.578278,0.577561],[0.621158,0.757626],[0.621158,0.713691],[0.620007,0.672088],[0.620856,0.62549],[0.618555,0.57623],[0.663434,0.759958],[0.661132,0.71336],[0.662283,0.672088],[0.659982,0.626821],[0.658831,0.577561]],"green":[[0.850061,0.426779],[0.810196,0.453106],[0.77069,0.481397],[0.729761,0.512469],[0.688347,0.540235],[0.829891,0.388694],[0.790229,0.412252],[0.749802,0.442909],[0.709389,0.470675],[0.668976,0.498441],[0.805159,0.350937],[0.768496,0.373496],[0.728991,0.400787],[0.687578,0.428553],[0.646759,0.457379],[0.782813,0.309841],[0.74823,0.334766],[0.705913,0.358177],[0.666657,0.386676],[0.625838,0.413503],[0.763814,0.270598],[0.721152,0.294156],[0.688319,0.315874],[0.645062,0.346372],[0.605321,0.373564],[0.748219,0.236294],[0.709558,0.257853],[0.671646,0.281203],[0.62414,0.307494],[0.584243,0.334955],[0.720297,0.189417],[0.688308,0.216402],[0.647803,0.242692],[0.602141,0.267251],[0.562839,0.294773],[0.699297,0.150173],[0.665714,0.176098],[0.627803,0.203449],[0.581657,0.230702],[0.54395,0.257284],[0.677566,0.117417],[0.641015,0.141731],[0.601993,0.167327],[0.564519,0.194007],[0.525217,0.220528]],"blue":[[0.316891,0.117748],[0.351762,0.140623],[0.390485,0.16829],[0.429271,0.193905],[0.467737,0.221083],[0.296154,0.153813],[0.331048,0.176709],[0.368685,0.20176],[0.409152,0.228938],[0.447619,0.256115],[0.274184,0.192055],[0.309078,0.21495],[0.347801,0.240616],[0.386267,0.267794],[0.427331,0.291919],[0.249083,0.236352],[0.286892,0.258633],[0.322808,0.280194],[0.365105,0.308141],[0.406168,0.334266],[0.231005,0.271315],[0.267898,0.29221],[0.302134,0.320209],[0.34443,0.346157],[0.384409,0.373668],[0.21033,0.30933],[0.245224,0.334225],[0.280543,0.358839],[0.321267,0.386506],[0.363415,0.415245],[0.189167,0.353678],[0.221573,0.374906],[0.260295,0.400572],[0.299189,0.429468],[0.341934,0.457153],[0.169089,0.392641],[0.198897,0.414922],[0.238217,0.443535],[0.276792,0.471991],[0.320134,0.496625],[0.147119,0.426882],[0.180291,0.450286],[0.217332,0.480391],[0.257419,0.509181],[0.298165,0.538866]]});
export const CENTER_COORDS = Object.freeze({"C1":[0.367515,0.525993],"C2":[0.411515,0.529941],"C3":[0.451667,0.528696],"C4":[0.494485,0.527593],"C5":[0.536303,0.528696],"C6":[0.579515,0.528941],"C7":[0.621424,0.527096],"C8":[0.611212,0.485573],"C9":[0.589303,0.443553],"C10":[0.566485,0.403534],"C11":[0.548303,0.362514],"C12":[0.527576,0.319391],"C13":[0.496212,0.276372],"C14":[0.470121,0.320443],"C15":[0.449212,0.362514],"C16":[0.427394,0.40143],"C17":[0.40797,0.443046],"C18":[0.384242,0.483117],"C20":[0.49397,0.479048],"C22":[0.525061,0.428617],"C24":[0.463424,0.428472]});

export const armNodeId = (faction, lane, rank) => `${faction}:L${lane}-${rank}`;
export const centerNodeId = (number) => `C${number}`;

export function parseArmNode(id) {
  const match = /^(red|green|blue):L([1-9])-([1-5])$/.exec(id);
  if (!match) return null;
  return { faction: match[1], lane: Number(match[2]), rank: Number(match[3]) };
}

export function isCenterNode(id) {
  return Object.prototype.hasOwnProperty.call(CENTER_COORDS, id);
}

export function boardPoint(id) {
  const arm = parseArmNode(id);
  if (arm) return ARM_COORDS[arm.faction][(arm.lane - 1) * 5 + (arm.rank - 1)];
  return CENTER_COORDS[id] || null;
}

export function nodeLabel(id) {
  const arm = parseArmNode(id);
  return arm ? `${arm.faction.toUpperCase()} L${arm.lane}-${arm.rank}` : id;
}

export const ALL_NODE_IDS = Object.freeze([
  ...SANYOU_FACTIONS.flatMap((faction) =>
    Array.from({ length: 9 }, (_, laneIndex) =>
      Array.from({ length: 5 }, (_, rankIndex) => armNodeId(faction, laneIndex + 1, rankIndex + 1)),
    ).flat(),
  ),
  ...Object.keys(CENTER_COORDS),
]);

export const armPath = (faction, lane) =>
  Object.freeze(Array.from({ length: 5 }, (_, index) => armNodeId(faction, lane, index + 1)));

const reverseArmPath = (faction, lane) => [...armPath(faction, lane)].reverse();

const line = (id, nodes, kind = "continuation") => Object.freeze({ id, kind, nodes: Object.freeze(nodes) });

// User-approved continuation lines. Each path is an uninterrupted straight movement line.
// Alternate routes are intentionally separate lines so a sliding move never turns at a junction.
export const CONTINUATION_LINES = Object.freeze([
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
export const CENTER_HORIZONTAL_LINES = Object.freeze([
  line("H1", ["C1","C2","C3","C4","C5","C6","C7"], "horizontal"),
  line("H2", ["C13","C14","C15","C16","C17","C18","C1"], "horizontal"),
  line("H3", ["C7","C8","C9","C10","C11","C12","C13"], "horizontal"),
]);

export const ARM_FILE_LINES = Object.freeze(
  SANYOU_FACTIONS.flatMap((faction) =>
    Array.from({ length: 9 }, (_, index) =>
      line(`${faction}-F${index + 1}`, [...armPath(faction, index + 1)], "file"),
    ),
  ),
);

export const ARM_RANK_LINES = Object.freeze(
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

export const SLIDING_LINES = Object.freeze([
  ...ARM_FILE_LINES,
  ...ARM_RANK_LINES,
  ...CONTINUATION_LINES,
  ...CENTER_HORIZONTAL_LINES,
]);

export const SIDEWAYS_LINES = Object.freeze([
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

export function terrainBetween(a, b) {
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

export function linesThrough(node) {
  return lineMembership.get(node) || [];
}

export function lineRaysFrom(node) {
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

export function sidewaysNeighbors(node) {
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

export function neighbors(node) {
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

export function forwardNeighbors(faction, node) {
  return [...(forwardMaps[faction]?.get(node) || [])];
}

export function backwardNeighbors(faction, node) {
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
export const CENTER_TERRITORY_CAMPS = Object.freeze({
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

export function territoryCamps(node) {
  const arm = parseArmNode(node);
  if (arm) return [arm.faction];
  return CENTER_TERRITORY_CAMPS[node] || [];
}

export function isOwnTerritory(faction, node) {
  return territoryCamps(node).includes(faction);
}

export function isSharedTerritory(node) {
  return territoryCamps(node).length > 1;
}

export const ENEMY_CENTER_POINTS = Object.freeze(
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

export function isEnemyTerritory(faction, node) {
  const camps = territoryCamps(node);
  return camps.length > 0 && !camps.includes(faction);
}

export function isOwnArm(faction, node) {
  return parseArmNode(node)?.faction === faction;
}

export function isArmNode(node) {
  return Boolean(parseArmNode(node));
}

export function pathEdgeAllowedForRole(role, from, to, faction = null) {
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

export const SANYOU_TOPOLOGY_DEBUG = Object.freeze({
  CENTER_TERRITORY_CAMPS,
  SEA_EDGES,
  SEA_HORSE_CHARIOT_BLOCKS,
  MOUNTAIN_EDGES,
  CITY_EDGES,
  FORT_DIRECT_CANNON_BLOCKS,
  FORT_CANNON_EXIT_BLOCKS,
});
