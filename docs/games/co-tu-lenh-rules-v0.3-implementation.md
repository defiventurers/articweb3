# Cờ Tư Lệnh — Antarctic Kingdoms research rules v0.3 integration

**Status:** DRAFT PRACTICE ONLY. No claim of source-native rule verification, public deployment, APK release, or commercial permission. 2026-11-03. Source: user-provided `CoTuLenh-Antarctic-Rules-Research-v0.3.md` and `CoTuLenh-Antarctic-Rules-Profiles-v0.3.json`. 2015 Anc​ientChess booklet is the proposed baseline. UI theme is a clearly marked modern visual adaptation. No blockchain transactions are involved.

## Implementation and acceptance criteria

- Four versioned profile keys match uploaded JSON: `ancientchess_2015_standard` (default), `ancientchess_2015_long`, `creator_2024_standard`, `bga_2024`.
- 2015 Standard ends when opposing Commander is defeated, both ships lost, both aircraft lost, or all six core land units eliminated (2 Infantry, 2 Tanks, 2 Artillery). 2024 expands the land division to nine (adding 2 Engineers and 1 Militia); Long applies Commander defeat only.
- 2015 Commander uses unobstructed orthogonal movement without a ten-step limit, with adjacent capture only. BGA profile limits it to ten. One-square Missile diagonal movement is enabled in 2015, disabled for BGA. Exact 2024 movement is *unresolved*, so 2024 selection transparently uses the 2015 movement basis as a **provisional convenience**, not a historically verified claim.
- All profiles use a common pure `rules.js` engine generated as the identical server `coTuLenhEngine.cjs`; authoritative server rejects unknown profiles and old-version ongoing rooms to prevent silently changing mid-match legality.
- The optional `Show air-defence rings` toggle displays both factions at once: red `#ef4658` and blue `#2f9fff`. Dashed rings are **illustrative**; solid small nodes are the exact engine cells. Anti-aircraft and Navy radius 1 (five or fewer board nodes), Missile radius 2 orthogonal plus one diagonal step (13 or fewer nodes). The render, including rotated board view, uses `airDefenceZones(state)` from the exact same function as flight interception. When off, there is no visibility overlay or rule change.
- Engineer anti-air radius remains **disabled and explicitly unresolved** due to source disagreement. Headquarters captured-piece score is 10 under the 2015 table. Headquarters shelter condition for weak attackers is modelled, but exact co-occupancy/strong-attack interactions still need primary-source sign-off.
- Current transport, heroic promotion, bomb-return and server room support are preserved. The engine does **not** yet fully support dual naval attacks or all same-turn stack multi-capture sequences, advanced timing/bomb-path adjudication, optional match clocks and official scoring, or source-authenticated placement of every piece and ford. These cannot be claimed complete until independently validated.
- 11 columns × 12 rows = 132 intersections; provisional `FORDS=[5,7]` and the previous practice opening remain clearly unverified; no board geometry or artwork was changed in this rules-only update.

## Checks and next gates

Local focused checks: `node frontend/scripts/build-co-tu-lenh-engine.cjs --check`; `node --test tests/co-tu-lenh-rules.test.mjs tests/co-tu-lenh-service.test.cjs tests/co-tu-lenh-rules-v03.test.mjs tests/co-tu-lenh-service-v03.test.cjs`.

**Before merging / releasing:** verify all 38 starting coordinates and two ford columns from an authorized 2015 diagram, resolve Engineer AA, HQ, air-interception event ordering and stacked multiple actions, pass full Vite+mobile+online regression, test small-screen controls, verify relevant publishing rights. Production multiplayer and APK are not updated by merging a draft PR.