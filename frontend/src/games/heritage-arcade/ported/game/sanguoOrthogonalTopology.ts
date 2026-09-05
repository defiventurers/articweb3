/*
 * Compatibility barrel.
 *
 * Movement rules must use sanguoLogicalTopology.ts as the authoritative model:
 * three logical 5x9 Xiangqi sectors plus an explicit Sanguo river/junction layer.
 * This file remains only so older imports/tests do not become a second source
 * of movement truth.
 */
export {
  CENTRAL_FILE,
  CENTRAL_VERTEX_EXITS,
  FILE_CONTINUATIONS,
  HOME_RANK,
  RIVER_RANK,
  SANGUO_FILE_COUNT,
  SANGUO_RANK_COUNT,
  continuousFileRays,
  fileRays,
  insideLogicalSector,
  isCentralVertexEndpoint,
  logicalNode,
  logicalNodeKey,
  rankRays,
  riverExits,
} from "./sanguoLogicalTopology";
export type { FileContinuation } from "./sanguoLogicalTopology";
