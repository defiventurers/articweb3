# Launch phase tracker

Updated 13 November 2026 (IST). Cross out a phase only after its acceptance evidence is recorded. Skipping a phase does not complete it.

| Phase | Work | Status |
| --- | --- | --- |
| 1 | Full cinematic introductions, historical costumes and stories | Skipped by request; pending |
| 2 | Live fairness verification: signed moves, dice, results, replay and accurate blockchain status | Built in v5.10.3; final authenticated-match acceptance deferred by user |
| 3 | Robinhood testnet deployment, funded transactions and indexing | Owner deployment/rehearsal record received; independent verification and activation pending |
| 4 | ~~Para sign-in → wallet → confirmed Antarctic Passport mint; mainnet plan~~ | Complete on testnet; passport #3 accepted. Mainnet execution remains a later gate. |
| 5 | ~~Live launch dashboard and reconciled metrics~~ | Complete; owner-private dashboard deployed, live receipts reconciled, visitor coverage labelled. |
| 6 | Public website/PWA, authentication, multiplayer, installation and APK download QA | Pending |
| 7 | Play account verification, testing, production access and submission | Pending |
| 8 | Finished reels and approved launch posts | Pending; drafts exist |
| 9 | Consistent final mascot identities and roles throughout the app | Pending |
| 10 | Hall participation, presence and accurate activity counts | Pending; cultural presentation exists |
| 11 | Render reset inventory, backup, restore rehearsal, exact scope and final approval | Pending; no deletion authorised by this tracker |
| 12 | Umbrella name and multi-experience app structure | Decision pending |
| 13 | Approved portrait cover integration without replacing loading | Pending; concept exists |
| 14 | Production-ready physical editions of nine games, samples and vendor pricing | Pending; models and audit exist |
| 15 | Physical Android update/data-retention and all-nine live acceptance QA | Pending |

## Phase 2 acceptance

- Exact historical and currently deployed rule authorities are pinned separately; no historical manifest is rewritten.
- Valid signed moves, public-randomness dice and completed results replay successfully. Altered moves, wrong players, missing actions, invalid dice and forged results fail.
- Unknown rules editions fail closed; unsupported games are identified explicitly.
- The shipped verifier uses the audited authority rather than the mutable gameplay engine.
- A live service check records the actual rules hash, trusted key and chain configuration; an end-to-end live proof is checked where authenticated access permits.
- Unanchored records are labelled unanchored. Blockchain connectivity, receipt inclusion and randomness-request timing are distinct claims.
- Existing loading, icon, gameplay, bots, tutorials, modes and approved visual improvements are preserved.

## Current evidence

- Review branch: `codex/incremental-v5915-launch`; starting commit `2ea5505c14c3b104e50e5d658bb23acb1304aff0`.
- Recovered original published engine SHA-256 `dab5b2df6d25e3c9572e93a0216b7d6d355493688983a959397bc40e2dad239b`; nine recovery/replay tests pass.
- Live Render deploy readback: commit `0a7d45cefe8568bd1c66a9281fcd04ec28e1fa12`, deploy `dep-dbq45bbncjis73cm4ql0`.
- Live public Fair Play configuration reports rules hash `9fa0be4a43f049957ef407ee73361a0b6a3bb24ed59f487a36190165be82c8cb`, the expected public signing key and **chain configured: false**. This advertises capability; it does not itself prove a completed match.
- Phase 2 remains open while verifier integration and live acceptance are checked. Phase 3 owns new Robinhood deployment/funding.

## Phase 2 work completed this pass

- ~~Recover and pin the original seven-game rules authority.~~ All 105 archived source digests match; nine historical protocol tests pass.
- ~~Pin the exact currently deployed nine-game proof engine separately.~~ Includes the second Shanshui table and long-dice Chaturanga. Original manifest hashes and trusted public keys are preserved.
- ~~Restore compiled-worker verification and replay for both published editions.~~ Unknown editions and profiles fail closed.
- ~~Check signed moves, deterministic paired dice, completed results and tamper rejection.~~ Includes a no-WebCrypto run and replay that cannot sample local dice.
- ~~Check blockchain receipt, contract, network, root and dice-request timing validation.~~ Four adversarial receipt tests pass. These are controlled tests, not deployed transactions.
- ~~Read the live configuration, verify its returned drand signature and check Robinhood testnet chain ID.~~ Signed-proof capability is enabled; the registry is unconfigured.
- ~~Build and sign the incremental v5.10.3/code107 APK with the original signing identity.~~ All 437 entries outside the seven intended changes from v5.10.2 are byte-identical. Loading, icon, art, gameplay, learning, bots and prior additions are preserved.
- [ ] Final acceptance: import/check a completed real authenticated match exported from the live service. Access to an actual player session or an exported proof is required; no account credentials are needed in chat.

### Your final phase 2 check

Install v5.10.3 over the installed app. Sign in, complete an online match, then open the shield / **Fair Play** → **Verify match**. Download the proof JSON and attach that file here so its signatures, moves, dice (where used) and final result can be checked independently. Without a configured registry, the correct blockchain result is **Not recorded** / unanchored. Phase 3 will handle actual deployment and funded receipt checks.

Validation: 47 passing automated tests plus one initially skipped integration, which was then rerun with its baseline and passed (48 distinct cases total); four full-app navigation groups and five Chaturanga UI groups passed. A pre-existing React list-key warning remains in the hall component. No physical Android install, real signed-in match or onchain transaction was claimed.

## Phase 3 — Robinhood testnet

- ~~Verify current official EVM deployment requirements and chain 46630.~~
- ~~Reproduce the exact Fair Play registry source/runtime already trusted by v5.10.3.~~
- ~~Build resumable two-contract deployment, constructor/role/receipt checks and a labelled registry transaction rehearsal.~~
- ~~Build confirmed-event indexing with network/contract isolation, transactional cursors, duplicate prevention and reorg recovery.~~
- ~~Build a private wallet-operated console and standard-JSON explorer verification submission/status tools.~~
- ~~Run a local EVM end-to-end rehearsal and the compiled console workflow.~~
- ~~Receive the owner’s exported two-contract deployment and three-transaction rehearsal record.~~ The uploaded record declares confirmation; independent chain verification remains pending.
- [ ] Confirm both deployed contracts' source verification and live receipts.
- [ ] Configure the funded backend operator securely; deploy the backend changes and enable durable indexing after its gates pass.
- [ ] Reconcile real registry events and passport totals on the deployed database/indexer. Local PostgreSQL execution and live indexing are not claimed yet.

The final phase 2 player-match acceptance remains deferred. Phase 3's explicitly labelled operator rehearsal is not a player victory or an NFT issuance claim. This pass does not rebuild the APK or alter its loading screen, icon or gameplay.

## Earlier uploaded deployment review — superseded by the updated export

The owner supplied registry `0xB247E10c115D8FfE508452F94521ADaB377EA8fd` and passport `0xF059141A4e21eF5786e66e96F1c4357858a0De11`, plus five transaction hashes. Owner/nonce-derived addresses and the single-event Merkle root match locally. The supplied compiler/source/runtime hash declarations match the compiled artifacts; this is not a retrieval of deployed bytecode.

Direct receipt verification timed out and the explorer API returned HTTP 403 from this workspace. Source-verification and event-index outputs are absent from the export. The reachable live service still reports `chain.configured=false` and `registry=null`; no activation was performed.

A clock discrepancy was detected: the rehearsal round was scheduled for **17:31:33 India time**, while this record was created at **17:35:41** and its rehearsal checked at **17:36:34**. The tool selected from chain time alone. It now selects after both chain and client time, records request time, and labels older timing evidence accurately. Prior receipts are preserved. A fresh rehearsal can reuse the same contracts; do not deploy them again.

The updated export now contains two corrected future-round rehearsals; no repeat or redeployment is needed for phase 4. Source verification, durable event reconciliation and registry activation remain phase 3 gates. Phase 2 player-match acceptance is deferred.


## Phase 4 — Passport delivery

- ~~Repair passport-only delivery and require independently confirmed claim ownership.~~ Optional keepsakes cannot prevent the passport mint, and a receipt without sufficient claim confirmations stays pending.
- ~~Bind registration to the authenticated Para wallet, preserve explicit address consent and the shipped APK form.~~ Cross-chain registration conflicts and inventory contamination are rejected.
- ~~Build the guarded sequential sender on the existing service.~~ PostgreSQL schema serialization, signer locks, permission/gas checks and retries are tested with a real disposable local database and EVM.
- ~~Build separate owner setup and player acceptance tools.~~ The private console grants only minting permission and test gas; the same-origin player check exports only independently confirmed Para-to-passport evidence.
- ~~Document the mainnet migration plan, identity/chain mapping, canary, reconciliation and rollback gates.~~ Execution remains disabled; Abstract is retained separately.
- ~~Deploy the actual backend and read its guarded status.~~ The service reached `awaiting_minter_role` on chain 46630 after its reviewed runtime, database and signer-lock checks; the dedicated signer has no minting grant or gas yet.
- ~~Owner wallet authorizes the dedicated testnet sender and funds its gas.~~ Live status is ready, minter=true and funded=true.
- ~~Real Para sign-in → verified wallet → consent → canonical confirmed passport mint; inspect the exported acceptance JSON.~~ Passport #3 passed the authenticated live acceptance check before the credit pause.

The updated owner deployment export includes corrected future-round rehearsals. Keep them; no repeat rehearsal or contract deployment is required for phase 4. Phase 2 final match acceptance remains deferred. The installed APK is not rebuilt or redesigned by this server task.

### Phase 4 deployment evidence

- Source PRs #88, #89 and #90 are merged. Initial server source `f413cb4bf3c2d696a0fb01dbc0285a7080a96e1f` became live as `dep-dbqrdbbsuf0c738ckv50`. The legacy-registration follow-up `ce3db0d446aeb981897af1f70fde47e39b54758b` became live as `dep-dbqrhq9srm7s738umrpg`. The restart-safe lock source is `a4895f0119a07a5a81cd483a52b4cfa2339e983b`, deployment `dep-dbqrp1gae00c738pmgrg`; it is live, and the new sender reached `awaiting_minter_role` with `checkStage=null`. The final readback is recorded in `passport-live-readback.json`.
- Private console phase 4 controls are live, deployment `appgdep_6af5b6500ee48191b7e0b41d80374828`; owner-only access is retained.
- The existing passport is `0xF059141A4e21eF5786e66e96F1c4357858a0De11`; dedicated testnet signer `0x009bFDc9d4C2738c1594c485040aa1994723330b`. It has only the role the owner chooses to grant, and no role was silently assigned by this build.
- Public delivery readiness returns HTTP 200 with public CORS; effective minting remains false pending owner setup. The correct player check page/script and passport artwork return HTTP 200; unauthenticated acceptance returns HTTP 401. The web artwork inventory remains 437. Signed-proof rules hash remains `9fa0be4a43f049957ef407ee73361a0b6a3bb24ed59f487a36190165be82c8cb`; registry activation remains false and Abstract indexing remains separate.
- Validation: 43 server launch tests pass with the real disposable PostgreSQL/EVM integration enabled, eight contract/indexing tests and two compiled-console tests pass, and the existing wallet cache test passes. Six initial CI workflows and both sets of three follow-up workflows passed, including full source build, restoration, tutorial/navigation, signed-proof and gameplay checks. No physical-device or real Para mint acceptance is claimed.

## Phase 4 and 5 — accepted live checkpoint

The preceding missing-permission and no-gas readbacks are historical. The owner completed authorization and Para sign-in. The acceptance JSON for passport #3 was checked against the saved Para-bound delivery and live receipt before the credit pause. That authenticated readback reported 5 verified sign-ups, 4 attested wallets, 4 confirmed passports, zero backlog and zero receipt mismatches. Mainnet execution remains disabled; phase 3 registry/indexer gates and phase 2 final-match acceptance remain open.

- ~~Deploy the private dashboard and protected aggregate/receipt-check API.~~ Main implementation PR #92, merge `22a965e94e1fb58fcb7ec98c41acc747d5c814d2`, Render `dep-dbqt4pff3r2c73bqlu7g` is live.
- ~~Reconcile confirmed passports against canonical mint receipts, claims, ownership and collection issuance.~~ Authenticated acceptance was completed before the pause; the resumed agent browser independently confirms the owner sign-in gate, not a fresh authenticated dashboard session.
- ~~Add sign-up/mint-date charts, date cohorts, wallet readiness, backlog/failures and aggregate CSV export.~~
- ~~Label prelaunch browser observations as including QA.~~ The latest owner-private Site is deployed as `appgdep_6af60e28526c819186a332c8a89c8964`. Known automated and loopback browser exclusions are included in the follow-up source change; their deployment is recorded below when live.
- ~~Refresh service/access evidence.~~ On 13 November at 00:35–00:36 IST the public service returned 5 sign-ups, 4 registrations, 4 delivered passports and zero pending deliveries; sender ready, minter/funding true. Both private API routes returned HTTP 401 without credentials. See `evidence/dashboard-live-resume.json`. Public totals are delivery-worker totals; the private dashboard applies the stronger receipt reconciliation.
- ~~Validate the final bounded changes.~~ 48 launch tests pass with zero failures; two optional local PostgreSQL/EVM integrations were not rerun in the recovered environment. The original phase 5 run passed all 50 with real disposable PostgreSQL/local EVM, and all seven PR #92 workflows passed. Final Worker build and ESM validation pass; regressions cover future windows, unavailable storage and CSV rows.

Dashboard: https://antarctic-launch-dashboard.avidandsouza.chatgpt.site

The visit count is anonymous browser sessions, not people; prelaunch QA sessions are retained and labelled rather than deleted. Known automation filtering is best effort, not bot-proof analytics. The installed v5.10.3 APK, loading screen, approved icon, gameplay and account data are unchanged. No player reset or mainnet release occurred.

Next pending phase: 6, public website/PWA launch and live installation, authentication, multiplayer and APK download checks.


## Phase 6 — Chaturanga phone layout repair

Reviewed main `11c710284087c555471faef3c0113b82945cb866` and the v5.10.2 browser/source presentation. Legacy fixed viewport, flex sizing and size containment collapsed the illustrated regions. Explicit plate-relative dimensions now keep header, player names, board, dice, roll button and guide in their own regions. Additional pass controls and notes sit below the artwork. The approved 865×1536 image, original penguin pieces, board mapping and rules remain intact. Source CSS and the shipped browser package share these corrections; public cache release is `5.10.2-ch-layout5`.

The public before/after-roll component fixtures permit rendered checks at 320, 393 and 680 pixels without signing into a player account. Desktop and phone inspection found and corrected narrow header and pass-button collisions. These are layout checks; real signed-in multiplayer and physical-phone acceptance remain phase 6 gates. No new APK is claimed.


### Phase 6 — Chaturanga turn flow refinement (13 November 2026 IST)

Reviewed main `853ab01d2c1711d4556cc18f12249e220c17a67b`. Accepted changes: preserve the upper four displayed ranks; calibrate lower rank centers to painted boundaries; remove disabled-button desaturation from the left die; reuse the approved on-board long-die artwork in dialogs; make the turn notice direct players back to the board to roll. After rolling, retain the optional legal-move guide with a Back button. Its dismissal starts a visible four-second countdown only for dice that cannot be activated this turn. If another die's legal move or a promotion could unlock the blocked die, retain it and recompute after that move. If neither can move, submit the existing end-turn action after four seconds. Opening a panel, leaving the match, losing turn authority or hiding the page cancels/pauses the timer; stale actions are never retried blindly. Manual pass and king return remain available.

The victory scene uses the same approved icy artwork, gold details, piece sprites and readable buttons. Existing results, rules, signed proofs and server validation remain authoritative. This is an incremental adapter on the retained v5.10.2 browser runtime, with matching source updates for later builds; Home, loading, account flow and the other games are preserved. Public cache release: `5.10.2-ch-screen2`. No new APK is claimed.

Validation: 52 automated checks pass, plus the shipped-app navigation and result groups. This includes position-based unlock/promotion cases, controlled four-second timing, guide/visibility interruption, fresh-position and turn-authority cancellation, existing long-dice/board/PWA checks, real shipped-app navigation and king return, and source compilation. Live rendered review is recorded after deployment; signed-in multiplayer and physical-phone acceptance remain separate launch gates.

Live rendered review completed on the public local-simulation page at 320, 393 and 680px. Both blocked dice end the turn after Back + four seconds; a single blocked die is passed independently; a knight can unlock and retain the boat die. Both unspent dice have opacity 1/filter none. The themed victory scene renders and returns to the board. Follow-up covers draw fallback assets, restart confirmation visibility and a panel-scaled victory frame. Evidence: `evidence/chaturanga-screen-flow.json`. Validation: 52 automated cases, seven shipped-runtime UI groups and one real-worker server actor/revision/action check pass. Physical-phone and authenticated multiplayer acceptance remain open.

## Games Adventure redesign — review candidate

- Implemented the supplied Adventure reference in an isolated, reproducible review build on `codex/games-adventure-reference`, based on `8ad5a8f3030954e22606de514ca598aaa0d75324`.
- Existing approved Chaturanga hero/logo retained; missing palace recreated and labelled for visual approval.
- Four runtime navigation groups and eight heritage/PWA tests pass (one baseline-dependent test skipped). Browser presentation checked at 360×800, 393×852 and 393×960.
- [Review record and screenshots](games-adventure-reference-review.md). Production package, gameplay and backend unchanged.
- Remaining: visual acceptance, production packaging integration and deployment, then live/physical-device checks. This does not complete Phase 6.
