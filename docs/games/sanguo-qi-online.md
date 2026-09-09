# Sanguo Qi: local players, bots and online rooms

Open `?game=heritage-arcade&table=sanguo` to go directly to setup. Invite links append `&room=ABC234`.

## Player experience

- **1 player:** one human and two bots. Choose the human kingdom.
- **2 players:** two humans and one bot. On one device, choose both human kingdoms; online, invite a friend.
- **3 players:** three humans, sharing a device or occupying three online seats.
- **Easy / Medium / Hard:** a shared difficulty applies to bot seats. Easy samples legal moves with a capture preference; Medium evaluates material, development and threats; Hard uses iterative MaxN search up to three plies, considering each rival's own utility, with a bounded beam and time budget. Difficulty changes actual decisions, not animations or thinking delay. Hard is a selective search, not a claim of expert-strength play.
- Standard setup remains 48 pieces. Optional Bannermen use the existing approved 54-piece setup.
- Online rooms are free guest games. A display name is sufficient. They do not use wallets, entry fees, transactions or paid services.
- Private rooms are accessible by an invite link or six-character code. Public rooms appear in the Sanguo lobby. All present humans must mark ready; only the host starts. The host can explicitly fill unoccupied seats with bots.
- Reloading or reconnecting from the same browser restores the seat. Tokens are saved locally, never included in invitation URLs. After a two-minute disconnect, a bot covers that player's turns while another human is connected. Reconnecting reclaims control and invalidates stale bot work. An entirely disconnected room pauses bot scheduling.
- Local Undo returns to the position before the last human action, including intervening bot turns. Online undo/reset are unavailable. Resignation is explicit and confirmed.

## Desktop and phone match table

- Desktop play uses the available viewport height with a 52 px toolbar and one independently scrolling match panel. The SVG fits both dimensions without stretching, cutting off the board, or changing the approved 135 positions. Focus view hides the panel; Fullscreen expands the entire match, including confirmation dialogs.
- The phone/tablet layout (up to 900 CSS px) keeps the battlefield in the viewport. Three compact kingdom buttons open a native bottom drawer for player details, the piece inspector and history. Portrait and short landscape layouts include safe-area spacing and touch-sized controls.
- Click or tap a piece and then a highlighted destination, or drag it to a legal target. Legal empty destinations use dots; enemy capture targets use amber corner brackets. Invalid drops snap back. Escape cancels selection. Enemy pieces can be inspected without gaining control of them.
- Zoom with the on-screen controls, mouse wheel or two-finger pinch (100–250%). Pan a zoomed board by dragging its background, or with arrow keys when the board is focused. Keyboard + / − zooms; F and Fit board restore the original complete view. A pinch cancels a pending piece drag. The camera does not rotate or reset when another kingdom takes its turn.
- Selection, keyboard focus, the latest move's endpoints and checked Generals have distinct marks. The selected/hovered/focused piece inspector uses that piece's original faction artwork and shows its current controller. The complete move guide and field manual open in a dialog without replacing the match.
- All three kingdoms' accepted moves appear in a bounded client-side journal. It survives opening room details during this visit; local Undo removes the corresponding human/bot moves and transfers. Rejoining after a reload only shows the latest available move, and a notice identifies partial history. This is not a new server-side replay archive.
- Resolve army appears only during pending appropriation. A transfer notice names the new controller and piece count; dashed controller-colour rings preserve each inherited piece's original artwork. New transfers receive brief emphasis; reduced-motion preferences disable it.
- Player labels retain bot difficulty, connection and bot-covering states. New game, local Undo, online resignation and reduced motion are under More table options. Existing destructive-action confirmations remain in place.
- Accepted moves and captures use separate existing sound assets and share the global mute preference. The match toolbar replaces the floating sound/help chrome for this game only. System reduced-motion preferences are respected; the additional table preference is saved locally when storage is available.

Verification: the Sanguo suite includes component tests for approved piece placement, selection surviving identical room polls, legal clicks/captures/drags, rejected drops, check warnings, camera reset, guide/resolution controls, phone drawer and pinch isolation, plus journal/coordinate tests. These DOM tests do not simulate physical devices or validate browser-rendered layout; a desktop/phone visual pass is still required. The cloud browser available during implementation rejected localhost preview URLs.

## Rules contract

The approved board image, 135 normalized intersection positions, opening inventories, role artwork, and Red → Green → Blue turn order are preserved. Movement uses logical 5×9 Xiangqi sectors and the explicit river continuation table; visual trace rails do not determine legality. The debug overlay now shows the logical connections at the approved image positions.

The central L5 file offers one branch toward each other kingdom; a move chooses one branch. Cannon screens and blockers are evaluated separately on each ray. Horse legs, Elephant eyes and river confinement, palace limits, flying Generals and self-check use the existing role engines. Soldiers gain sideways movement after entering a foreign sector, not on their home river bank.

Checkmate/stalemate is resolved by the existing separate appropriation action. All pieces controlled by the defeated kingdom transfer, including inherited armies, with original faction art retained and the controlling faction shown by the outer ring. Appropriation rechecks the next kingdom for a legal reply, avoiding stalled endgames.

**Explicit Arctic completion rules:** three identical positions including the side to move, or 120 plies without a capture or Soldier move, produce a draw. Identical pieces may exchange places without escaping repetition detection. Resignation removes the resigning controller's entire army. These are modern completion rules, not claims that the historical record specifies them.

Historical context used for the existing reconstruction: [Jean-Louis Cazaux's Sanguo Qi research](https://history.chess.free.fr/sanguoqi.htm). Original rules are incomplete; the implementation deliberately retains the project's accepted logical boundary and appropriation contract.

## Implementation and release

Frontend rules and bots are the source of truth. `frontend/scripts/build-sanguo-engine.mjs` bundles exactly those modules into the checked-in `server/sanguoEngine.cjs`. Server deployment requires no TypeScript toolchain or frontend files. Regenerate the bundle whenever the source rules or bot changes; `--check` and the Sanguo workflow reject drift.

Local search runs in a Web Worker. Server search runs in a bounded worker-thread queue, away from the shared lobby event loop. The server accepts only actions, recomputes legality and controls bot scheduling. Seat tokens use 256 random bits; only their SHA-256 digests are stored server-side. Private replies and broadcasts omit tokens and digests. Every board action includes the current room revision, rejecting duplicate and stale moves. Legacy room endpoints cannot modify Sanguo rooms.

Rooms use the existing PostgreSQL `rooms.room_json` store with `game_id=sanguo-qi`. No new database schema is required. Writes are serialized per room. With `DATABASE_URL` configured, rooms and seat credentials are restored on server startup. With no database, the existing server uses memory and rooms do not survive restart. The existing lobby architecture uses one authoritative server process; multi-instance distribution requires an additional shared ownership/pub-sub design.

Release both components from the same commit:

1. Deploy the existing Node lobby with `server/` as its root and `npm start` as its command. The all-games bootstrap installs Sanguo automatically. Keep the existing `DATABASE_URL` to retain rooms across restarts.
2. Deploy the Vite frontend with its existing production settings and a real `VITE_WS_URL` pointing to that lobby over WSS. The checked-in `.env.mainnet` contains a placeholder; the hosting environment must override it. The live frontend currently points to `wss://articweb3.onrender.com`; retain that configured endpoint when releasing. No new secret or paid API is required.
3. The lobby's `/health` response must contain `supportsSanguoQi: true`. Release the lobby before the frontend so new room actions are supported when players see them.

Verification commands from the repository checkout:

```sh
cd frontend
npm ci
npm run test:sanguo
npm run check:sanguo-engine
npm run build:mainnet
```

```sh
cd server
npm install
npm run test:sanguo
```

The automated suite covers role movement, central branching, blockers, bot legality and tactical choices, completion states, invitations, capacity, readiness, forged credentials, turn enforcement, stale revisions, real WebSocket broadcasts, rejoin, bot turns and process-serialization recovery. Browser/visual testing and a real hosted PostgreSQL restart have not been performed in this change.
