/**
 * Arctic board presentation graph. Coordinates are the user-approved positions;
 * the optional debug overlay displays logical rank/file and river connections.
 * The old traced rails are not an authority for movement or connectivity.
 *
 * User coordinate mapping: L{file+1}-{depth}, where source rank 4 is depth 1
 * (the outer starting rank) and source rank 0 is depth 5 (toward the centre).
 */
import { riverExits } from "./sanguoLogicalTopology";
import { referenceNodeId } from "./sanguoReferenceCoordinates";
import { SOURCE_NODES, type SanguoFaction } from "./sanguoTopology";

export type ArcticBoardNode = {
  id: string;
  coordinate: string;
  x: number;
  y: number;
  region: SanguoFaction | "river";
  connections: string[];
};
export type ArcticBoardGraph = { nodes: Record<string, ArcticBoardNode> };

type Position = readonly [number, number];

const APPROVED_POSITIONS: Record<SanguoFaction, readonly Position[]> = {
  red: [[0.297273,0.806000],[0.270364,0.758727],[0.250000,0.719455],[0.231091,0.679455],[0.215818,0.648909],[0.354000,0.805273],[0.336545,0.736182],[0.324909,0.686000],[0.313273,0.636545],[0.302364,0.592909],[0.407818,0.804545],[0.391091,0.720182],[0.382364,0.661273],[0.372182,0.605273],[0.362000,0.553000],[0.455091,0.805273],[0.447818,0.707091],[0.443455,0.635818],[0.438364,0.572545],[0.432000,0.508000],[0.500909,0.806727],[0.500909,0.696909],[0.499455,0.612545],[0.499455,0.541273],[0.501636,0.461273],[0.545273,0.805273],[0.553273,0.706364],[0.558364,0.635818],[0.564182,0.568909],[0.571000,0.507000],[0.594000,0.804545],[0.608545,0.718727],[0.618727,0.660545],[0.628182,0.604546],[0.640000,0.552000],[0.645636,0.805273],[0.662364,0.736182],[0.676182,0.682364],[0.687818,0.634364],[0.698000,0.592182],[0.698000,0.806000],[0.727818,0.757273],[0.751091,0.717273],[0.767091,0.679455],[0.780909,0.649636]],
  green: [[0.916909,0.416909],[0.892909,0.465636],[0.865273,0.510000],[0.839091,0.552909],[0.818727,0.591455],[0.890000,0.364546],[0.848545,0.414727],[0.810000,0.455455],[0.773636,0.499091],[0.742364,0.535455],[0.866727,0.319455],[0.807818,0.367455],[0.759818,0.406727],[0.713273,0.449636],[0.674727,0.485273],[0.840545,0.280909],[0.772182,0.324546],[0.714000,0.362364],[0.658000,0.403091],[0.607818,0.442364],[0.813636,0.232909],[0.733636,0.280182],[0.668909,0.317273],[0.602000,0.355818],[0.538727,0.390000],[0.786000,0.187818],[0.716182,0.225636],[0.655818,0.253273],[0.592545,0.284545],[0.535818,0.310000],[0.761273,0.148545],[0.697273,0.171091],[0.641273,0.193636],[0.584444,0.212114],[0.533535,0.231153],[0.732909,0.102000],[0.675455,0.116545],[0.628909,0.129636],[0.576545,0.142000],[0.532909,0.152909],[0.710364,0.061273],[0.653939,0.058889],[0.610303,0.059795],[0.566667,0.059795],[0.523838,0.059795]],
  blue: [[0.288384,0.061169],[0.342364,0.062727],[0.389636,0.062727],[0.431091,0.062000],[0.471091,0.061273],[0.264545,0.106364],[0.324182,0.119455],[0.373636,0.130364],[0.424545,0.141273],[0.468182,0.152909],[0.236182,0.152909],[0.301636,0.175455],[0.357636,0.195091],[0.416545,0.213273],[0.468182,0.231455],[0.216545,0.193636],[0.284909,0.223455],[0.343818,0.250364],[0.408545,0.283818],[0.468182,0.312909],[0.190364,0.236545],[0.266000,0.278000],[0.331455,0.315818],[0.397636,0.356545],[0.465273,0.395091],[0.164182,0.284545],[0.228182,0.323091],[0.284909,0.360182],[0.342364,0.403818],[0.395455,0.441636],[0.138727,0.323091],[0.191818,0.366000],[0.239091,0.407455],[0.285636,0.448909],[0.325636,0.486000],[0.112545,0.365273],[0.153273,0.411091],[0.188182,0.456909],[0.225273,0.500545],[0.255091,0.534727],[0.084909,0.418364],[0.108909,0.466364],[0.135091,0.508545],[0.160545,0.554364],[0.178000,0.591455]],
};

const sourceId = (sector: SanguoFaction, rank: number, file: number) => `${sector}-${rank}-${file}`;
const approvedPosition = (sector: SanguoFaction, rank: number, file: number) => {
  const depthIndex = 4 - rank;
  const position = APPROVED_POSITIONS[sector][file * 5 + depthIndex];
  if (!position) throw new Error(`Missing approved Arctic position for ${sector}-${rank}-${file}`);
  return { x: position[0], y: position[1] };
};

const nodes: Record<string, ArcticBoardNode> = {};
(Object.keys(SOURCE_NODES) as SanguoFaction[]).forEach((region) => {
  SOURCE_NODES[region].forEach((rank, rankIndex) => rank.forEach((_point, file) => {
    const id = sourceId(region, rankIndex, file);
    const normalized = approvedPosition(region, rankIndex, file);
    nodes[id] = { id, coordinate: referenceNodeId({ sector: region, rank: rankIndex, file }), ...normalized, region, connections: [] };
  }));
});
const connect = (from: string, to: string) => {
  if (!nodes[from] || !nodes[to]) return;
  if (!nodes[from].connections.includes(to)) nodes[from].connections.push(to);
  if (!nodes[to].connections.includes(from)) nodes[to].connections.push(from);
};
for (const sector of Object.keys(SOURCE_NODES) as SanguoFaction[]) {
  for (let rank = 0; rank < 5; rank++) for (let file = 0; file < 9; file++) {
    const from = sourceId(sector, rank, file);
    if (rank < 4) connect(from, sourceId(sector, rank + 1, file));
    if (file < 8) connect(from, sourceId(sector, rank, file + 1));
    for (const exit of riverExits({ sector, rank, file })) connect(from, sourceId(exit.sector, exit.rank, exit.file));
  }
  for (const rank of [2, 4]) for (const file of [3, 5]) connect(sourceId(sector, rank, file), sourceId(sector, 3, 4));
}
export const ARCTIC_BOARD_GRAPH: ArcticBoardGraph = { nodes };

export const arcticBoardNodeId = (sector: SanguoFaction, rank: number, file: number) => sourceId(sector, rank, file);
export const arcticBoardNode = (sector: SanguoFaction, rank: number, file: number) => ARCTIC_BOARD_GRAPH.nodes[arcticBoardNodeId(sector, rank, file)];

/** Pure validation keeps accidental topology edits visible in tests and debug builds. */
export function validateArcticBoardGraph(graph: ArcticBoardGraph = ARCTIC_BOARD_GRAPH): string[] {
  const errors: string[] = [];
  const coordinates = new Set<string>();
  Object.values(graph.nodes).forEach((node) => {
    if (!node.id || !node.coordinate) errors.push("Node is missing an ID or coordinate.");
    if (node.x < 0 || node.x > 1 || node.y < 0 || node.y > 1) errors.push(`${node.id} is outside the board image.`);
    const position = `${node.x.toFixed(6)},${node.y.toFixed(6)}`;
    if (coordinates.has(position)) errors.push(`${node.id} duplicates an intersection position.`);
    coordinates.add(position);
    if (!node.connections.length) errors.push(`${node.id} is orphaned.`);
    node.connections.forEach((target) => {
      if (!graph.nodes[target]) errors.push(`${node.id} connects to missing ${target}.`);
      else if (!graph.nodes[target].connections.includes(node.id)) errors.push(`${node.id} → ${target} is one-way.`);
    });
  });
  const start = Object.keys(graph.nodes)[0];
  const seen = new Set<string>(start ? [start] : []);
  const queue = start ? [start] : [];
  while (queue.length) graph.nodes[queue.shift()!].connections.forEach((id) => { if (!seen.has(id)) { seen.add(id); queue.push(id); } });
  if (seen.size !== Object.keys(graph.nodes).length) errors.push("Board graph has disconnected sections.");
  return errors;
}
