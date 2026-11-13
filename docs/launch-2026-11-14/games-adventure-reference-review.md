# Games → Adventure reference review

Baseline: `8ad5a8f3030954e22606de514ca598aaa0d75324`, branch `codex/games-adventure-reference`.
Target: user-supplied `image(20261113-202022).png` (768×1536). This image governs the redesign; the photographed phone status/navigation bars are outside the web content.

## Verified assets

| Target element | Existing asset | Result |
| --- | --- | --- |
| Four-kingdom Chaturanga hero | `frontend/public/early/art/chaturanga-heritage-v1/cover.webp` | Matching illustration found; reuse without character redraw |
| Company logo geometry | `frontend/public/early/art/home-v1/brand-logo.webp` | Existing approved Home logo; preserve identity. Target requests gold presentation |
| Palace, staircase, lake, mountains and aurora | No matching standalone asset found among current Home, onboarding, ice, hall and arrival backgrounds | Recreated as `art/adventure-review-v1/palace.webp` for visual review; existing harbour backgrounds were not substituted |
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

## Implementation and acceptance evidence

Implemented on `codex/games-adventure-reference` against baseline `8ad5a8f3030954e22606de514ca598aaa0d75324`. The review build is additive: the tracked production `app.js`, `app.css`, bootstrap and service worker remain unchanged. The adapter fails on missing/duplicate anchors, parses the complete output and reverses every declared replacement to verify source integrity.

- Compact gold brand/header; cyan Adventure tab; horizontal hall filters and star divider.
- Existing approved hero and characters; dynamic era, title, expedition number and actual conquered stamp.
- Contextual play/resume/unlock and learn callbacks retained. Introduction retains field notes.
- Recreated palace/lake backdrop; connected gold navigation; earned crown only; fixed five-item navigation.
- No catalogue ID/order, engine, rules, wallet, account, server, access policy or progress-store changes.

### Reproduce

```sh
npm ci --prefix mobile/arctic-play/build-deps --ignore-scripts --no-audit --no-fund
node mobile/arctic-play/review/build-adventure-review.mjs /tmp/adventure-review
node mobile/arctic-play/review/build-fixture.mjs /tmp/adventure-review
node mobile/arctic-play/tests/heritage-runtime-ui.mjs /tmp/adventure-review/dist/early/app.js
node --test mobile/arctic-play/tests/heritage-intro.test.mjs mobile/arctic-play/tests/incremental-pwa.test.mjs
```

Serve the separate review directory using the supported static preview runner. Its root shows before/after, viewport and explicitly labelled sample-state controls. `dist/early/` contains the full candidate runtime; the isolated fixture replaces only its bootstrap for presentation inspection. Fixture play/learn/profile/install destinations are labelled callback indicators, not authenticated flows. Its dedicated sample progress scope never changes player progress.

### Results

- Four full candidate navigation groups passed: approved Home, all nine introduction/return flows, hall filtering, and original art/navigation.
- Eight existing heritage/PWA tests passed; one baseline-dependent integration was skipped by that invocation.
- Browser checks: 360×800, 393×852 and 393×960; content/dock clears bottom navigation, no horizontal page overflow. The 360px desktop frame has a scrollbar; it remains usable.
- Fresh/unconquered and labelled conquered examples; locked Xiangqi; Next/Previous bounds; hall filtering; All games; dark/light toggle checked.
- Screenshot files include the iframe's 1px border on each side. Saved labels indicate CSS viewport dimensions.

| Evidence | File |
| --- | --- |
| Before, 393×852, sample conquered | [Before](evidence/adventure-before-393.jpg) |
| After, 393×852, sample conquered | [After](evidence/adventure-conquered-393.jpg) |
| After, 360×800 | [360](evidence/adventure-conquered-360.jpg) |
| After, 393×960 | [Tall](evidence/adventure-conquered-tall.jpg) |
| Fresh/unconquered | [Fresh](evidence/adventure-fresh-393.jpg) |

## Review gate and remaining limits

Implementation is ready for visual review, not published. The new palace is an AI recreation of the supplied environment, not the original clean layer; gold frames are responsive CSS/vector approximations. Accept those visuals before integrating the adapter into the production packaging/deploy path. Do not merge or deploy automatically. Physical Android/Safari, real signed-in resume/multiplayer, PWA installation and live launch acceptance remain unverified. The CSS keeps the existing resume callback/banner; the isolated screenshots do not demonstrate a real saved online seat.

Reference SHA-256: `6c06fa357666d997852d0fb5c622e25c83f3f8828a1d665add28da12e92c9ea8`.
Hero dimensions: (1440, 960).
