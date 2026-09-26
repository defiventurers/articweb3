// Sanyou Qi board topology.
// The 135 coloured arm points come from the finalized placement export.
// C1-C24 and all continuation/horizontal lines are the user-approved final graph.

export const SANYOU_FACTIONS = Object.freeze(["red", "green", "blue"]);

export const ARM_COORDS = Object.freeze({"red":[[0.329114,0.755632],[0.330265,0.717023],[0.330265,0.674419],[0.332566,0.627821],[0.333717,0.579892],[0.370541,0.759626],[0.370541,0.71436],[0.370541,0.673088],[0.371692,0.625159],[0.372842,0.57723],[0.410817,0.760958],[0.410817,0.715691],[0.410817,0.673088],[0.411968,0.625159],[0.411968,0.57723],[0.455696,0.758295],[0.455696,0.71436],[0.453395,0.671756],[0.454545,0.62649],[0.454545,0.578561],[0.498274,0.758295],[0.498274,0.713029],[0.497123,0.671756],[0.498274,0.62649],[0.498274,0.579892],[0.542002,0.758295],[0.542002,0.713029],[0.540852,0.670425],[0.540852,0.627821],[0.540852,0.578561],[0.58458,0.759626],[0.583429,0.715691],[0.583429,0.673088],[0.583429,0.627821],[0.582278,0.578561],[0.627158,0.759626],[0.627158,0.715691],[0.626007,0.673088],[0.624856,0.62649],[0.622555,0.57723],[0.667434,0.760958],[0.665132,0.71436],[0.666283,0.673088],[0.663982,0.627821],[0.662831,0.578561]],"green":[[0.850061,0.433779],[0.818196,0.455106],[0.77769,0.483397],[0.735761,0.512469],[0.696347,0.537235],[0.831891,0.393694],[0.797229,0.415252],[0.755802,0.444909],[0.716389,0.470675],[0.674976,0.496441],[0.810159,0.353937],[0.775496,0.375496],[0.734991,0.403787],[0.693578,0.429553],[0.652759,0.458379],[0.788813,0.315841],[0.75323,0.336766],[0.713913,0.361177],[0.672657,0.387676],[0.631838,0.416503],[0.766814,0.270598],[0.728152,0.294156],[0.693319,0.318874],[0.656062,0.353372],[0.618321,0.375564],[0.748219,0.236294],[0.709558,0.257853],[0.671646,0.281203],[0.63114,0.309494],[0.595243,0.336955],[0.723297,0.192417],[0.688308,0.216402],[0.647803,0.242692],[0.607141,0.268251],[0.567839,0.294773],[0.701297,0.153173],[0.665714,0.176098],[0.627803,0.203449],[0.586657,0.228702],[0.54795,0.256284],[0.677566,0.117417],[0.645015,0.141731],[0.606993,0.168327],[0.567519,0.196007],[0.532217,0.220528]],"blue":[[0.320891,0.118748],[0.355762,0.141623],[0.394485,0.16929],[0.433271,0.194905],[0.471737,0.222083],[0.300154,0.154813],[0.335048,0.177709],[0.372685,0.20276],[0.413152,0.229938],[0.451619,0.257115],[0.278184,0.193055],[0.313078,0.21595],[0.351801,0.241616],[0.390267,0.268794],[0.431331,0.292919],[0.253083,0.237352],[0.290892,0.259633],[0.326808,0.281194],[0.369105,0.309141],[0.410168,0.335266],[0.235005,0.272315],[0.271898,0.29321],[0.306134,0.321209],[0.34843,0.347157],[0.388409,0.374668],[0.21433,0.31033],[0.249224,0.335225],[0.284543,0.359839],[0.325267,0.387506],[0.367415,0.416245],[0.193167,0.354678],[0.225573,0.375906],[0.264295,0.401572],[0.303189,0.430468],[0.345934,0.458153],[0.173089,0.393641],[0.202897,0.415922],[0.242217,0.444535],[0.280792,0.472991],[0.324134,0.497625],[0.151119,0.427882],[0.184291,0.451286],[0.221332,0.481391],[0.261419,0.510181],[0.302165,0.539866]]});
export const CENTER_COORDS = Object.freeze({"C1":[0.372515,0.528993],"C2":[0.413515,0.529941],"C3":[0.454667,0.528696],"C4":[0.497485,0.528593],"C5":[0.540303,0.527696],"C6":[0.583515,0.528941],"C7":[0.623424,0.529096],"C8":[0.611212,0.485573],"C9":[0.589303,0.443553],"C10":[0.566485,0.403534],"C11":[0.548303,0.362514],"C12":[0.527576,0.319391],"C13":[0.498212,0.278372],"C14":[0.470121,0.320443],"C15":[0.449212,0.362514],"C16":[0.427394,0.40143],"C17":[0.40797,0.443046],"C18":[0.384242,0.483117],"C19":[0.455152,0.475507],"C20":[0.49897,0.478048],"C21":[0.540788,0.47585],"C22":[0.525061,0.431617],"C23":[0.499879,0.388158],"C24":[0.471424,0.431472]});

export const armNodeId = (faction, lane, rank) => `${faction}:L${lane}-${rank}`;
export const centerNodeId = (number) => `C${number}`;

export function parseArmNode(id) {
  const match = /^(red|green|blue):L([1-9])-([1-5])$/.exec(id);
  if (!match) return null;
  return { faction: match[1], lane: Number(match[2]), rank: Number(match[3]) };
}

export function isCenterNode(id) {
  return /^C(?:[1-9]|1[0-9]|2[0-4])$/.test(id);
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
  ...Array.from({ length: 24 }, (_, index) => centerNodeId(index + 1)),
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
  line("RB-4A", [...armPath("red", 4), "C3", "C17", ...reverseArmPath("blue", 6)]),
  line("RB-4B", [...armPath("red", 4), "C3", "C19", "C17", ...reverseArmPath("blue", 6)]),
  line("RB-5", [...armPath("red", 5), "C4", "C20", "C24", "C16", ...reverseArmPath("blue", 5)]),
  line("RG-5", [...armPath("red", 5), "C4", "C20", "C22", "C10", ...reverseArmPath("green", 5)]),
  line("RG-6A", [...armPath("red", 6), "C5", "C9", ...reverseArmPath("green", 4)]),
  line("RG-6B", [...armPath("red", 6), "C5", "C21", "C9", ...reverseArmPath("green", 4)]),
  line("RG-7", [...armPath("red", 7), "C6", "C8", ...reverseArmPath("green", 3)]),
  line("RG-8", [...armPath("red", 8), "C7", ...reverseArmPath("green", 2)]),
  line("RG-9", [...armPath("red", 9), ...reverseArmPath("green", 1)]),
  line("BG-5", [...armPath("blue", 5), "C16", "C24", "C22", "C10", ...reverseArmPath("green", 5)]),
  line("BG-4A", [...armPath("blue", 4), "C15", "C23", "C11", ...reverseArmPath("green", 6)]),
  line("BG-4B", [...armPath("blue", 4), "C15", "C11", ...reverseArmPath("green", 6)]),
  line("BG-3", [...armPath("blue", 3), "C14", "C12", ...reverseArmPath("green", 7)]),
  line("BG-2", [...armPath("blue", 2), "C13", ...reverseArmPath("green", 8)]),
  line("BG-1", [...armPath("blue", 1), ...reverseArmPath("green", 9)]),
]);

// Six additional horizontal lines defined after the continuation network.
export const CENTER_HORIZONTAL_LINES = Object.freeze([
  line("H1", ["C1","C2","C3","C4","C5","C6","C7"], "horizontal"),
  line("H2", ["C13","C14","C15","C16","C17","C18","C1"], "horizontal"),
  line("H3", ["C7","C8","C9","C10","C11","C12","C13"], "horizontal"),
  line("H4", ["C19","C20","C21"], "horizontal"),
  line("H5", ["C23","C24","C19"], "horizontal"),
  line("H6", ["C21","C22","C23"], "horizontal"),
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

const SEA_EDGES = new Set([
  edgeKey("C20", "C24"),
  edgeKey("C24", "C22"),
  edgeKey("C22", "C20"),
]);

const MOUNTAIN_EDGES = new Set([
  edgeKey("C3", "C17"),
  edgeKey("C5", "C9"),
  edgeKey("C15", "C11"),
]);

const CITY_EDGES = new Set([
  edgeKey(armNodeId("red", 1, 5), armNodeId("blue", 9, 5)),
  edgeKey(armNodeId("red", 9, 5), armNodeId("green", 1, 5)),
  edgeKey(armNodeId("blue", 1, 5), armNodeId("green", 9, 5)),
]);

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

export const ENEMY_CENTER_POINTS = Object.freeze({
  red: new Set([8,9,10,11,12,13,14,15,16,17,18,22,23,24].map(centerNodeId)),
  blue: new Set([2,3,4,5,6,7,8,9,10,11,12,20,21,22].map(centerNodeId)),
  green: new Set([1,2,3,4,5,6,14,15,16,17,18,19,20,24].map(centerNodeId)),
});

export function isEnemyTerritory(faction, node) {
  const arm = parseArmNode(node);
  if (arm) return arm.faction !== faction;
  return ENEMY_CENTER_POINTS[faction]?.has(node) || false;
}

export function isOwnArm(faction, node) {
  return parseArmNode(node)?.faction === faction;
}

export function isArmNode(node) {
  return Boolean(parseArmNode(node));
}

export function pathEdgeAllowedForRole(role, from, to) {
  const terrain = terrainBetween(from, to);
  if (!terrain) return true;
  if (terrain === "sea" && (role === "chariot" || role === "horse")) return false;
  if ((terrain === "mountain" || terrain === "city") && role === "cannon") return false;
  return true;
}

export const SANYOU_TOPOLOGY_DEBUG = Object.freeze({
  SEA_EDGES,
  MOUNTAIN_EDGES,
  CITY_EDGES,
});
