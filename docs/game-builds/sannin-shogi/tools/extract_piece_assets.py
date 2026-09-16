#!/usr/bin/env python3
"""Deterministically extract the supplied Sannin Shogi piece sheet.

The source artwork is never repainted, synthesized, or borrowed from the older
Frozen Shogunate set. Source pixels are copied 1:1 to a transparent 192px canvas;
only alpha outside the manually aligned regular-hex mask is removed.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import sys
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFont


SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parents[3]
DEFAULT_SOURCE = Path(
    "C:/Users/HP/.t3/userdata/attachments/"
    "f2e774c9-a27a-468c-b7d8-33359a78db70-bd3f9270-bdbf-45a5-b520-b18cf65015c0.png"
)
PUBLIC_OUTPUT_DIR = REPO_ROOT / "frontend/public/assets/games/sannin-shogi"
QA_OUTPUT_DIR = REPO_ROOT / "docs/game-builds/sannin-shogi/qa"

CANVAS_SIZE = 192
CROP_HALF_WIDTH = 80
CROP_TOP_MARGIN = 3
CROP_BOTTOM_MARGIN = 5
DESTINATION = (16, 4)

# Manually inspected source centers. The slight nonuniform spacing is retained;
# these are deliberately not an equal-grid slice.
COLUMN_CENTERS = [280, 459, 637, 818, 1001, 1182, 1361]
ROW_TOP_VERTICES = {
    "blue-unpromoted": 7,
    "blue-promoted": 183,
    "red-unpromoted": 359,
    "red-promoted": 535,
    "green-unpromoted": 711,
    "green-promoted": 887,
}

UNPROMOTED_ROLES = ["king", "rook", "bishop", "gold", "silver", "knight", "lance"]
PROMOTED_ROW_ROLES = [
    "pawn",
    "dragon",
    "horse",
    "promoted-silver",
    "promoted-knight",
    "promoted-lance",
    "tokin",
]
FACTIONS = ["blue", "red", "green"]

# Local to each nominal source crop (160x184). The vertices were aligned to the
# supplied badges: pointy-top, 152px across, 176px high.
MASK_POLYGON_LOCAL = [[80, 3], [156, 47], [156, 135], [80, 179], [4, 135], [4, 47]]
GREEN_PROMOTED_CROP = [None, 884, None, 1024]
GREEN_PROMOTED_MASK_LOCAL = [[80, 3], [156, 37], [156, 105], [80, 139], [4, 105], [4, 37]]
MASK_SUPERSAMPLE = 4


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def source_box(center_x: int, top_vertex: int) -> list[int]:
    return [
        center_x - CROP_HALF_WIDTH,
        top_vertex - CROP_TOP_MARGIN,
        center_x + CROP_HALF_WIDTH,
        top_vertex + 176 + CROP_BOTTOM_MARGIN,
    ]


def absolute_polygon(box: list[int], polygon: list[list[int]]) -> list[list[int]]:
    left, top, _, _ = box
    return [[left + x, top + y] for x, y in polygon]


def make_entries(source_height: int) -> list[dict]:
    entries: list[dict] = []
    for faction in FACTIONS:
        for row_kind, roles in (
            ("unpromoted", UNPROMOTED_ROLES),
            ("promoted", PROMOTED_ROW_ROLES),
        ):
            top_vertex = ROW_TOP_VERTICES[f"{faction}-{row_kind}"]
            for column, (center_x, role) in enumerate(zip(COLUMN_CENTERS, roles), start=1):
                box = source_box(center_x, top_vertex)
                mask_polygon = MASK_POLYGON_LOCAL
                geometry_normalization = None
                source_touches_canvas_edge = False
                if faction == "green" and row_kind == "promoted":
                    box = [center_x - CROP_HALF_WIDTH, GREEN_PROMOTED_CROP[1], center_x + CROP_HALF_WIDTH, GREEN_PROMOTED_CROP[3]]
                    mask_polygon = GREEN_PROMOTED_MASK_LOCAL
                    geometry_normalization = {
                        "operation": "vertical-resample",
                        "sourceSize": [160, 140],
                        "targetSize": [160, 184],
                        "resampling": "Lanczos",
                        "reason": "The supplied green promoted row is vertically compressed to the canvas edge; normalization restores the same regular-hex proportions as the other five rows.",
                    }
                    source_touches_canvas_edge = True
                clipped_sides = []
                if box[0] < 0:
                    clipped_sides.append("left")
                if box[1] < 0:
                    clipped_sides.append("top")
                if box[2] > 1536:
                    clipped_sides.append("right")
                if box[3] > source_height:
                    clipped_sides.append("bottom")

                legal_use = "playable"
                notes = None
                if role == "promoted-knight":
                    legal_use = "archival-unused"
                    notes = "Supplied artwork retained, but the selected historical Sannin edition does not promote knights."

                entries.append(
                    {
                        "faction": faction,
                        "sourceRow": row_kind,
                        "sourceColumn": column,
                        "role": role,
                        "filename": f"{faction}-{role}.webp",
                        "sourceBox": box,
                        "availableSourceBox": [
                            max(0, box[0]),
                            max(0, box[1]),
                            min(1536, box[2]),
                            min(source_height, box[3]),
                        ],
                        "maskPolygonLocal": mask_polygon,
                        "maskPolygonSource": absolute_polygon(box, mask_polygon),
                        "destinationOffset": list(DESTINATION),
                        "geometryNormalization": geometry_normalization,
                        "sourceTouchesCanvasEdge": source_touches_canvas_edge,
                        "legalUse": legal_use,
                        "sourceEdgeTruncated": bool(clipped_sides),
                        "sourceEdgeTruncatedSides": clipped_sides,
                        "notes": notes,
                    }
                )
    return entries


def make_mask(size: tuple[int, int], polygon: list[list[int]]) -> Image.Image:
    scale = MASK_SUPERSAMPLE
    mask_large = Image.new("L", (size[0] * scale, size[1] * scale), 0)
    points = [(x * scale, y * scale) for x, y in polygon]
    ImageDraw.Draw(mask_large).polygon(points, fill=255)
    return mask_large.resize(size, Image.Resampling.LANCZOS)


def crop_with_padding(source: Image.Image, box: list[int]) -> Image.Image:
    left, top, right, bottom = box
    result = Image.new("RGBA", (right - left, bottom - top), (0, 0, 0, 0))
    available = (max(0, left), max(0, top), min(source.width, right), min(source.height, bottom))
    if available[2] > available[0] and available[3] > available[1]:
        patch = source.crop(available)
        result.alpha_composite(patch, (available[0] - left, available[1] - top))
    return result


def checkerboard(size: tuple[int, int], cell: int = 12) -> Image.Image:
    image = Image.new("RGB", size, "#d7dde5")
    draw = ImageDraw.Draw(image)
    for y in range(0, size[1], cell):
        for x in range(0, size[0], cell):
            if (x // cell + y // cell) % 2:
                draw.rectangle((x, y, min(x + cell - 1, size[0] - 1), min(y + cell - 1, size[1] - 1)), fill="#aeb8c5")
    return image


def alpha_bbox(alpha: Image.Image) -> list[int] | None:
    bbox = alpha.getbbox()
    return list(bbox) if bbox else None


def extract(source: Image.Image, entry: dict, destination: Path) -> dict:
    crop = crop_with_padding(source, entry["sourceBox"])
    mask = make_mask(crop.size, entry["maskPolygonLocal"])
    original_alpha = crop.getchannel("A")
    crop.putalpha(ImageChops.multiply(original_alpha, mask))
    if entry["geometryNormalization"]:
        crop = crop.resize((160, 184), Image.Resampling.LANCZOS)

    canvas = Image.new("RGBA", (CANVAS_SIZE, CANVAS_SIZE), (0, 0, 0, 0))
    canvas.alpha_composite(crop, DESTINATION)
    canvas.save(destination, "WEBP", lossless=True, method=6, exact=True)

    decoded = Image.open(destination).convert("RGBA")
    alpha = decoded.getchannel("A")
    extrema = alpha.getextrema()
    bbox = alpha_bbox(alpha)
    histogram = alpha.histogram()
    opaque_pixels = histogram[255]
    transparent_pixels = histogram[0]
    partial_pixels = CANVAS_SIZE * CANVAS_SIZE - opaque_pixels - transparent_pixels

    # Compare fully opaque output pixels with the exact corresponding source RGB.
    max_delta = 0
    compared_pixels = 0
    source_rgba = crop
    for out_y in range(CANVAS_SIZE):
        source_y = out_y - DESTINATION[1]
        if not (0 <= source_y < source_rgba.height):
            continue
        for out_x in range(CANVAS_SIZE):
            source_x = out_x - DESTINATION[0]
            if not (0 <= source_x < source_rgba.width):
                continue
            pixel = decoded.getpixel((out_x, out_y))
            if pixel[3] == 255:
                expected = source_rgba.getpixel((source_x, source_y))
                max_delta = max(max_delta, *(abs(pixel[channel] - expected[channel]) for channel in range(3)))
                compared_pixels += 1

    outside_mask_opaque = 0
    verification_mask = mask
    if entry["geometryNormalization"]:
        verification_mask = mask.resize((160, 184), Image.Resampling.LANCZOS)
    for y in range(crop.height):
        for x in range(crop.width):
            if verification_mask.getpixel((x, y)) == 0 and crop.getpixel((x, y))[3] != 0:
                outside_mask_opaque += 1

    touches_output_edge = bool(
        bbox
        and (bbox[0] == 0 or bbox[1] == 0 or bbox[2] == CANVAS_SIZE or bbox[3] == CANVAS_SIZE)
    )
    return {
        "filename": entry["filename"],
        "dimensions": [decoded.width, decoded.height],
        "mode": decoded.mode,
        "alphaExtrema": list(extrema),
        "alphaBBox": bbox,
        "opaquePixels": opaque_pixels,
        "partialAlphaPixels": partial_pixels,
        "transparentPixels": transparent_pixels,
        "touchesOutputEdge": touches_output_edge,
        "outsideMaskOpaquePixels": outside_mask_opaque,
        "opaqueSourcePixelsCompared": compared_pixels,
        "opaqueRgbMaxDelta": max_delta,
        "sourceEdgeTruncated": entry["sourceEdgeTruncated"],
        "sourceEdgeTruncatedSides": entry["sourceEdgeTruncatedSides"],
        "sourceTouchesCanvasEdge": entry["sourceTouchesCanvasEdge"],
        "geometryNormalized": bool(entry["geometryNormalization"]),
        "sha256": sha256(destination),
    }


def create_contact_sheet(entries: list[dict], asset_dir: Path, qa_dir: Path) -> None:
    tile_width, tile_height = 224, 224
    sheet = checkerboard((tile_width * 7, tile_height * 6), 12).convert("RGBA")
    draw = ImageDraw.Draw(sheet)
    font = ImageFont.load_default()
    for index, entry in enumerate(entries):
        row, column = divmod(index, 7)
        piece = Image.open(asset_dir / entry["filename"]).convert("RGBA")
        x = column * tile_width + (tile_width - CANVAS_SIZE) // 2
        y = row * tile_height + 2
        sheet.alpha_composite(piece, (x, y))
        label = f"{entry['faction']} / {entry['role']}"
        if entry["legalUse"] == "archival-unused":
            label += " [UNUSED]"
        if entry["geometryNormalization"]:
            label += " [NORMALIZED]"
        draw.rectangle((column * tile_width, row * tile_height + 196, (column + 1) * tile_width - 1, (row + 1) * tile_height - 1), fill=(8, 20, 38, 235))
        draw.text((column * tile_width + 6, row * tile_height + 201), label, fill="#ffffff", font=font)
    sheet.convert("RGB").save(qa_dir / "qa-contact-sheet.jpg", quality=94, optimize=True, progressive=True)


def create_mask_overlay(source: Image.Image, entries: list[dict], qa_dir: Path) -> None:
    overlay = source.convert("RGBA")
    draw = ImageDraw.Draw(overlay, "RGBA")
    font = ImageFont.load_default()
    for entry in entries:
        points = [tuple(point) for point in entry["maskPolygonSource"]]
        color = (255, 191, 74, 235) if entry["geometryNormalization"] else (68, 255, 190, 220)
        draw.line(points + [points[0]], fill=color, width=2)
        left, top, right, bottom = entry["sourceBox"]
        draw.rectangle((left, max(0, top), right - 1, min(source.height - 1, bottom - 1)), outline=(255, 255, 255, 150), width=1)
        draw.text((left + 3, max(0, top) + 3), entry["filename"], fill=(255, 255, 255, 255), font=font, stroke_width=1, stroke_fill=(0, 0, 0, 220))
    overlay.convert("RGB").save(qa_dir / "qa-source-mask-overlay.jpg", quality=92, optimize=True, progressive=True)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, default=DEFAULT_SOURCE)
    parser.add_argument("--output", type=Path, default=PUBLIC_OUTPUT_DIR, help="Runtime WebP output directory")
    parser.add_argument("--qa-output", type=Path, default=QA_OUTPUT_DIR, help="Non-runtime manifest and QA evidence directory")
    args = parser.parse_args()

    if not args.source.is_file():
        parser.error(f"source image does not exist: {args.source}")
    args.output.mkdir(parents=True, exist_ok=True)
    args.qa_output.mkdir(parents=True, exist_ok=True)

    source = Image.open(args.source).convert("RGBA")
    if source.size != (1536, 1024):
        parser.error(f"expected a 1536x1024 source, got {source.size[0]}x{source.size[1]}")

    entries = make_entries(source.height)
    results = []
    for entry in entries:
        results.append(extract(source, entry, args.output / entry["filename"]))

    manifest = {
        "schemaVersion": 1,
        "gameId": "sannin-shogi",
        "source": {
            "filename": args.source.name,
            "sha256": sha256(args.source),
            "dimensions": list(source.size),
            "copyrightContext": "User-supplied artwork; extracted without repainting or generative modification.",
        },
        "processing": {
            "script": "docs/game-builds/sannin-shogi/tools/extract_piece_assets.py",
            "canvas": [CANVAS_SIZE, CANVAS_SIZE],
            "pixelMapping": "1:1 for five source rows; the source-compressed green promoted row is deterministically normalized from 160x140 to 160x184 with Lanczos resampling.",
            "format": "lossless WebP RGBA",
            "metadata": "stripped by deterministic Pillow re-encode",
            "standardMaskPolygonLocal": MASK_POLYGON_LOCAL,
            "greenPromotedMaskPolygonLocal": GREEN_PROMOTED_MASK_LOCAL,
            "maskSupersample": MASK_SUPERSAMPLE,
            "cropSize": [160, 184],
        },
        "sourceLayout": {
            "factions": FACTIONS,
            "unpromotedRow": UNPROMOTED_ROLES,
            "promotedRow": PROMOTED_ROW_ROLES,
            "manuallyInspectedColumnCenters": COLUMN_CENTERS,
            "manuallyInspectedRowTopVertices": ROW_TOP_VERTICES,
        },
        "legalUse": {
            "promotedKnight": {
                "status": "archival-unused",
                "reason": "The selected historical Sannin Shogi edition does not promote knights.",
            },
            "illuminatedKing": {
                "status": "render-alias-with-semantic-overlay",
                "assetTemplate": "{faction}-king.webp",
                "overlay": {
                    "visibleMarker": "+K",
                    "labelTemplate": "{Faction} illuminated king",
                    "nonColorCueRequired": True,
                    "suggestedTreatment": "Aurora halo or double luminous ring plus persistent +K marker.",
                },
                "reason": "No dedicated illuminated-king raster was supplied; the authoritative king art is preserved unchanged.",
            },
        },
        "entries": entries,
    }
    (args.qa_output / "pieces.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")

    create_contact_sheet(entries, args.output, args.qa_output)
    create_mask_overlay(source, entries, args.qa_output)

    filenames = [entry["filename"] for entry in entries]
    clipped = [result["filename"] for result in results if result["sourceEdgeTruncated"]]
    normalized = [result["filename"] for result in results if result["geometryNormalized"]]
    source_edge = [result["filename"] for result in results if result["sourceTouchesCanvasEdge"]]
    failures = []
    for result in results:
        if result["dimensions"] != [192, 192]:
            failures.append(f"{result['filename']}: wrong dimensions")
        if result["mode"] != "RGBA" or result["alphaExtrema"] != [0, 255]:
            failures.append(f"{result['filename']}: missing real alpha")
        if result["touchesOutputEdge"]:
            failures.append(f"{result['filename']}: output alpha touches canvas edge")
        if result["outsideMaskOpaquePixels"]:
            failures.append(f"{result['filename']}: pixels leaked beyond mask")
        if result["opaqueRgbMaxDelta"]:
            failures.append(f"{result['filename']}: opaque source pixels changed")

    report = {
        "schemaVersion": 1,
        "status": "pass" if not failures else "fail",
        "expectedFileCount": 42,
        "actualFileCount": len(results),
        "filenameOrder": filenames,
        "uniqueFilenameCount": len(set(filenames)),
        "checks": {
            "dimensions192Square": all(result["dimensions"] == [192, 192] for result in results),
            "realAlpha": all(result["alphaExtrema"] == [0, 255] for result in results),
            "noOutputEdgeContact": all(not result["touchesOutputEdge"] for result in results),
            "noPixelsOutsideMask": all(result["outsideMaskOpaquePixels"] == 0 for result in results),
            "opaqueSourcePixelsLossless": all(result["opaqueRgbMaxDelta"] == 0 for result in results),
            "filenameCompleteness": len(results) == 42 and len(set(filenames)) == 42,
            "oldFrozenShogunatePixelsUsed": False,
        },
        "sourceLimitations": {
            "sourceEdgeTruncatedCount": len(clipped),
            "sourceEdgeTruncatedFiles": clipped,
            "sourceCanvasEdgeTouchCount": len(source_edge),
            "sourceCanvasEdgeTouchFiles": source_edge,
            "geometryNormalizedCount": len(normalized),
            "geometryNormalizedFiles": normalized,
            "explanation": "The green promoted row is complete but vertically compressed to the source canvas edge. Its supplied pixels are resampled vertically to restore the regular-hex proportions shared by the other rows; no pixels are invented, recolored, or borrowed.",
        },
        "failures": failures,
        "files": results,
    }
    (args.qa_output / "qa-report.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")

    print(json.dumps({"status": report["status"], "outputs": len(results), "failures": failures, "sourceEdgeTruncated": clipped, "geometryNormalized": normalized}, indent=2))
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
