# Shanshui asset handoff

New asset root: `frontend/public/assets/games/shanshui-xiangqi/`.
Original red, blue and green Yan Yi files are referenced directly and unchanged:
`frontend/public/assets/heritage-arcade/sanguo-yan-yi/pieces/{army}-{role}.webp`.

| Deliverable | Paths | Use |
| --- | --- | --- |
| Light board | `board-light.svg`, `.png`, `.webp` | Exact empty board, 1536 × 1536 |
| Dark board | `board-dark.svg`, `.png`, `.webp` | Same geometry and coordinates |
| Starting positions | `starting-position-{light,dark}.{png,webp}` | Derived from the actual initial engine state, Red at bottom right |
| Purple fourth team | `pieces/purple-{king,advisor,elephant,horse,chariot,cannon,soldier}.webp` | Seven 512 × 512 transparent tokens |
| Decorative master | `ornamental-underlay.webp` | Generated icy fortress border; contains no playable geometry |
| Asset manifest | `manifest.json` | Identity, dimensions, SHA-256 and original file references |

Board grid: origin (120,120), step 108, thirteen points on both axes, last
point (1416,1416), piece footprint 102. SVG is the editable geometry overlay; PNG is a generated review export,
and WebP is the complete runtime asset with its decorative border. PNG exports
are reproducible intermediates; the source overlays and complete WebP assets are committed. `npm run assets:shanshui` rebuilds boards and
starting-position images deterministically from the checked-in decorative
underlay and canonical engine. The generated border does not determine legal
geometry. Rotation is a presentation transform only.

Two infantry roles intentionally use the same established soldier art. Mountain
and river badges, accessible names and direction arrows distinguish them. No
other Yan Yi mechanics, Han assets or mascot identities are reassigned.

New purple art and the border are generated assets for review; they have not
been labelled APPROVED. Existing referenced designs remain the governing
references. This handoff makes no new claim about third-party commercial rights.

## Generation method and exact prompt templates

Built-in image generation was used, one call for each purple role. Each target
was the corresponding existing `blue-{role}.webp`, visually inspected first.
Outputs were checked for transparency and exported to match the existing
512px runtime dimensions, retaining alpha. No existing art was overwritten.

Purple piece prompt, with ROLE replaced by each of the seven roles:

> Use case: precise-object-edit. Asset type: a single transparent circular game token, matching the Antarctic Kingdoms Sanguo Yan Yi Qi piece set. Edit target: the supplied blue ROLE token. Create the fourth-team PURPLE ROLE version. Change ONLY the blue faction colours (outer blue enamel ring, dark blue inner textured field, blue jewels, blue clothing or mane where present) to rich royal amethyst purple #9653DB with violet highlights and deep purple shadows. Preserve the exact circular silhouette, framing, proportions, pose, face, object design, metallic gold and silver, white skin/fur, eyes, all fine details and existing texture. Do not redesign the piece or add any elements. Keep it centered, one token only, full token visible, square 1:1 output, transparent outside the disc. No text, no labels, no watermark. The source black/charcoal metal rim stays charcoal; no background shadow beyond the disc.

Decorative underlay prompt; the Yan Yi board was a style reference only:

> Use case: stylized-concept. Asset type: decorative underlay for the NEW Shanshui Xiangqi board in Antarctic Kingdoms. The reference is STYLE ONLY, not target geometry. Create one perfectly square, orthographic directly-overhead icy game-table border in the same polished premium illustrated style: Chinese fortified ice walls, small elegant pagoda roofs, snow-capped grey mountain fragments and carved silver frost edging, cool sapphire and white, restrained tiny gold details. ALL architectural decoration MUST be confined to the outermost 7 percent strip along the four edges. The middle 86 percent is an entirely empty, flat, softly frosted pale ice square with no objects or markings. Exactly top-down, no perspective, no shadows or towers extending into the empty central square. NO game grid, NO lines, NO circles, NO palaces, NO tokens, NO pieces, NO characters, NO text, NO logos. This is only an ornamental underlay; the exact playable grid and terrain will be rendered separately in code. Full-bleed square framing.
