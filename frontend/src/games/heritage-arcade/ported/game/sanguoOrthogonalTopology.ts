import type { SanguoNode } from "./sanguoRules";

export type FileContinuation = { sector: SanguoNode["sector"]; file: number };

export const logicalNode = (
  sector: SanguoNode["sector"],
  rank: number,
  file: number,
): SanguoNode => ({ sector, rank, file });

/**
 * Cross-river file continuations confirmed from the labelled Sanguo board.
 * Human line labels are file + 1. The centre-facing point is rank 0 (Lx-5)
 * and the outside/home edge is rank 4 (Lx-1).
 *
 * R1-B9, R2-B8, R3-B7, R4-B6,
 * R5-B5-G5,
 * R6-G4, R7-G3, R8-G2, R9-G1,
 * B1-G9, B2-G8, B3-G7, B4-G6.
 */
export const FILE_CONTINUATIONS: Record<
  SanguoNode["sector"],
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

/** Ordered straight rays along a rank, nearest node first. */
export function rankRays(node: SanguoNode): SanguoNode[][] {
  const { sector, rank, file } = node;
  return [
    Array.from({ length: file }, (_, offset) => logicalNode(sector, rank, file - offset - 1)),
    Array.from({ length: 8 - file }, (_, offset) => logicalNode(sector, rank, file + offset + 1)),
  ].filter((ray) => ray.length > 0);
}

/**
 * Ordered straight rays along the physical file, nearest node first.
 * Moving toward the river continues through the paired foreign file; L5 may
 * branch into either opposing L5 at the central triangle.
 */
export function continuousFileRays(node: SanguoNode): SanguoNode[][] {
  const { sector, rank, file } = node;
  const outward = Array.from(
    { length: 4 - rank },
    (_, offset) => logicalNode(sector, rank + offset + 1, file),
  );
  const homeToCentre = Array.from(
    { length: rank },
    (_, offset) => logicalNode(sector, rank - offset - 1, file),
  );
  const continuations = FILE_CONTINUATIONS[sector][file] ?? [];
  const inward = continuations.length
    ? continuations.map((continuation) => [
        ...homeToCentre,
        ...Array.from(
          { length: 5 },
          (_, destinationRank) => logicalNode(continuation.sector, destinationRank, continuation.file),
        ),
      ])
    : [homeToCentre];

  return [outward, ...inward].filter((ray) => ray.length > 0);
}
