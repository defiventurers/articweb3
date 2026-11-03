# Cờ Tư Lệnh — Commander Chess (RESEARCH DRAFT)
**Do not label playable until verified against an authorized rulebook and the selected edition.**

## Identity
- Original name: **Cờ Tư Lệnh**, also called Cờ Chiến; English: Commander Chess.
- Creator: **Nguyễn Quý Hải**, Vietnamese colonel and writer. Modern Vietnamese game registered/reported in **2010**, not an ancient Indian or Chinese game.
- 2 players (Red and Blue). 11 vertical and 12 horizontal **intersection** lines: 132 nodes; 38 pieces (19 per team), 11 unit classes. Left-side sea channel, river separating land territories, two shallow crossings.
- Selected software baseline: Board Game Arena English description cross-checked with Vietnamese rule explanations. This is not yet an authenticated 2021/2025/2026-edition ruleset.

## Authentic roster, counts *per player*
| Original | English | Qty | Travel summary (not complete legality) |
|---|---|---:|---|
| Tư lệnh | Commander | 1 | unlimited unobstructed orthogonal movement; capture at one step |
| Bộ binh | Infantry | 2 | one orthogonal |
| Xe tăng | Tank | 2 | one–two orthogonal; carries units |
| Dân quân | Militia | 1 | one orthogonal or diagonal |
| Công binh | Engineer | 2 | one orthogonal; ferries heavy weapons |
| Pháo binh | Artillery | 2 | one–three orthogonal or diagonal; may jump to capture |
| Cao xạ | Anti-aircraft | 2 | one orthogonal; air-denial radius one |
| Tên lửa | Missile | 1 | one–two orthogonal, one diagonal; air-denial radius two |
| Không quân | Aircraft | 2 | one–four orthogonal/diagonal; jumps; bombing may return immediately |
| Hải quân | Navy | 2 | sea/coast routes up to four; shore fire, transport, air defence |
| Sở chỉ huy | Headquarters | 2 | static shelter/obstacle, Commander occupancy |

## Rule systems required before release
1. Red/blue symmetric starting deployment from official, clear reference; coordinate/sea/coast/ford intersection semantics.
2. Move vs capture vs stationary attack: offshore navy vs inland land fire and aircraft bombing; artillery jump capture.
3. Air-defence danger zones and flight path interception; mutual destruction on deliberate airstrike and heroic stealth.
4. Engineers crossing deep river; tanks/aircraft/navy carrying infantry/militia/Commander/vehicles; stack action and cargo destruction.
5. Commander facing line-of-sight, HQ protection, check, heroic promotions (+1 range, diagonal travel) and survival edge cases.
6. Explicit victory mode: Commander/total war; or division battles (both naval, both aircraft, or six land units—infantry/tanks/artillery). Time and captured-piece point variant should be versioned.
7. Renderer must draw 132 INTERSECTIONS, not a 12×11 square-cell movement grid.

**Unsupported assumptions to exclude:** two Deputy Commanders, infantry loses against tank from front unless flanking, aircraft must refuel on the next turn, aircraft can fly anywhere. Those were present in preliminary user-supplied summary, not in the selected published rules.

## Antarctic presentation (DRAFT / MODERN COSMETIC)
Working subtitle **Operation Frozen Front**; unchanged unit roles, original iconography and colour-coded red/blue pieces. Dark navy/icy-white board with side sea, turquoise river and clearly marked shallow fords. Four penguin characters remain outside legal board cells as guides per `PenguinHosts.jsx` and `docs/PENGUIN_HOSTS_DIRECTION.md`. Pengu rules/terrain, Retsba tactics, Polly practice, Abster engineer puzzles.

## Repository implementation path
- New stable ID `co-tu-lenh` only after review. Do not change any existing game IDs, routes or board geometries.
- Keep `topology.js`, `rules.js`, `startState.js` independent of React/assets/chain; `CoTuLenhApp.jsx` presents validated state only.
- Start with free local/practice/tutorial, then bot and authoritative online WebSocket engine and reconnection. Respect server bootstrap/source-bundling rules and existing acceptance gates.
- Abstract and Robinhood chain adapters later and separately. No real-money match mode in this task.

## Still unresolved
- Official fixed initial piece identities/coordinates and exact ford column boundaries.
- Primary 2021 2nd-edition vs 2025 revised edition differences, HQ interactions, multi-attack stacks and time scoring.
- Publisher/game artwork licensing; use independently illustrated assets until rights reviewed.

## Evidence
- Creator/history and piece counts: https://www.qdnd.vn/ban-doc/thu-ban-doc/hoi-thi-co-tu-lenh-570537
- Detailed English rules: https://en.doc.boardgamearena.com/Gamehelpcommanderchess
- Vietnamese gameplay details: https://vi.boardgamearena.com/gamepanel?game=commanderchess
- Independent Vietnamese overview: https://thuthuatchoi.com/huong-dan-cach-choi-co-tu-lenh.html
- Original layout reference: https://commons.wikimedia.org/wiki/File:B%C3%A0n_c%E1%BB%9D_tr%C3%B2_ch%C6%A1i_c%E1%BB%9D_t%C6%B0_l%E1%BB%87nh.jpeg
- 2021 second-edition rulebook listing, not yet compared: https://boardgamegeek.com/filepage/225658/commander-chess-co-tu-lenh-rules-for-2nd-edition

## Acceptance criteria for Phase 1
1. Confirm 132 intersection board and authentic 38-piece deployment from source documentation.
2. Make a tested ruleset with both movement and separate attack actions, every stack/carry/AA/HQ/hero edge case.
3. All rule tests pass, red/blue rotation correct, UI renders 48 px icon distinctions, source attribution visible.
4. New game remains **not published or deployable as playable** until 1–3 pass.

**Reviewed:** `main` commit `97bbdd5121eb0e75c0993f0066c5c16a0b13f5a1` on 2026-11-03.