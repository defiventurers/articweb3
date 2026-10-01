# Sannin Shogi: on-device multiplayer, bots and online rooms

Sannin Shogi now uses the same canonical gameplay engine in every mode. The 127-cell board, 54-piece setup, movement, captures, drops, promotion, castling, illumination, alliances, Garden victory, mate, elimination, repetition and no-move draw rules are unchanged by networking.

## On this device

The setup screen supports:

- 1 human + 2 command bots;
- 2 humans + 1 command bot;
- 3 humans in hot-seat play;
- First, Middle or Last as the primary human seat;
- Easy or Medium bot difficulty when bots are present;
- no opening alliance, or the canonical Middle + Last opening pact.

Local Undo remains available only for on-device matches.

## Online rooms

Online Sannin is server-authoritative and uses the dedicated `ss_` WebSocket protocol.

Room actions:

- `ss_room_list`
- `ss_room_create`
- `ss_room_join`
- `ss_room_ready`
- `ss_room_start`
- `ss_game_state`
- `ss_game_action`
- `ss_room_leave`

The browser may display legal destinations from the shared rules engine, but the server is the authority. Every submitted action is checked against the current revision, active seat, turn and canonical `applyAction` result.

Rooms support:

- private invite links and six-character room codes;
- public lobby discovery;
- 1, 2 or 3 intended human seats;
- bots filling all unclaimed seats;
- host-only start after connected humans are ready;
- hashed seat tokens stored only as hashes on the server;
- reconnect to the reserved seat using the local seat token;
- a 120-second disconnect grace before bot coverage;
- a player leaving a live match permanently handing that army to a bot;
- persisted room snapshots and ruleset-version rejection on incompatible restore.

## Engine parity

Browser source of truth:

- `frontend/src/games/sannin-shogi/hex.js`
- `frontend/src/games/sannin-shogi/rules.js`
- `frontend/src/games/sannin-shogi/bot.js`

Generated server bundle:

- `server/sanninEngine.cjs`

Regenerate or verify it with:

```bash
cd frontend
npm run build:sannin-engine
npm run check:sannin-engine
```

The generated server engine must remain byte-for-byte in sync with the browser source.

## Server integration

Sannin has its own service rather than reusing Sanguo or San You room schemas:

- `server/sanninService.js`
- `server/sanninBackendBootstrap.js`
- `server/tests/sannin-online.test.js`

The production all-games bootstrap registers the service and reports `supportsSanninShogi: true` from the lobby health response.

## Deployment

No wallet, smart contract, entry fee, staking flow or new paid API is required for Sannin online play.

Deployment reuses the existing Arctic Dominion lobby and `VITE_WS_URL`:

1. deploy the Node lobby from the same commit so the `ss_` protocol and Sannin rules bundle are available;
2. confirm the lobby health response reports Sannin support;
3. deploy the frontend using the same configured WSS endpoint;
4. verify private invite reconnect, a 3-human room, a 2-human + bot room, and a solo + 2-bot room.

The server should be deployed before the frontend so clients never expose Online rooms against a backend that does not yet recognize the Sannin protocol.

## Source boundary

Online rooms, room codes, ready states, bots, reconnect handling and server persistence are modern Arctic Dominion product features. They are not presented as historical Sannin Shogi rules.
