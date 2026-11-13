# Games → Adventure reference review

Baseline: `8ad5a8f3030954e22606de514ca598aaa0d75324`, branch `codex/games-adventure-reference`.
Target: user-supplied `image(20261113-202022).png` (768×1536). This image governs the redesign; the photographed phone status/navigation bars are outside the web content.

## Verified assets

| Target element | Existing asset | Result |
| --- | --- | --- |
| Four-kingdom Chaturanga hero | `frontend/public/early/art/chaturanga-heritage-v1/cover.webp` | Matching illustration found; reuse without character redraw |
| Company logo geometry | `frontend/public/early/art/home-v1/brand-logo.webp` | Existing approved Home logo; preserve identity. Target requests gold presentation |
| Palace, staircase, lake, mountains and aurora | No matching standalone asset found among current Home, onboarding, ice, hall and arrival backgrounds | Missing. Existing harbour backgrounds depict a different environment; do not substitute them |
| Crown/navigation/chips/buttons | Real HTML/CSS with existing icon components | Keep labels, hit areas and progress dynamic; never use screenshot controls as live buttons |

The launch-v1 hall README marks its hall backgrounds DRAFT; they are not approved substitutes for this reference.

## Reference measurements

Coordinates refer to the supplied image and guide proportions, not rigid CSS positions.

| Region | Reference bounds (px) | Implementation direction |
| --- | --- | --- |
| Brand and controls | y 55–160 | Compact shared header; preserve actual callbacks |
| Adventure / All games | y 186–252 | Two horizontal buttons, 44px minimum touch height |
| Hall filters | y 271–325 | Horizontal scrolling chips, no page overflow |
| Star divider | y 344 | Decorative, hidden from accessibility tree |
| Main hero | x 20, y 365, w 728, h 445 | Fluid width with 12–16px phone margins; preserve board and characters |
| Main actions | y 833–910 | Two equal buttons; existing play/resume and learn callbacks |
| Palace environment | y 925–1165 | Separate responsive background asset; no baked UI |
| Previous / status / Next | y 1150–1340 | Dynamic conquest status and existing sequence bounds |
| Bottom navigation | y 1366–1470 | Five destinations; fixed bar with safe-area clearance |

## Current runtime integration

The retained web runtime implements `GamesAdventure` inside `frontend/public/early/app.js`; it is not the same implementation as the newer tracked `GamesViews.jsx`. Use a bounded, reversible presentation adapter on the accepted runtime. Keep its catalogue, scope storage key, `isOpen`, conquest stamps, play/learn callbacks, hall membership, swipe/keyboard navigation and introduction component. Do not replace the retained runtime with a full newer App build.

Move story text/field notes into Discover the story, keep active online resume available, and show the crown only from actual conquest stamps. Test fresh, conquered, locked and resumed states for all nine catalogue entries.

## Review gate

No player-runtime edits or live deployment have been made. Faithful visual acceptance requires the clean palace/environment layer used in the target, or an explicitly accepted recreation of that layer. Do not ship a mismatched harbour or a screenshot with painted buttons. Once the layer is available, prepare the candidate and compare actual 360px, 393px and tall phone renders before requesting deployment review.

Reference SHA-256: `6c06fa357666d997852d0fb5c622e25c83f3f8828a1d665add28da12e92c9ea8`.
Hero dimensions: (1440, 960).
