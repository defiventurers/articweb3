# Passport and launch dashboard incremental changes

Source baseline: `7c0cdd74f2bb4e75bf2ff38021f287273f314503` (v5.9.15 Chaturanga milestone). Later code reviewed selectively: `0a7d45cefe8568bd1c66a9281fcd04ec28e1fa12`. No later UI was merged.

## Runtime integration

Production startup goes through `server/scripts/start-with-runtime-status.js` and the preloaded `allGamesBackendBootstrap.js`. That bootstrap reads `index.js`, applies `transformBackendSource` and the heritage-game transformations, then adds `injectArcticPlay` before compiling the result as the backend module. `injectArcticPlay` creates the isolated app service with the existing shared rooms map and routes app HTTP requests through its handler. The app service creates `companyService`. The new metrics and standalone dashboard are attached there; no global bootstrap substitution or engine regeneration is needed.

## Implemented behavior

- `/arctic-play/dashboard` is a separate public aggregate/operator view. It does not add deployment controls to ordinary game screens. Public metrics are available from `/arctic-play/v3/launch/public`; owner delivery diagnostics require a separate bearer key of at least 32 characters. The page clears its key field after each request and never persists the key.
- `/launch/visit` records a hashed anonymous UUID per UTC day and launch cohort. It does not store the session UUID or IP. These are browser sessions, not unique humans; bots and test traffic are not independently excluded. Prelaunch sessions revisiting after the India-midnight launch boundary are counted in the new cohort even if it is the same UTC date.
- Accounts, bound wallet addresses, passport registrations and worker-confirmed passport deliveries remain separate measures. Pending and blocked jobs are separate. Unavailable source tables return null counts, not fabricated zero. Owner mint-attempt counts explicitly mean worker attempts, including polling/recovery, not unique broadcast transactions.
- Dashboard cohort starts November 14, 2026 at 00:00 Asia/Kolkata, configurable with `AK_LAUNCH_AT`. Displayed time zone is India; visit de-duplication uses UTC days and is labelled that way.
- `/launch/activity` reports occupied human seats in active private rooms only when the rooms map is connected. This is not a concurrent-connected-player count. Bots and left seats are excluded.
- Passport retry with the same account but a different chain now returns a migration conflict rather than silently returning a testnet passport as a mainnet issuance. Existing account-keyed storage remains single-chain per account. A later reviewed schema/migration is required for parallel testnet/mainnet passports; no migration is performed here.
- Non-passport NFT jobs wait for a confirmed passport job on the same account and chain. Optional arrival collection setup no longer prevents a passport-only worker from starting. A successful receipt does not override a lookup that still reports insufficient confirmations.
- Wallet inventory requires a confirmed token, a matching delivery/passport chain, and that chain's configured contract. Explorer links use the delivery's chain.
- Public passport metadata resolves a confirmed `(chain, token)` record and includes only network, arrival time and server-validated achievements. It excludes account identifiers, player names, email addresses and wallet addresses.
- Disabled legacy Google wallets no longer reject an explicitly configured Robinhood passport/Para chain. Enabled legacy Google wallets still reject unsupported network configurations.

## Configuration and limits

Preserved the baseline Abstract testnet default (`11124`) to avoid an implicit network switch for existing installations. Robinhood deployment must explicitly set `AK_VISA_CHAIN_ID=46630`. Existing chain adapters and Para Robinhood configuration remain intact. No claim is made that AGW works on Robinhood.

Use `AK_LAUNCH_OWNER_KEY` only in backend/operator configuration; never put it in a frontend build. `DATABASE_URL` provides durable aggregate data. The new visit endpoint needs an explicit browser integration; merely exposing it does not manufacture visit counts. Public data is aggregate only. `AK_VISA_DELIVERY_ENABLED` remains disabled unless an operator configures and verifies deployed contracts, a funded signer and the selected RPC. No configuration was changed on Render.

The `confirmedPassports` count currently trusts delivery-worker checks; it is not an independently reconciled event indexer. A production chain-indexing/reorg verification gate remains before publicly claiming independently verified issuance totals. Mainnet migration requires separate contracts and deliberate account/achievement mapping. Testnet NFTs do not automatically migrate.

## Checks run

`node --test server/tests/launch-incremental.test.js server/tests/antarctic-passport.test.js server/tests/google-game-wallet.test.js`: **23 passed, 0 failed**. Includes real local HTTP auth flows, delivery state fixtures, cohort boundaries, owner key checks, metadata privacy and chain conflicts. Store SQL is exercised with database doubles; actual PostgreSQL migration/concurrency execution is not verified here.

No live mint, funded transaction, deployment, Render reset, production sign-in or external account modification was performed.

Additional existing service checks: `node --test tests/para-game-wallet.test.js tests/company-service.test.js tests/arctic-play-online.test.js` from `server/`: **25 passed, 0 failed**, including all seven legacy app-game room/move/reconnect flows, bot turns, account recovery and Para PKCE/request-bound signature fixtures. These use local servers and provider fixtures, not production sign-in.

Contract preparation is in `contracts/launch/`: local EVM validation of authorized/idempotent minting, account binding, mutable metadata and passport-first keepsakes passes. `node deploy.mjs --offline` reports a Robinhood-only plan without network verification or broadcast. No Abstract deployment adapter, mainnet path or proof registry is implicitly introduced.

Achievement scope remains the seven legacy verified-win games from the baseline. Cờ Tư Lệnh and Shanshui achievement issuance is not enabled from untrusted client progress: their verified account-owned result pipeline still needs an explicit implementation before adding awards. Do not claim all nine achievement pipelines are complete.
