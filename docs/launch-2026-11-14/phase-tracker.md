# Launch phase tracker

Updated 12 November 2026. Cross out a phase only after its acceptance evidence is recorded. Skipping a phase does not complete it.

| Phase | Work | Status |
| --- | --- | --- |
| 1 | Full cinematic introductions, historical costumes and stories | Skipped by request; pending |
| 2 | Live fairness verification: signed moves, dice, results, replay and accurate blockchain status | Built in v5.10.3; final authenticated-match acceptance pending |
| 3 | Robinhood testnet deployment, funded transactions and indexing | Pending |
| 4 | Para sign-in → wallet → confirmed Antarctic Passport mint; mainnet plan | Pending |
| 5 | Live launch dashboard and reconciled metrics | Pending |
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
