/**
 * Arctic board presentation graph.  The source rail graph remains the rules
 * authority; this map binds every one of its 135 nodes to an intersection on
 * the supplied Arctic board image in normalized image coordinates.
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

const sourceId = (sector: SanguoFaction, rank: number, file: number) => `${sector}-${rank}-${file}`;
const sourceToArctic = (x: number, y: number) => ({ x: x / 1280, y: y / 1124 });

const nodes: Record<string, ArcticBoardNode> = {};
(Object.keys(SOURCE_NODES) as SanguoFaction[]).forEach((region) => {
  SOURCE_NODES[region].forEach((rank, rankIndex) => rank.forEach((point, file) => {
    const id = sourceId(region, rankIndex, file);
    const normalized = sourceToArctic(point.x, point.y);
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
