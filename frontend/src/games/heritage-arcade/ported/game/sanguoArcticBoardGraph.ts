/**
 * Arctic board presentation graph. The source rail graph remains the rules
 * authority; this map binds every one of its 135 nodes to the user-approved
 * intersections on the supplied Arctic board image in normalized coordinates.
 *
 * User coordinate mapping: L{file+1}-{depth}, where source rank 4 is depth 1
 * (the outer starting rank) and source rank 0 is depth 5 (toward the centre).
 */
import { SOURCE_RAIL_EDGES } from "./sanguoRailGraph";
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
  red: [[0.301000,0.869000],[0.279000,0.818000],[0.258000,0.771000],[0.238000,0.723000],[0.218000,0.679000],[0.356000,0.868000],[0.342000,0.801000],[0.330000,0.741000],[0.315000,0.679000],[0.303000,0.622000],[0.410000,0.869000],[0.399000,0.786000],[0.390000,0.715000],[0.380000,0.645000],[0.372000,0.578000],[0.460000,0.867000],[0.455000,0.773000],[0.450000,0.687000],[0.445000,0.606000],[0.442000,0.533000],[0.510000,0.868000],[0.511000,0.763000],[0.510000,0.659000],[0.510000,0.575000],[0.510000,0.486000],[0.564000,0.867000],[0.567000,0.773000],[0.570000,0.686000],[0.576000,0.608000],[0.581000,0.532000],[0.614000,0.868000],[0.623000,0.787000],[0.632000,0.714000],[0.641000,0.645000],[0.650000,0.577000],[0.665000,0.868000],[0.679000,0.800000],[0.691000,0.742000],[0.704000,0.680000],[0.717000,0.618000],[0.721000,0.869000],[0.741000,0.819000],[0.764000,0.773000],[0.784000,0.722000],[0.805000,0.675000]],
  green: [[0.917677,0.430591],[0.894242,0.482271],[0.872424,0.532137],[0.849798,0.581096],[0.832828,0.615549],[0.891010,0.379818],[0.854646,0.429685],[0.822323,0.473204],[0.790000,0.516724],[0.759293,0.562056],[0.861919,0.327232],[0.817475,0.375285],[0.772222,0.421525],[0.728586,0.466857],[0.687374,0.504937],[0.832828,0.280086],[0.777879,0.324512],[0.724545,0.367125],[0.671212,0.411551],[0.621111,0.455071],[0.806970,0.230220],[0.740707,0.275553],[0.677677,0.317259],[0.611414,0.359872],[0.550000,0.402485],[0.783535,0.186701],[0.722121,0.217527],[0.662323,0.247447],[0.602525,0.281899],[0.546768,0.309099],[0.757677,0.140461],[0.702727,0.160407],[0.649394,0.182167],[0.594444,0.202114],[0.543535,0.221153],[0.733434,0.094221],[0.684141,0.105101],[0.634848,0.115981],[0.585556,0.128674],[0.541111,0.139554],[0.709192,0.048889],[0.663939,0.048889],[0.620303,0.049795],[0.576667,0.049795],[0.533838,0.049795]],
  blue: [[0.308384,0.046169],[0.352828,0.047075],[0.399697,0.047075],[0.444141,0.047982],[0.482121,0.047075],[0.284950,0.089688],[0.337475,0.102381],[0.385151,0.115981],[0.434444,0.126861],[0.475657,0.137741],[0.259091,0.135021],[0.318081,0.160407],[0.373838,0.181261],[0.426364,0.201207],[0.474849,0.220247],[0.234848,0.182167],[0.300303,0.215714],[0.359293,0.247447],[0.417475,0.279179],[0.473232,0.307286],[0.209798,0.228407],[0.280101,0.273740],[0.344747,0.315446],[0.406970,0.358965],[0.468384,0.399765],[0.181515,0.278273],[0.242929,0.324512],[0.296263,0.368032],[0.350404,0.411551],[0.401313,0.455978],[0.154849,0.323606],[0.205758,0.373472],[0.247778,0.421525],[0.292222,0.465044],[0.329394,0.504937],[0.127374,0.375285],[0.164545,0.426965],[0.196869,0.474111],[0.230000,0.522164],[0.256667,0.557523],[0.098283,0.428778],[0.121717,0.481364],[0.144343,0.530323],[0.164545,0.582003],[0.181515,0.613736]],
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
SOURCE_RAIL_EDGES.forEach(([from, to]) => { nodes[from]?.connections.push(to); nodes[to]?.connections.push(from); });
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
