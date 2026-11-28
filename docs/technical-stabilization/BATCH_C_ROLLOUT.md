# Batch C — reviewed release and rollback procedure

**No deployment, live signup/mint or explorer source submission has been made.**
This procedure extends the Batch B compatibility, health and database runbooks.
It preserves Batch A funded authorization and the historical fair-play hold.

## Review and candidate preparation

1. Review the stacked development PRs and pin the exact accepted C candidate SHA.
   Main still requires separate production approval: Render automatically deploys
   main. A merge into a development branch is not production acceptance.
2. Privately establish the active Render database binding using the Batch B
   procedure. Review the actual pending collectible queue before approving any
   sender resumption. Approval for one new test signup does not authorize an
   arbitrary backlog. Private operational observations are provided separately
   and are not approved for publication in this public repository.
3. Prepare the candidate in an approved isolated environment with synthetic data,
   the existing locked dependencies and production-equivalent startup transforms.
   Keep `AK_PASSPORT_RUNTIME_ENABLED=false` and `AK_VISA_DELIVERY_ENABLED=false`;
   keep funded mode disabled and preserve registration/historical holds. Do not
   point fixture runners at the production database or install a production key.
4. Run the Batch C workflow gates and the existing Batch B compatibility and
   strict health probes. Preserve account/schema readiness checks. For metadata,
   prove the default RPC transport on that candidate; the recorded workspace live
   read used a test-only native-fetch adapter after ethers HTTPS failed locally.
5. Test account linking, saved progress and sign-out with isolated accounts.
   Require transaction-time session authorization, pending-link rejection during
   ordinary login, safe interrupted-link recovery and hidden Home after a failed
   refresh. Check actual startup loading of the source modules, not only syntax.

## Separately approved production deployment

1. Obtain founder approval for the exact backend SHA/build and configuration.
   Owner-controlled sender flags must be disabled before the new process starts
   unless explicit approval also covers the intended mint queue. Source fixes
   alone do not keep an already enabled sender from processing work.
2. Deploy backend first under the Batch B rollout controls. Validate liveness,
   readiness, runtime identity and interface compatibility. No schema migration,
   contract transaction or irreversible database operation is required by C.
3. Check Passport #3 at its unchanged on-chain tokenURI. Require 200 JSON, the
   correct token/network and unchanged image; a confirmed absent token must return
   404. Redirects/HTML are not acceptance. Preserve a safe 503 for database/RPC
   failures. Record the actual deployment and sanitized verification timestamp.
4. Deploy the reviewed source early page only after backend acceptance. Confirm
   session, consent and wallet gates with the controlled procedure below. This
   web deployment does not replace or reproduce the approved v5.10.2 APK.
5. Keep all funded/paid gates and the historical proof hold closed. Recheck free
   authentication, saved progress and relevant existing multiplayer interfaces.

## Controlled live Para and delivery acceptance

The founder must separately approve account creation, Para consent/signature and
any minting. Use the detailed steps in `BATCH_C_SIGNUP.md` and
`BATCH_C_DELIVERY.md`, plus the private operational appendix.

- Select one founder-controlled account. Decide whether this is an existing
  account idempotency check or a new authorized signup with at most its eligible
  Passport and Egg. Approve intended pre-existing queue work explicitly.
- Record aggregate baseline and public chain/contract identity. The founder
  completes consent and wallet ownership personally; no private key, password,
  OTP or session token belongs in the evidence.
- Require one durable registration, at most one eligible Egg reservation, a
  successful canonical mint receipt and matching chain/wallet/token/claim before
  either status is accepted. Pending delivery is not success. The existing policy
  is two canonical L2 blocks, not Ethereum finality.
- Refresh, sign out/in and repeat the same request. Registration, claim, edition
  and original mint transaction must stay unchanged. No additional supply may
  appear from that retry. Preserve failed/submitted rows and inspect their safe
  errors; do not reset records, transfer, burn or remint to make a test pass.
- Stop additional signups if evidence fails. Historical-RPC unavailability keeps
  missing-hash recovery pending; it must not cause an unverified confirmation.

## Explorer verification approval

The exact prepared contract-verification ZIP is a private review deliverable.
The three existing deployments match their reconstructed creation/current runtime
bytes, but all still reported unverified source. The source inputs, constructor
data, transaction evidence and submission payloads have not been published through
this PR or submitted to an explorer. Approve that exact package's publication
separately before executing its target-specific commands. Do not deploy replacement
contracts or change ownership, mint roles, supply, artwork or tokenURI.

## Rollback constraints

- Stop or disable senders under the approved operational procedure before a
  backend rollback. Avoid overlapping old/new workers. Do not replay unconfirmed
  jobs manually, remove transaction hashes or roll database contents backward.
- **Retain the new pending-link authorization logic in any rollback candidate.**
  Older authentication code does not understand pending identity reservations and
  can treat them as final mappings. A rollback to pre-C auth requires a separately
  reviewed reconciliation of pending links; it is not automatically safe simply
  because no SQL migration occurred. Prefer a reviewed corrective build retaining
  C's authorization/receipt safeguards. Do not clear mappings as a workaround.
- The early page can be rolled back independently only after checking that the
  selected version preserves its authentication/consent gate. Keep the backend
  authorization protections active.
- Removing metadata recovery can restore the observed 404. An application
  rollback cannot reverse a mint or restore a lost account association. Preserve
  the original token/owner/supply and use approved evidence-based recovery.
- The old live Render artifact predates Batch A and remains an unsuitable automatic
  rollback. Preserve strict health/readiness, durable-store safeguards, funded
  restrictions and historical proof holds in every approved candidate.

Stop after Batch C. Android signature/payload inspection and free multiplayer
acceptance belong to Batch D; real-device acceptance must be performed by the
founder without clearing an existing save unnecessarily.
