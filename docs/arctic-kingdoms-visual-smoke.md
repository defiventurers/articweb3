# Arctic Game Kingdoms Visual Smoke Test

## 2026-08-14 — desktop sandbox inspection

The default homepage at `/?skipLoader=1` rendered the new Arctic Game Kingdoms world successfully. The browser exposed 21 interactive game boxes, the focused Arctic Dominion panel, the Collection control, the global audio control, and the expected frozen environment layers. The visual composition showed the ice citadel, northern lights, mountains, frozen water, settlement accents, ambient Dominion pieces, and distributed physical-box placeholders.

A click on the Arctic Dominion box successfully started the opening sequence. The inspection captured the physical lid opening, title treatment, return control, and in-progress handoff state. This confirms that the world event wiring and shared opening layer activate without a runtime error. The next inspection must verify the final playable route handoff, a coming-soon handoff, collection mode, and small-screen behavior.

The Arctic Dominion opening completed successfully and routed to the pre-existing cover experience at `/?skipLoader=1&game=arctic-dominion`. The existing cover art, `Tap anywhere to continue` control, and `All Games` return control rendered normally. This verifies that the new landing layer handed off through the original `selectCatalogGame()` route logic rather than replacing the game flow.

Collection mode opened successfully as a narrow overlay beside the world. It exposed all 21 catalog entries with distinct Play or Coming Soon status labels and left the frozen environment visible as context. This confirms that a fast-access catalog exists without reverting the landing page to a grid-first experience.

Selecting Crown Run from collection mode reached the existing game-preview experience after the shared opening sequence. The preview correctly identifies the game as in development and states that no unfinished flow is exposed, confirming that coming-soon titles preserve the established safe preview route rather than attempting to launch a game engine.

Accessibility inspection found 22 labelled button controls on the landing page, including the world’s selectable game controls and global audio control. The rendered page includes a polite live region for state changes, uses empty alt text for four decorative ambient images, and exposes the `.reduce-motion` styling hook. The component selector used in the audit did not match the final runtime class name, but the browser’s accessibility surface confirmed labelled buttons for all 21 game-box interactions.

## Build and regression validation

Both `npm run build:testnet` and `npm run build:mainnet` completed successfully after the landing integration. The existing Ruma rules suite also passed all six tests. The production build retains pre-existing non-blocking warnings about a large application chunk and an ineffective dynamic import for `ProfileScreen`; the Arctic presentation layer did not introduce a build failure or browser-console error.

The source diff passed `git diff --check`. A root `.gitignore` was added to exclude local dependencies, build output, logs, local environment files, and Playwright artifacts from version control.
