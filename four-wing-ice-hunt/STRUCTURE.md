# Structure: Four-Wing Ice Hunt

## Application Layer

`client/src/App.tsx` owns screen navigation and game-mode selection. It presents the lobby, online room lobby, rules screen, and playable game screen. React provides the user-interface frame and stores screen-level state only.

## Gameplay Layer

`client/src/game/fourWingRules.ts` owns the four-wing graph, initial setup, phase transitions, legal-action generation, capture-chain handling, win conditions, and counts. `client/src/game/fourWingBot.ts` selects deterministic bot turns from legal actions. Both modules remain independent of React rendering.

## Rendering Layer

`client/src/components/FourWingBoard.tsx` renders the graph as an accessible SVG/HTML board. It receives a plain game state and emits node selections. The component applies the generated ice-board surface as a decorative texture while the SVG lines remain the mechanical source of truth.

## Presentation Layer

`client/src/index.css` provides the reference-fidelity Arctic heritage-console theme. Generated `/manus-storage/` assets are used for the full-page texture, board surface, token art, and crest. The page intentionally retains the reference’s compact mode menu and its distinct visual hierarchy.

## Browser-Room Layer

The Online Multiplayer UI uses a room code stored in browser local storage and synchronised through storage events. It preserves the existing lobby workflow within a static deployment, allowing another tab or same-origin browser session to join the shared room state. It does not claim a server-backed global matchmaking service.
