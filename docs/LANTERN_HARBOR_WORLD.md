# Lantern Harbor browser prototype

Base: main at `191d816a5abb1bdd1357cdd57d4a05dfb8747b6c`. Branch: `feature/lantern-harbor-world`.

Run the existing frontend's `npm run dev:testnet` and open `/harbor.html`, or select Explore the Kingdoms from the browser welcome screen. Quick Play opens the existing strategy catalogue. The guest world entry initializes React and loads the Three.js renderer on entry. The native WebView and early-passport package have separate entry points. The current browser packaging script generates the /play shell from mobile sources before Vite builds its HTML entries. Keep generated engine files, app packages and hosting config out of this change.

## Assets

| Asset | Source and rights record | Review status and use |
| --- | --- | --- |
| Four penguin portraits | Existing project-supplied WebP files in frontend/public/assets/launch-v1/hosts. Their README records the four user reference files. No separate third-party commercial grant is recorded. | Approved identity references for selection. Use the full portraits. |
| Walking figures | Original procedural Three.js volumes in renderer.js, keyed by existing stable IDs. | DRAFT movement proxies for Nova, Rocco, Piko and Ziggy. No approved rigs found. |
| Harbor, ship, castle, temple, pavilion, palace, council hall, board display, trees, mountains, signs and sky | Original procedural geometry, shader and lettering in scenery.js. Three.js uses the existing MIT-licensed package. | DRAFT fantasy architecture. The two supplied images guide atmosphere. The display table is scenery. |
| Heritage text | National Museums Scotland, “Chess and Ludo: Board games with South Asian origins” (linked at the temple), repository catalogue and game implementations. | Arctic Dominion is a modern dice adaptation. Heritage Arcade’s Chaturaji is a separate modern team variant. |

## Destinations

| Hall | Existing destination |
| --- | --- |
| Chaturanga Temple | Arctic Dominion cover and movement guide; local Chaturaji uses the existing Heritage Arcade component for table 5. |
| Xiangqi Pavilion | Heritage Arcade, table 25, query `table=xiangqi`. |
| Shogi Palace | `shogi-frozen-shogunate`. |
| San You Qi Council Hall | `san-you-qi` and its movement guide. |

Keys, touch input, camera and location are client-side. The URL carries the originating hall so a game can return to its doorstep. The hall directory remains accessible on initialization failure and context loss. No new account, paid asset, remote world service or contract is required.

## Verification

Run `node --test frontend/unit/lantern-harbor.node.test.js` for doors and collisions. The dedicated Playwright suite exercises a keyboard walk, touch movement inside the temple, a legal local Chaturaji turn, return to the doorstep, context loss and the portrait browser entry. The PR browser check captures screenshots and a WebM. Physical Android/iOS inputs, sustained frame times and live multiplayer require separate device acceptance.
