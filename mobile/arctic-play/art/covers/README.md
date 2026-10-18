# Arctic Play cover assets — v1.1.0

Six decorative environments were created with the built-in image-generation tool.
They are fictional Arctic scenery, not historical reconstructions. Each shipped
scene is a 960 × 640 WebP, compressed at quality 85 for Android.

Boards and pieces are not generated. `scripts/build-covers.mjs` renders transparent
640-pixel-wide WebP thumbnails from the canonical Heritage Arcade adapters, real
starting positions and the existing approved sprites. Every board has its actual
cell count and initial army. Existing artwork and character identities are preserved.

The build produces `{id}-board-v1.webp` and copies `{id}-scene-v1.webp` into Android
assets. `manifest.json` records the board geometry and army counts. The app composes
those layers with accessible titles, player counts and distinguishing play details.

## Prompt template

Replace {id} and {scene} using the prompt set below. References supplied to the
image tool: the existing Sannin Shogi board and Yan Yi Arctic board, for style only.

Use case: stylized-concept. Asset type: decorative environment background for the {id} game card in the Arctic Play Android app. Create one polished horizontal landscape illustration, 3:2 ratio, around 1536 by 1024 pixels. Scene: {scene}. Style: premium arctic strategy game illustration, softly sculpted luminous ice, charming miniature architectural scenery, clean readable forms, crisp edges, restrained gold filigree. The attached boards are style and palette references only. Put architectural detail in the top quarter and left edge; keep the center-right region spacious and lower third quiet/dark for an exact gameboard layer and white title added by the app. Camera: low miniature environment illustration, no actual gaming surface. IMPORTANT: Do not draw a gameboard, board cells, playing pieces, characters, penguins, a grid, hexagon lattice, chessmen, interface elements, buttons, numerals, letters, logos or text. This is scenery only; exact boards and approved characters will be composed by the app. Deliver one single seamless background, no panels, no sheet, no border. Preserve this calm cohesive premium Arctic palette and illustrative style.

## Scene prompt set

### shogi

a snow-covered Japanese mountain pavilion with elegant timber beams and a warm amber lantern, a clean open flat frost-blue foreground, muted golden sun through icy pine trees, subtle deep red and blue accents on two distant fabric standards, refined and welcoming

Saved app asset: `shogi-scene-v1.webp`.

### sannin

three small snow-covered Japanese pavilion roofs surrounding a luminous empty open clearing, faceted ice cliffs, emerald and violet aurora, three distant subtle red green and blue fabric standards, cool indigo and silver palette, no hexagons or grids

Saved app asset: `sannin-scene-v1.webp`.

### sanguo

three distant Chinese-inspired ice fortress gates on three rocky promontories converging toward one open frozen valley, a tiny red standard at one gate, green at another, blue at another, deep teal sky, cobalt ice, quiet strategy-game mood

Saved app asset: `sanguo-scene-v1.webp`.

### sanyou

three snow-covered Chinese-inspired gate towers around a spacious open icy plaza, tiny red green and blue fabric banners and two elegant distant golden braziers glowing with orange fire, arctic emerald and cyan palette, a distinct green-turquoise sky, no gameboard markings

Saved app asset: `sanyou-scene-v1.webp`.

### yanyi

a luminous small golden imperial palace in the far center framed by three distant arctic citadels with subtle red blue green standards, majestic yellow-gold light on the central palace, purple-indigo evening sky and crisp blue ice, empty spacious foreground, regal and calm

Saved app asset: `yanyi-scene-v1.webp`.

### xiangqi

two beautiful snow-covered Chinese-inspired palace silhouettes separated by a sinuous glowing blue river far in the background, subtle red fabric standard on one bank and blue on the other, red-coral twilight reflecting on navy ice, wide open frost-blue foreground

Saved app asset: `xiangqi-scene-v1.webp`.

## Rebuild

Run `npm run build --prefix mobile/arctic-play` from the repository root.
The cover build rejects empty image layers. The tests check cover visibility,
canonical cells and starting piece counts. No generated geometry or lettering
is used in the boards or UI.

