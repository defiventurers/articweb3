# Arctic Game Kingdoms Landing Transformation Plan

## Objective

Transform the existing `articweb3` landing experience into a premium, cinematic frozen game world while preserving the current application contract: all catalog game IDs, `?game=<id>` entry behavior, playable engines, coming-soon previews, multiplayer, authentication, wallet flows, backend validation, contracts, developer routes, and existing game UI.

## Repository audit findings

The repository currently contains a React/Vite frontend, a Node/WebSocket realtime server, shared code, and smart-contract code. The frontend has a centralized catalog in `frontend/src/data/gameCatalog.js` with 21 real games. Nine are currently playable through dedicated React game components, while the remaining catalog entries use the existing preview state. The primary app state machine lives in `frontend/src/App.jsx`, and `?game=<id>` is interpreted at startup through `getCatalogGame()` before selecting a screen.

The project does not currently contain a Three.js, React Three Fiber, Drei, GSAP, Babylon, or other WebGL scene implementation. Its current landing/library experience is primarily image-based and CSS-driven, with existing loading, audio, responsive-image, wallet, and game-routing infrastructure that should be reused rather than replaced.

## Preservation rules

1. Keep `frontend/src/data/gameCatalog.js` as the source of truth for game identity and availability.
2. Do not rename or delete a catalog ID.
3. Keep the playable route mappings in `App.jsx` unchanged unless the new landing layer calls the same handlers.
4. Preserve direct `?game=<id>` entry, including playable games, coming-soon games, and the special multiplayer/developer query paths.
5. Preserve the existing `FrostLoadingScreen`, route lazy-loading, `soundManager`, Web3 provider, wallet flows, realtime room flow, game engines, backend, and contracts.
6. Make the new world a presentation-layer landing shell. It must hand off to the existing cover, preview, and playable game components.
7. Avoid installing unnecessary dependencies; prefer CSS/canvas-compatible primitives unless a focused dependency is demonstrably required.

## Staged implementation

### Stage 1 — Foundation

Create a configuration-driven world model, a full-screen landing shell, a responsive camera-like pointer/touch exploration layer, and a premium arctic visual system. Add a visual reference record to `ASSETS.md`.

### Stage 2 — Physical game boxes

Implement a reusable skeletal `GameBox` component with front, side, top, thickness, frost, snow, hover/focus, lift, rotation, and open-state hooks. Keep artwork as replaceable configuration, not component logic.

### Stage 3 — World composition

Place all 21 catalog games in a non-grid frozen environment. Use the actual catalog values and make Arctic Dominion the flagship near the central castle. Reuse existing Arctic Dominion assets where they naturally fit as 2D/overlay accents and future inhabitants.

### Stage 4 — Interaction and launch

Implement selection/focus behavior, a cinematic opening state machine, configurable board-reveal beats, and route handoff. Playable games must use the existing route handlers; coming-soon games must use the existing preview behavior and never launch a nonexistent engine.

### Stage 5 — Collection and mobile

Add a minimal collection drawer for fast access to all 21 games, mute/audio affordances, accessible labels, keyboard support, reduced-motion behavior, touch exploration, mobile layout adaptations, and performance guards.

### Stage 6 — Verification

Run testnet build, existing focused unit tests, route smoke checks, asset checks, and a visual/manual pass. Verify that all 21 boxes render from the registry, direct game-query entry remains intact, playable and coming-soon behavior remain distinct, and no backend or gameplay code was modified.

## Verification checklist

- [ ] All 21 catalog games appear in the world.
- [ ] All catalog IDs remain unchanged.
- [ ] All playable games still launch through their existing components.
- [ ] Coming-soon games still open the existing preview behavior.
- [ ] `?game=<id>` continues to work.
- [ ] Arctic Dominion remains the flagship and launches correctly.
- [ ] Existing multiplayer/authentication/wallet flows remain untouched.
- [ ] Existing game engines, server validation, backend, and contracts remain untouched.
- [ ] Desktop and mobile landing layouts work.
- [ ] WebGL/capability fallback remains available through the DOM/CSS world shell.
- [ ] Collection mode works.
- [ ] Hover/focus/open/reveal hooks work.
- [ ] Build and existing tests pass.
