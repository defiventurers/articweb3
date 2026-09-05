import type { SanguoFaction, SanguoNode } from "./sanguoRules";

/**
 * Authoritative movement topology for Sanguo Qi.
 *
 * Rule logic lives on three identical logical Xiangqi half-boards:
 *   - ranks 0..4 (5 ranks)
 *   - files 0..8 (9 files)
 *
 * Rendering coordinates and the traced source-board rail graph are deliberately
 * not used here. Standard Xiangqi movement is calculated on these local 5x9
 * coordinates. Sanguo-specific behaviour is isolated to the river boundary and
 * the explicit three-way L5 junction below.
 */
export const SANGUO_RANK_COUNT = 5;
export const SANGUO_FILE_COUNT = 9;
export const RIVER_RANK = 0;
export const HOME_RANK = 4;
export const CENTRAL_FILE = 4; // human-facing L5

export const logicalNode = (
  sector: SanguoFaction,
  rank: number,
  file: number,
): SanguoNode => ({ sector, rank, file });

export const logicalNodeKey = (node: SanguoNode) => `${node.sector}-${node.rank}-${node.file}`;

export const insideLogicalSector = (rank: number, file: number) =>
  rank >= 0 && rank < SANGUO_RANK_COUNT && file >= 0 && file < SANGUO_FILE_COUNT;

export type FileContinuation = { sector: SanguoFaction; file: number };

/**
 * Non-visual river continuation table confirmed from the labelled board.
 * Human labels are L1..L9; code files are 0..8.
 *
 * R1-B9, R2-B8, R3-B7, R4-B6,
 * R5-B5-G5,
 * R6-G4, R7-G3, R8-G2, R9-G1,
 * B1-G9, B2-G8, B3-G7, B4-G6.
 */
export const FILE_CONTINUATIONS: Record<
  SanguoFaction,
  readonly (readonly FileContinuation[])[]
> = {
  red: [
    [{ sector: "blue", file: 8 }],
    [{ sector: "blue", file: 7 }],
    [{ sector: "blue", file: 6 }],
    [{ sector: "blue", file: 5 }],
    [{ sector: "blue", file: 4 }, { sector: "green", file: 4 }],
    [{ sector: "green", file: 3 }],
    [{ sector: "green", file: 2 }],
    [{ sector: "green", file: 1 }],
    [{ sector: "green", file: 0 }],
  ],
  blue: [
    [{ sector: "green", file: 8 }],
    [{ sector: "green", file: 7 }],
    [{ sector: "green", file: 6 }],
    [{ sector: "green", file: 5 }],
    [{ sector: "red", file: 4 }, { sector: "green", file: 4 }],
    [{ sector: "red", file: 3 }],
    [{ sector: "red", file: 2 }],
    [{ sector: "red", file: 1 }],
    [{ sector: "red", file: 0 }],
  ],
  green: [
    [{ sector: "red", file: 8 }],
    [{ sector: "red", file: 7 }],
    [{ sector: "red", file: 6 }],
    [{ sector: "red", file: 5 }],
    [{ sector: "red", file: 4 }, { sector: "blue", file: 4 }],
    [{ sector: "blue", file: 3 }],
    [{ sector: "blue", file: 2 }],
    [{ sector: "blue", file: 1 }],
    [{ sector: "blue", file: 0 }],
  ],
};

/**
 * The only genuinely three-way movement junction.
 *
 * Each kingdom's (rank 0, file 4) is its L5 river endpoint. Reaching that
 * endpoint presents two straight continuations: the L5 endpoint of each other
 * kingdom. A piece may choose one branch; a single move never turns from one
 * foreign branch into the other after choosing it.
 */
export const CENTRAL_VERTEX_EXITS: Record<SanguoFaction, readonly SanguoFaction[]> = {
  red: ["blue", "green"],
  blue: ["red", "green"],
  green: ["red", "blue"],
};

export const isCentralVertexEndpoint = (node: SanguoNode) =>
  node.rank === RIVER_RANK && node.file === CENTRAL_FILE;

/** Direct one-step river exits from a rank-0 endpoint. */
export function riverExits(node: SanguoNode): SanguoNode[] {
  if (node.rank !== RIVER_RANK) return [];

  if (isCentralVertexEndpoint(node)) {
    return CENTRAL_VERTEX_EXITS[node.sector].map((sector) => logicalNode(sector, RIVER_RANK, CENTRAL_FILE));
  }

  return (FILE_CONTINUATIONS[node.sector][node.file] ?? []).map((continuation) =>
    logicalNode(continuation.sector, RIVER_RANK, continuation.file),
  );
}

/** Standard Xiangqi horizontal rays inside one logical 5x9 sector. */
export function rankRays(node: SanguoNode): SanguoNode[][] {
  const { sector, rank, file } = node;
  return [
    Array.from({ length: file }, (_, offset) => logicalNode(sector, rank, file - offset - 1)),
    Array.from({ length: SANGUO_FILE_COUNT - file - 1 }, (_, offset) => logicalNode(sector, rank, file + offset + 1)),
  ].filter((ray) => ray.length > 0);
}

/**
 * Xiangqi vertical rays plus one Sanguo boundary operation.
 *
 * Inside a sector this is ordinary file movement. When the inward ray reaches
 * rank 0, it may continue through exactly one river exit. The chosen foreign
 * file then continues from rank 0 toward rank 4 as an ordinary Xiangqi file.
 * L5 simply produces two candidate rays because its river endpoint is the
 * explicit three-way junction defined above.
 */
export function fileRays(node: SanguoNode): SanguoNode[][] {
  const { sector, rank, file } = node;

  const outward = Array.from(
    { length: HOME_RANK - rank },
    (_, offset) => logicalNode(sector, rank + offset + 1, file),
  );

  const toRiver = Array.from(
    { length: rank },
    (_, offset) => logicalNode(sector, rank - offset - 1, file),
  );

  const endpoint = logicalNode(sector, RIVER_RANK, file);
  const exits = riverExits(endpoint);
  const inward = exits.length
    ? exits.map((exit) => [
        ...toRiver,
        ...Array.from(
          { length: SANGUO_RANK_COUNT },
          (_, foreignRank) => logicalNode(exit.sector, foreignRank, exit.file),
        ),
      ])
    : [toRiver];

  return [outward, ...inward].filter((ray) => ray.length > 0);
}

/** Backwards-compatible name used by a few older tests/components. */
export const continuousFileRays = fileRays;
