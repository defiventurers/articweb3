# FONSO technical stabilization checkpoint

Updated: 2026-11-28 (Asia/Kolkata). Mission: Batch A only, security and fair play.

## Scope and acceptance

- A1: reproduce `RULES_ARTIFACT_MISMATCH`, identify and reproduce the intended rules authority, require independent replay and negative artifact tests; preserve all existing game rules and historical proof identifiers.
- A2: enforce funded-mode restrictions on the server, demonstrate authorized and unauthorized API/WebSocket behavior locally, and preserve free gameplay.
- Batches B, C and D: **NOT STARTED**. No deployment, live exploitation, account creation, minting, contract change, DNS/billing change, or production database mutation is authorized by this batch.
- Preserve the approved v5.10.2 Android binary and artwork. No ordinary source build is represented as reproducing that binary. Physical Android acceptance remains outstanding.

## Reviewed baseline

- Repository: `https://github.com/defiventurers/articweb3`.
- GitHub branch API and `git ls-remote` independently confirmed `main` at `f696f57637ec8a1433bcaeafcd0ebc494fcba96b`.
- Development branch: `codex/fonso-stabilization-batch-a`.
- PRs #118 and #119 read; both are merged. #119 is the current main merge. APK review evidence was read, not re-run as part of Batch A.
- Company Master Context, portable context, Engineering/Architecture/Backlog, APK Registry, QA, Infrastructure, Security Risk Register, Launch Readiness and Master Priority Backlog read. `WORKSPACE_SETUP_STATUS.md` revision 1.7 confirmed. Company records are historical context, not current runtime proof.

## Incremental evidence

### A1 — investigation in progress

`node shared/fair-play/check-rules-integrity.mjs` reproduced a failing gate on the clean baseline (exit 1). The current manifest is newer than the historical hold:

- Current rules identifier: `9fa0be4a43f049957ef407ee73361a0b6a3bb24ed59f487a36190165be82c8cb` (113 source entries).
- Its expected engine SHA-256 is `16d08120db2442814631143e6dafbeb88af40bda561f3b00a61c5c0f0cfa4c18`.
- `server/fairPlayEngine.cjs` matches that expected digest exactly.
- The gate instead reads `server/arcticPlayEngine.cjs`, SHA-256 `647c7663c91d1fcc32300379f0d722096a49e456fc22dcda1c9751ef0cf67ebc`.
- One declared source also differs: `mobile/arctic-play/src/dominion.js`. Cause and safe resolution still under investigation.
- The worker's hold records the older rules identifier `63845f4daef97f9721ccecd9cb3c7ef363842835a2566f8f48c7e515863cd952`; no readiness flag or expected digest has been changed.

### A2 — investigation in progress

Source review found `internal` launch-mode approval based on chain only. Signature-bound operator membership and all existing-room entry points are being investigated and tested in an isolated local runtime. No live vulnerability claim is made from source review alone.

## Environment and checks

Node 24.22.3. Existing pinned dependencies installed with `npm ci --ignore-scripts --no-audit --no-fund` in `server`, `shared/fair-play` and `mobile/arctic-play/build-deps` (all exit 0). Install lifecycle builds were intentionally not run; the separate approved APK path is unchanged.

## Work remaining and continuation

Finish local reproduction, minimal fixes, regression tests, diff review, and reviewable PR for A1/A2. Update this checkpoint with exact changed paths, commands, results, commit and PR before stopping. No founder action is currently needed for local work. Production rollout remains a separate approval gate.

If interrupted: resume `codex/fonso-stabilization-batch-a`, read this checkpoint and its evidence files, inspect the working tree before editing, and finish Batch A only. Do not repeat completed company setup or start Batch B.
