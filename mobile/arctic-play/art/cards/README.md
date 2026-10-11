# Piece-led game cards — Arctic Play 1.2

These six images were created using the built-in Image Generation tool, with
the actual game-piece artwork as visual references. They are decorative covers;
gameplay sprites, board geometry and rules are unchanged.

| Card | Important pieces |
| --- | --- |
| `shogi-card-v2.webp` | Red King and Blue Rook on pentagonal shogi tiles |
| `sannin-card-v2.webp` | Red, Green and Blue Kings on hexagonal tiles |
| `sanguo-card-v2.webp` | Blue General, Red polar-bear Chariot and Green unicorn Horse |
| `sanyou-card-v2.webp` | Green General, lantern-carrying Fire and Blue Flag |
| `yanyi-card-v2.webp` | Yellow Han Emperor and Blue unicorn Horse |
| `xiangqi-card-v2.webp` | Red General and Blue walrus Cannon |

The app assets are 960 × 640 WebP files, quality 86. The original generation was
1536 × 1024. The source images' faces, faction colors, crowns, robes, horns,
props and tile shapes guided each composition. Invented lettering, UI, boards,
checkerboards and magenta transparency artifacts were excluded.

`prompt-set.json` contains the exact six prompts and every reference path.
`manifest.json` records the images and important pieces. These versioned files
are separate from the earlier board previews, which remain in quick starts.

Run `npm run build --prefix mobile/arctic-play` to bundle the images. Dark navy
tiles, readable captions and a gentle bottom gradient frame the artwork in the
app. Dark mode is the default; Profile's Dark mode switch saves a light option.
