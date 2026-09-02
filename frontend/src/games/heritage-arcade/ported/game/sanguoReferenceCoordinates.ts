/* Coordinate contract: source pixel nodes remain immutable; these labels are the human-facing reference layer used by audit mode and movement diagnostics. */
import type { SanguoFaction, SanguoNode } from "./sanguoRules";

export type ReferenceCoordinate = {
  sector: SanguoFaction;
  axis: string;
  depth: number;
  id: string;
};

// The Red sector is directly readable from the supplied reference: W through E.
// Blue and Green are rotated sectors, so their axis labels are kept explicit here
// rather than inferred by rotating pixel coordinates. This table is the single
// place to tune the historical transcription later.
export const REFERENCE_FILE_LABELS: Record<SanguoFaction, readonly string[]> = {
  red: ["W", "X", "Y", "Z", "A", "B", "C", "D", "E"],
  blue: ["9", "8", "7", "6", "5", "4", "3", "2", "1"],
  green: ["10", "11", "12", "13", "14", "15", "16", "17", "18"],
};

export const REFERENCE_DEPTH_LABELS = [0, 1, 2, 3, 4] as const;

export const referenceCoordinate = (node: SanguoNode): ReferenceCoordinate => {
  const axis = REFERENCE_FILE_LABELS[node.sector][node.file] ?? `F${node.file}`;
  const depth = Math.max(0, Math.min(4, node.rank));
  return { sector: node.sector, axis, depth, id: `${node.sector[0].toUpperCase()}-${axis}-${depth}` };
};

export const referenceNodeId = (node: SanguoNode) => referenceCoordinate(node).id;

export const referenceLabelForAudit = (node: SanguoNode) => referenceNodeId(node);

export const sourceNodeFromReferenceId = (value: string): SanguoNode | null => {
  const match = /^(R|G|B)-(.+)-([0-4])$/.exec(value);
  if (!match) return null;
  const sector = ({ R: "red", G: "green", B: "blue" } as const)[match[1] as "R" | "G" | "B"];
  const file = REFERENCE_FILE_LABELS[sector].indexOf(match[2]);
  const depth = Number(match[3]);
  return file >= 0 && REFERENCE_DEPTH_LABELS.includes(depth as (typeof REFERENCE_DEPTH_LABELS)[number])
    ? { sector, rank: depth, file }
    : null;
};

export const isCentralDeltaPortal = (node: SanguoNode) => node.rank === 0 && node.file === 4;

export const referenceCoordinateNote = "Sector prefix + reference axis + source depth; D-prefixed delta portal names remain reserved for the later shared-junction transcription.";
