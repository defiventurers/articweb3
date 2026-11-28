# Batch A2 — funded-mode access isolation

Date: 2026-11-28 (Asia/Kolkata). Reviewed base:
`f696f57637ec8a1433bcaeafcd0ebc494fcba96b` on `main`.
Development branch: `codex/fonso-stabilization-batch-a`.

## Status and acceptance boundary

**FIXED AND TESTED LOCALLY** for the reproduced backend access-control gap.
**PRODUCTION VERIFICATION PENDING** for deployment and environment configuration.
**OWNER ACTION REQUIRED** for any live deployment, funded rehearsal, or on-chain
pause change. This work does not authorize a paid launch or prove that a deployed
vault blocks direct public transactions.

Acceptance tested: free rooms remain available; only signature-authenticated,
allowlisted wallets can access internal funded rooms; client flags cannot confer
membership; stored room mode determines access; operator HTTP routes still deny
unauthorized requests; disabled/unauthorized funded settlement cannot reach a
signer or transaction submission. The source frontend also requires current
server authorization immediately before requesting a deposit or entry lock.

## Reproduced failure and root cause

The deployed-code entry path represented by the repository is:

`npm start` → `allGamesBackendBootstrap.js` preload →
`scripts/start-with-runtime-status.js` → `scripts/start-with-indexer.js` →
the overridden `loadMultiGameBackend()` → `loadAllGamesBackend()` →
`transformBackendSource(index.js)` plus each game-service injector.

`launchMode.js` checks the global mode, Abstract chain and public-mainnet legal
flag. In `internal` mode on chain 2741 it returned permission without checking
which authenticated wallet was acting. `loadPrizeBackend.js` applied that global
check to funded create/list/join/entry confirmation, but not to all operations on
previously created funded rooms. Knowing a room code also allowed unauthenticated
`spectate_room`. Background countdown/start and settlement did not recheck the
launch gate. Finally, the original `HIGH_STAKES_ENABLED` expression treated any
configured vault as enabled even when the operator explicitly set the flag false.
Independent review also reproduced an unsupported-chain configuration bypass:
`testnet` meant any chain other than 2741, including chain 1. A targeted regression
failed before restricting this Abstract settlement path to testnet 11124.

The source High Stakes screen also exposed a standalone deposit button that
called `writeContract` without checking server membership. Its entry-lock path
used a cached room after initial creation/join and did not recheck wallet changes,
revocation or a disabled launch. Both paths now require a current authenticated
server response before invoking the wallet.

Before changing production code, this regression was run against the transformed
backend on localhost:

```sh
node --test server/tests/funded-access-socket.test.js
```

The initial single test failed as expected: an ordinary EOA, authenticated by a
valid signature but not approved for internal use, received `room_create_result`
instead of `error`. The local server had `LOCKED_MATCH_MODE=internal`, chain 2741,
and a different approved fixture wallet. No database, RPC, real signer, mint,
funded transaction or live-account access was used.

## Changes

- `server/fundedAccess.js`: internal access uses
  `LOCKED_MATCH_INTERNAL_WALLETS`, a comma-separated server-only allowlist of
  wallet addresses. Empty or malformed configuration denies all internal access.
  Only `ws.authorizedWallet`, established by the existing signature flow, grants
  access. Client-supplied wallet, role, mode or flags do not.
- `server/loadPrizeBackend.js`: the production transformation now checks funded
  ingress before all dispatch, resolves existing room mode from server state,
  filters funded room/history responses and broadcasts, and gates background
  countdown/start and payout settlement. Missing transformation anchors fail
  startup instead of silently omitting the control. Explicit
  `HIGH_STAKES_ENABLED=false` now takes precedence over a configured vault.
  String-type identity/room/authentication fields are checked before coercion;
  malformed JSON objects cannot throw before authorization in this shared path.
  Existing funded room-list/state replies include an additive `funded-access-v1`
  policy marker bound to the authenticated wallet, configured chain and mode.
  This is a compatibility marker, not a transferable credential.
- `server/launchMode.js`: `testnet` accepts only the existing supported Abstract
  Testnet chain 11124; unknown chains, Ethereum mainnet and Robinhood cannot be
  misclassified as this backend's Abstract testnet.
- `frontend/src/network/settlementOperator.js` and
  `frontend/src/screens/SettlementAdminScreen.jsx`: operator credentials now
  travel only in the Authorization header for protected rooms, debug and
  preflight requests. The old query-string key was rejected by the backend and
  unnecessarily exposed credentials in URLs. Protected requests reject redirects
  and malformed responses, and no credentials are stored persistently.
- `server/scripts/start-with-indexer.js`: permits the Authorization header during
  CORS preflight for the existing control routes. The outer origin allowlist is
  retained. Before this one-line correction, a real localhost OPTIONS regression
  returned only `Content-Type`, preventing the header-authenticated browser flow.
- `frontend/src/network/fundedTransactions.js`, `socketClient.js` and
  `frontend/src/screens/HighStakesScreen.jsx`: standalone deposits await a
  signature-bound funded room-list check; entry locks refetch the existing
  participant's room state. Both require the current policy marker, matching
  connected/profile/client wallet and configured chain. Missing markers from an
  older backend fail closed. Locks also reject changed match IDs or amounts,
  missing membership, started/cancelled/expired rooms and already locked entries.
  Current React refs catch changes while authorization is awaited, and an
  immediate in-flight guard prevents duplicate clicks. Withdrawal and refund
  paths are unchanged. There is no new endpoint or on-chain transaction.
- `server/.env.example`: documents the new blank allowlist and closed launch
  defaults. No real environment or secret was changed.
- `server/tests/funded-access.test.js` and
  `server/tests/funded-access-socket.test.js`, plus
  `frontend/unit/settlement-operator.node.test.js` and
  `frontend/unit/funded-transactions.node.test.js`: behavioral regressions,
  including the actual production HTTP wrappers and WebSocket dispatcher.

The existing signature challenge, public-mainnet legal gate, testnet gate,
operator bearer-key mechanism, settlement duplicate prevention and payout math
remain in force. Existing free game tokens, catalogue, boards, rules, artwork,
frontend routes and Android files are unchanged.

Refund/release recovery was deliberately retained: it returns an existing locked
entry to its same owner and does not create a new funded match or payout award.
An owner's own authenticated vault activity remains readable. Turning off new
funded play must not silently trap already deposited funds.

### Abstract smart-account compatibility

The funding guard uses the Abstract smart-account identity, not its signer EOA.
The exact pinned `@abstract-foundation/agw-client@1.12.3` package source
(`src/clients/abstractClient.ts`) declares an account-bearing `AbstractClient`
and constructs it with `account: toAccount(smartAccountAddress)` and `chain`.
The exact `@abstract-foundation/agw-react@1.13.0` source calls that constructor
from `useAbstractClient`; its Privy provider returns `[smartAccount, signer]`,
and `useGlobalWalletSignerAccount` separately selects `addresses[1]`.
Consequently `useAccount().address`, the signed profile wallet and
`abstractClient.account.address` must agree on the smart account, while
`abstractClient.chain.id` identifies its configured network. The published
package sources were inspected without modifying dependencies or lockfiles.
The official [client documentation](https://docs.abs.xyz/abstract-global-wallet/agw-client/createAbstractClient),
[React hook documentation](https://docs.abs.xyz/abstract-global-wallet/agw-react/hooks/useAbstractClient)
and [signer hook documentation](https://docs.abs.xyz/abstract-global-wallet/agw-react/hooks/useGlobalWalletSignerAccount)
independently describe these properties. Actual owner-wallet signing remains a
separate controlled live acceptance step.

## Test evidence

```sh
node --test \
  server/tests/funded-access.test.js \
  server/tests/funded-access-socket.test.js \
  server/tests/launch-mode.test.js \
  server/tests/anti-cheat-transform.test.js \
  server/tests/server-hardening-phases.test.js \
  server/tests/prize-policy.test.js \
  server/tests/security-hardening.test.js \
  server/tests/shogi-socket.test.js \
  frontend/unit/settlement-operator.node.test.js \
  frontend/unit/funded-transactions.node.test.js
```

Result: **34 passed, 0 failed**. `git diff --check` also passed. Both affected JSX
screens were parsed/transformed successfully using the installed Rolldown tool.

The eighteen new cases verify absent/malformed allowlists, valid approved identities,
outsiders, anonymous requests, invalid signatures, wallet substitution, direct
funded create/list/join/entry/team/state/move/spectate requests, a forged free-mode
claim against a funded room, alternative game-protocol messages targeting that room,
allowlist removal, disabled mode, hidden old funded records, filtered broadcasts,
free room creation/team selection/bot fill, owner HTTP authorization, authenticated
CORS preflight from the approved website, rejection of an untrusted origin,
header-only operator credentials, and invalid identity values followed by a valid
request on the same still-working socket. Mocked frontend writes verify denial
before wallet invocation, wallet/profile/client/network changes during an awaited
request, unmounting, stale room/amount/member/state rejection, old-backend rejection
and exactly one write for a fresh approved request.

The socket fixture uses the real production startup wrappers, rate limits,
signature validation and game services. Its price feed is mocked; database,
indexer and collectible-sender activity are disabled. The settlement regression
uses a mock provider/wallet/contract: blocked cases make zero provider calls and
zero submissions; the authorized case submits once and still rejects a second
submission. The existing Shogi socket test additionally passed its free
join/start/move/reconnect/bot checks. These are local automated results, not a
live mainnet rehearsal or full Batch D acceptance.

## Reviewed surfaces and remaining boundaries

| Surface | Evidence / disposition |
| --- | --- |
| Public navigation and direct links | `frontend/src/App.jsx`, `PlayerHubScreen.jsx`, `HighStakesGate.jsx` and `HighStakesScreen.jsx` support funded navigation/invite parameters. UI flags are not treated as access control; direct backend calls are now gated. Source deposit/lock actions require a fresh authorized reply before opening the wallet. No artwork or layout changed. |
| Operator UI | Developer screens are gated by the existing development route. Sensitive data still requires backend bearer authorization. |
| Operator HTTP | Local production-wrapper tests reject missing/forged/query-string credentials at settlement rooms/debug, mainnet preflight and indexer run; the valid header credential can read settlement rooms. No live operator key was used. |
| API financial mutations | Funded gameplay and entry confirmation use the WebSocket path; no public HTTP settlement trigger was found in the traced entry point. Existing server-only vault activity writes remain blocked. |
| Launch status | `highStakesAllowed` describes global configuration, not caller membership. It must not be interpreted as proof of internal access. |
| Frontend/backend rollout order | New funding actions require the additive `funded-access-v1` marker. An old backend cannot authorize these new frontend actions. Ordinary room response shapes remain compatible for existing callers. Use the tested candidate backend before the source frontend update; this does not rebuild the retained approved APK. |
| Alternative startup | Use the supported `npm start`/testnet/mainnet scripts. Raw `node server/index.js` omits the repository's existing security/source-transformation layers and is not a validated production command. |
| Direct on-chain calls | Reviewed source `contracts/contracts/EthGameEscrow.sol` permits public deposit/lock calls when unpaused, independent of backend access. `settleMatch` and `releaseEntry` require `gameServer`; pause changes require `owner`. Current deployed bytecode, active binding and pause state were not verified in this local task. |

The frontend preflight prevents the normal application from requesting an
unauthorized funding transaction. It is not an atomic on-chain permission check:
it cannot retract a transaction already submitted or prevent a separate client
from calling an unpaused public contract. The deployed-vault owner gate therefore
remains necessary.

## Safe deployment preparation and owner-only work

1. Review the Batch A PR and use the supported transformed startup command. Until
   separate funded approval, retain `LOCKED_MATCH_MODE=off`,
   `HIGH_STAKES_ENABLED=false`, `LEGAL_PUBLIC_MAINNET_APPROVED=false` and an empty
   internal allowlist. These are instructions for the eventual approved rollout;
   no production configuration was changed here.
2. If an internal rehearsal is separately approved later, configure only the
   approved participant wallet addresses in `LOCKED_MATCH_INTERNAL_WALLETS` on
   the server. Do not put an operator key or allowlist in a frontend build. Each
   participant must still sign the normal wallet-authentication challenge.
3. Verify on a nonproduction candidate that an unrelated signed-in wallet is
   denied direct funded actions and that a free match still works. Do not fund
   test rooms merely to test this access check.
4. Before treating an existing on-chain vault as closed, independently verify its
   chain/address/bytecode and the deposit/lock/settlement pause flags. If closure
   requires a change, prepare exact owner transactions and obtain approval.
   Preserve ordinary withdrawals and expired-lock recovery in accordance with
   `contracts/MAINNET_ESCROW_READINESS.md`. Backend flags alone cannot pause a
   public contract.
5. Review pending rooms before any rollback. Reverting this code reintroduces the
   access gap, so keep funded mode off during rollback. Existing funds and records
   were not changed; no database migration is required.

No production deployment, account creation, DNS/billing change, live mint,
contract call or replacement deployment was performed.
