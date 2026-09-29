# San You Qi — Local Bots and Online Rooms

## Modes

San You Qi now follows the same three-seat play model used by Sanguo Qi.

- **1 player:** one human chooses a kingdom; the other two kingdoms are bots.
- **2 players:** two human kingdoms share the device locally, or occupy two online seats; the third kingdom is a bot.
- **3 players:** all three kingdoms are human-controlled.
- Local two-player mode lets the first player choose both human kingdoms.
- Online rooms assign joining players to the remaining open kingdom seats.

The game always keeps the normal Red → Green → Blue turn structure, skipping a kingdom only after its General has been eliminated by the rules engine.

## Bot difficulty

Three real decision levels are available.

### Easy

- varied legal move selection;
- light preference for captures;
- intentionally shallow.

### Medium

- one-step tactical evaluation with material, promoted Soldiers, development and check pressure;
- ranks candidate moves and normally selects the strongest immediate choice;
- retains slight variety among near-top moves.

### Hard

- selective three-player MaxN search;
- each kingdom is evaluated for its own utility rather than pretending the game is two-player;
- three-ply search with a bounded candidate beam and time budget;
- runs in a Web Worker locally and a worker-thread pool on the server.

Hard is a bounded game bot, not a claim of solved or expert-strength San You Qi play.

## Local play

The setup screen supports:

- human count;
- human kingdom selection;
- second local human kingdom when using two players;
- Easy / Medium / Hard bot difficulty.

Bot turns are computed off the main browser thread. Local games also expose Undo, Reset and return-to-Setup controls.

## Online rooms

Online play uses free guest rooms and does not require a wallet.

Each room has:

- a six-character code;
- private or public visibility;
- three kingdom seats;
- a shared bot difficulty;
- ready state;
- host-only start;
- an option for the host to fill remaining open seats with bots.

Seat credentials are random browser-generated tokens. The raw token is stored only in that browser; the server stores only its SHA-256 hash.

The server is authoritative for online moves:

- every action carries the room revision;
- stale revisions are rejected;
- seat ownership is verified;
- turn ownership is verified;
- the move is revalidated by the generated San You Qi rules engine on the server.

## Reconnection and bot cover

A disconnected human keeps the seat for two minutes.

After the grace period:

- a server bot temporarily covers that kingdom when its turn arrives;
- reconnecting with the original browser token restores control;
- a bot search that became stale because the player reconnected is discarded.

If a player explicitly leaves an active match, that kingdom is handed permanently to a bot so the room can continue.

## Shared rules engine

Frontend source of truth:

- `frontend/src/games/san-you-qi/topology.js`
- `frontend/src/games/san-you-qi/rules.js`
- `frontend/src/games/san-you-qi/bot.js`

Generated server bundle:

- `server/sanyouEngine.cjs`

Regenerate/check with:

- `npm run build:sanyou-engine`
- `npm run check:sanyou-engine`

This keeps browser and server move legality on the same 156-node ruleset.

## Online implementation

Frontend:

- `frontend/src/games/san-you-qi/SanYouQiApp.jsx`
- `frontend/src/games/san-you-qi/onlineClient.js`
- `frontend/src/games/san-you-qi/bot.worker.js`

Server:

- `server/sanyouService.js`
- `server/sanyouBotPool.js`
- `server/sanyouBotWorker.js`
- `server/sanyouBackendBootstrap.js`

Protocol prefix:

- `sy_`

Room events include `sy_room_create`, `sy_room_join`, `sy_room_ready`, `sy_room_start`, `sy_game_state`, `sy_game_action`, `sy_room_leave`, and `sy_room_list`.
