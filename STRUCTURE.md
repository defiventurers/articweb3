# Arctic Game Kingdoms Presentation Architecture

## Boundary

The frozen world is a landing/presentation layer around the existing application. It owns world composition, discovery, focus, box animation, collection mode, and transition choreography. It does not own game rules, multiplayer state, wallet state, authentication, authoritative validation, or game-engine routes.

## Proposed modules

```text
frontend/src/
├── arctic/
│   ├── ArcticKingdomsLanding.jsx       # world shell and selected-box orchestration
│   ├── arcticGameRegistry.js           # adapters from GAME_CATALOG to world config
│   ├── arcticWorld.css                 # isolated landing/world visual system
│   ├── components/
│   │   ├── GameWorld.jsx               # layered environment and box placement
│   │   ├── GameBox.jsx                 # skeletal physical box object
│   │   ├── GameBoxOpening.jsx           # reusable opening/reveal state choreography
│   │   ├── GameBoardReveal.jsx          # configurable board-reveal visual beat
│   │   ├── CollectionMode.jsx           # fast-access catalog drawer
│   │   └── ArcticAmbient.jsx            # snowfall, aurora, fog, light, and motion
│   └── hooks/
│       ├── useWorldExploration.js      # pointer/touch/keyboard camera offset
│       ├── useGameBoxFocus.js          # focus and hover state
│       └── useReducedMotion.js         # accessibility/performance guard
```

The first implementation intentionally uses DOM/CSS 3D primitives rather than adding a large rendering dependency to a mature application that currently has no WebGL stack. The interfaces are named so a future Three.js or React Three Fiber implementation can replace the internals without changing the catalog adapter, route handoff, or GameBox artwork contract.

## Registry contract

Each world entry is derived from a real catalog entry and supports:

```js
{
  gameId,
  title,
  status,
  available,
  position: { x, y, depth },
  rotation,
  scale,
  frontArtwork,
  sideArtwork,
  topArtwork,
  boxMaterial,
  theme,
  revealConfig
}
```

Artwork paths are optional. When absent, `GameBox` generates a procedural title/mark treatment from the catalog entry. Replacing a placeholder with final artwork should require only adding an asset file and updating the corresponding registry entry.

## Launch contract

The landing component receives callbacks from `App.jsx` rather than importing or rewriting game engines:

```js
<ArcticKingdomsLanding
  onSelectGame={(gameId) => selectCatalogGame(gameId)}
  onExit={() => exitToLibrary()}
/>
```

For a playable game, the same `selectCatalogGame()` route mapping is called after the box sequence completes. For a coming-soon entry, the same callback opens `GamePreviewScreen`. Direct query-string boot remains handled by `App.jsx`.

## Fallback behavior

The world is progressively enhanced. If the browser has reduced motion, a narrow viewport, or limited rendering capability, the implementation reduces parallax, particle count, and transform depth while keeping every game box, title, status, collection control, and route action available in standard DOM controls.
