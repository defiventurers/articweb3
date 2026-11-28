# Batch D — review, release and rollback gates

Batch D does not deploy a backend, publish a new APK, accept a device, activate a
funded match or authorize a live account/collectible operation. The retained APKs
are inspection inputs. The backend candidate must retain every A/B/C safeguard.

## Select the candidate

1. Review PR #125 and its stacked A/B/C dependencies. Pin the accepted backend
   commit and tree. Do not merge to main as a documentation-only action: the
   recorded Render configuration automatically deploys main.
2. Re-run the D workflow and the affected A/B/C gates on the exact candidate.
   Use the production `npm start` bootstrap/transform path in an authorized
   isolated environment. Synthetic fixture credentials, test databases and
   temporary files must not be replaced with production values.
3. Keep funded mode, settlement/indexing actions and collectible senders closed
   unless each operation has separate founder approval. In particular, starting
   an enabled collectible sender can process a pre-existing queue. A free-match
   acceptance test is not approval for a signup mint or that queue.
4. Use the B runtime-identity, strict JSON health/readiness and privately evidenced
   database-binding procedures, plus the C authentication/receipt gates. D test
   success does not resolve those production or owner-access prerequisites.
5. Treat exact Android binary acceptance independently. The approved baseline is
   v5.10.2/code106, SHA-256
   `275cf9bf69aadfa4f4d844ff412e0885d8a5a656539f4bb583af27bfc95e8ecd`.
   The signed review is v5.11.1/code111, SHA-256
   `91fbc8cd0578462511356888e8fab5e6008f9008e555571dbf93473783488f3e`.
   A successful ordinary frontend/mobile-source build does not reproduce either
   binary. Do not substitute one or silently promote the review APK.
6. Review the separate presentation correction in `BATCH_D_PRESENTATION.md`.
   Original signed v5.11.1 contains the observed light-control and enlarged-text
   defects; the opt-in CSS candidate does not update that APK. Its staging report
   must show only `after/app.css` changed. The existing signed builder still
   produces the original 5.11.1 and must not be represented as a corrected build.
   Any subsequent corrected APK requires a separately identified release,
   reviewed guarded packaging, the compatible original signing identity and
   refreshed version/cache/asset-size metadata, followed by fresh binary,
   complete-payload and physical verification before acceptance.

## Separately approved backend acceptance

The founder must approve the exact backend commit/build, environment and rollout.
Use the B backend-first procedure; record deployment identity and health results.
Then run the bounded free-match scenario against the approved environment using
existing authorized test accounts/wallets. Record two clients' final board/result,
reconnect behavior and rejection of malformed/stale moves. Do not test arbitrary
wallet impersonation against production; that regression belongs in isolation.

The automated socket clients exercise real local connections through the actual
startup wrapper. Their account/signature fixtures and local persistence are not
a live Para login, a production load test or a physical Android network test.
The exact coverage and replay behavior are recorded in `BATCH_D_MULTIPLAYER.md`.

If the approved deployment fails an acceptance gate, keep the release held and
use a reviewed corrective candidate. No game-rules, database, ownership or supply
change is required to make these free-match tests pass.

## Physical Android acceptance

Follow `BATCH_D_ACCEPTANCE.md` with the exact signed review artifact and retain the
verification output in `BATCH_D_ANDROID_EVIDENCE.json`.

- First record the currently installed version and the founder's existing save.
  Do not uninstall, clear storage or reset authentication to simplify a test.
- Test the upgrade on the saved-game device only after the founder approves it.
  Use a separate device/profile for clean-install acceptance.
- Complete visual/loading/home, Adventure/All Games, navigation, Chaturanga,
  How-to-Play, local/bot gameplay, existing-save restoration, restart/crash,
  safe-area/back-button, TalkBack and performance checks.
- Explicitly check light-theme unselected control readability and enlarged-text
  action/Crown containment. Preserve the original review's failed observations;
  passing source/browser correction tests is not a pass for that signed APK.
- Real Para consent/signature remains personal to the founder. A sign-in that
  can initiate collectible delivery requires the separate C approval procedure.
- Record Android version, WebView version, device model, APK SHA, result per
  checklist item and relevant redacted failure evidence. Browser/DOM/CI success
  does not count as a physical pass.

The original v5.10.2 signing checkout remains unresolved. Valid matching
signatures and retained payload provenance do not recover that missing checkout.
The historical fair-play artifact hold remains enforced; it must not be removed
to complete a device checklist.

## Rollback

Retain the original APKs, signed payload evidence and tested backend tree. A
backend rollback must preserve D's socket authorization correction together with
A funded restrictions, B health/database safeguards and C pending-link/canonical
receipt checks. Prefer a reviewed corrective build. Returning to an older
vulnerable socket path is not a safe rollback simply because it previously ran.

Follow the C sender/queue and pending-link rules before any approved backend
rollback. Do not roll database contents backward, delete identity reservations,
reset collectible jobs or remove their transaction hashes as a workaround.

Android rollback is a separate owner decision. A lower version code is not an
ordinary upgrade. Do not uninstall the review APK or clear its data on the
founder's saved-game device to force the old APK back. Preserve the existing data,
record the failure and prepare a compatible corrective build for review; any
restore/downgrade procedure needs its own verified save-recovery plan. A spare
clean-test profile can be reset only with the founder's approval.

Stop after Batch D. Remaining production, live Para, explorer publication and
physical-device actions require their explicit approvals; none is implied by
merging a development PR or resuming this checkpoint.
