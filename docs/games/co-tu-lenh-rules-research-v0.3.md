# Cờ Tư Lệnh (Commander Chess) — Antarctic Kingdoms Rules Research v0.3

**Status:** RESEARCH DRAFT — not final engine sign-off, not video-transcribed, not deployed.  
**Prepared:** 2026-11-03  
**Heritage name:** Cờ Tư Lệnh / Commander Chess  
**Origin:** Vietnam, devised by Nguyễn Quý Hải around 2010; **modern game**, not an ancient game.  
**Theme layer:** Antarctic Kingdoms character-led **visual adaptation**. Never describe the fantasy unit models as original Vietnamese pieces.

## 0. Provenance and method

**Requested video:** https://youtu.be/bdbllE9d4Ok — *How to Play Vietnamese Commander Chess, Cờ tư lệnh*, AncientChess, published 2015-04-20. Its YouTube metadata was located, but the audiovisual stream and captions could not be accessed in this research session. **Do not attribute any precise passage, timestamp, or demonstration to the unseen video.**

**Closest accompanying source:** Rick Knowlton / AncientChess (2015), illustrated Commander Chess booklet prepared with the inventor's permission: https://veryspecial.us/free-downloads/AncientChess.com-CommanderChess.pdf (pages 2–3). This closely matches the publication period and producing organization of the requested video. Primary source for this proposed *AncientChess 2015 profile*.

**Corroborating sources:**
- Board Game Arena detailed rules (last edited 2024-06-30): https://en.doc.boardgamearena.com/Gamehelpcommanderchess
- Author-associated Vietnamese tournament guide (2016): https://haiduongblog.wordpress.com/2016/10/13/summary-commander-chess-game-rules/
- Author-associated rules in English (archived): https://haiduongblog.wordpress.com/2016/10/ and https://haiduongblog.wordpress.com/2017/12/13/huong-dan-choi-co-tu-lenh-vcc-online-tren-vassal/
- Author-associated explanation of Standard vs Long (2024-01-18): https://haiduongblog.wordpress.com/2024/01/18/
- *Different, broad and internally inconsistent* 2026 publisher overview: https://publishing.everjoy.vn/blog/h%C6%B0%E1%BB%9Bng-d%E1%BA%ABn-c%C3%A1ch-ch%C6%A1i-c%E1%BB%9D-t%C6%B0-l%E1%BB%87nh . It refers to submarines and commandos, unlike the 11-type 2015/2024 rules roster; DO NOT use it to override detailed unit mechanics without a new official edition booklet.

**Not demonstrated:** direct playback of the requested video, timestamp-level extraction, permission for commercial digital adaptation, exact coordinates of every initial piece and the two fords. Those must be verified before production use.

## 1. Battlefield and inventory (shared baseline)

- **Players:** 2, one red and one blue; zero dice or random moves (deterministic perfect-information battle unless an explicitly labelled custom setup is selected).
- **Board:** 11 vertical **lines** (columns 0–10) × 12 horizontal **lines** (rows 0–11), **132 intersections**. Pieces occupy intersections; it is not a board of 11 × 12 cell interiors. For our selected board art, column zero at left; row 0 at bottom, row 11 at top.
- **Terrain:** land on each side; a river between rows 5 and 6; a continuous sea along the left two column intervals (lines 0–2). The land/water boundary (coast) is a special co-occupancy boundary. **Two shallow reef/ford crossings** permit heavy ground weapons across the river, but exact columns must be compared against an authenticated source board; do not infer from decorative bridge illustration.
- **Each side has 19 units** in 11 roles. The piece quantity map is: Commander 1, Infantry 2, Tank 2, Militia 1, Engineer 2, Artillery 2, Anti-aircraft 2, Missile 1, Air force 2, Navy 2, Headquarters 2. Total both armies: 38. **No Deputy Commander.**
- **Initial setup:** 2015 AncientChess booklet includes a standard diagram. Commander appears on (column 6, row 0) for red and (column 6, row 11) for blue; these match a secondary text account. All remaining individual starting coordinates must be separately digitized and two-person checked against the source image before used as automatic standard setup. Do not claim this manifest is complete until then.

## 2. Win modes — keep separate ruleset profiles

**Proposed primary heritage mode: ANCIENTCHESS_2015_STANDARD** (closest to requested 2015 video and booklet). A player immediately wins by any ONE of:
1. Capturing/checkmating the opposing Commander (the two sources differ on exact checkmate-vs-capture procedural wording; enforce Commander safety and adjudicate with explicit rules).
2. Removing both opposing Air force units (2/2).
3. Removing both opposing Navy ships (2/2).
4. Removing the six opposing core land units: both Infantry, both Tanks, both Artillery (6/6).

**ANCIENTCHESS_2015_TOTAL_WAR / LONG:** Commander defeat only, per 2016 tournament format and 2024 Standard/Long author-associated clarification; do **not** apply the air/sea/land automatic victories. The inventor-associated 2016 tournament guide used a 30-minute limit, with points at timeout.

**AUTHOR_2024_STANDARD_OPTION:** The inventor-associated January 2024 explanatory post defines land-division victory as **two Infantry, two Engineers, two Artillery, two Tanks and one Militia = 9 units**, unlike the 2015/2016 six-unit rule and Board Game Arena's six-unit text. This must be a **labelled alternative profile** with explicit provenance, not silently mixed into `ANCIENTCHESS_2015_STANDARD`.

**Tournament timing/points:** The 2016 tournament guide uses 15 minutes for tactical play and 30 minutes for total war; if time expires, captured-piece points determine result. It mentions a 100-point tactical victory bonus. The 2024 author-associated note says 50 Commander-capture bonus; do not mix scoring versions. For un-timed friendly play, normal win criteria apply; optional timers, forfeits and draw adjudication require a declared policy rather than inference.

## 3. Unit movement matrix — heritage-era baseline

All distances count **intersection-to-intersection steps**. Orthogonal = horizontal or vertical; diagonal = four 45-degree directions. Normally units cannot pass through occupied intersection nodes unless a specific rule states otherwise. Exact capture eligibility always includes terrain/stack/airspace constraints.

| Unit / VN | Qty/side | Basic movement | Key capture / terrain / abilities | Captured-piece score (2015) |
|---|---:|---|---|---:|
| Commander / Tư lệnh | 1 | Any unobstructed orthogonal distance; capture only adjacent orthogonally | Can use HQ or eligible carriers; opposing Commanders must not face across an unobstructed line | 100 |
| Infantry / Bộ binh | 2 | 1 orthogonal | May cross river, ride eligible carriers | 10 |
| Tank / Xe tăng | 2 | 1–2 orthogonal | Carries Commander, Infantry and Militia; may fire at a ship without moving into sea | 20 |
| Militia / Dân quân | 1 | 1 orthogonal or diagonal | May cross river, ride carriers | 10 |
| Engineer / Công binh | 2 | 1 orthogonal | Enables transport of heavy Artillery, Anti-aircraft and Missile across river; source versions differ on any engineer air-defense radius | 10 |
| Artillery / Pháo binh | 2 | 1–3 orthogonal or diagonal | Can jump an obstruction **only when capturing**; heavy weapon ford restriction; attack across river may enable crossing | 30 |
| Anti-aircraft / Cao xạ | 2 | 1 orthogonal | Anti-aircraft radius 1; heavy weapon ford restriction; sea attacks do not move the attacker into deep water | 10 |
| Missile / Tên lửa | 1 | 1–2 orthogonal, plus 1 diagonal (2015 booklet and inventor guide; BGA table omits diagonal) | Air-defense radius 2 orthogonally / 1 diagonally; heavy weapon ford restriction | 20 |
| Air force / Không quân | 2 | 1–4 orthogonal or diagonal; may fly over blocking pieces | May attack, stay or return to its origin **on the same turn** when target is not another Air force; carries passengers; faces enemy air-defence zones | 40 |
| Navy / Hải quân | 2 | 1–4 on sea/river routes, possibly diagonally subject to coast constraints | May attack coastal/naval targets, bombard inland at range 3 without relocating; naval and inland targets may be hit in same turn in 2015 booklet; transports eligible units; radius-1 air defence | 80 |
| Headquarters / Sở chỉ huy | 2 | Stationary | Commander may enter and stack; partial protection depends on attacking unit; HQ itself worth 10 when destroyed | 10 |

**Not part of this game baseline:** universally stronger units winning head-on strength contests; general infantry flanking multiplier; mandatory next-turn plane refuelling; Deputy Commanders; aircraft moving to any arbitrary point regardless of range.

## 4. High-priority mechanics (full behavior, not merely cosmetic)

### 4.1 Capture and terrain
- Normal capture displaces the enemy on the destination intersection, except explicit **shooting without relocation** (land attacks on a sea unit, sea bombardment inland). Where sea and land meet on a shared coast coordinate, the attacker can replace the target when its move would physically be legal; the land and naval occupancy layers may otherwise coexist without blocking each other.
- Terrain must be checked for **the path**, not just the destination. A heavy weapon crosses the river at the designated two shallow reefs or via Engineer transport, or (per inventor/2015 rules) by an allowed capture across the river. Neither the two-reef geometry nor those capture exceptions should be omitted.
- Naval vessels stay on aquatic routes. They may enter the river but not cross shallow reefs; they cannot cut diagonally over land, although their ranged bombardment may affect land targets.
- No invented combat-strength table, health-bar damage system, or flanking damage rules.

### 4.2 Commander protection and sightline
- The opposing Commanders may not stand with a clear, unobstructed line between them. The BGA implementation reports that exposing your Commander to the enemy Commander triggers immediate defeat; the original booklet phrases a prohibition on traversing a clear line, so define an explicit adjudication profile and test it.
- HQ is a stationary **protective** piece, not a unit that can move or attack. The Commander may occupy the same location as its own HQ. The 2015 booklet says HQ protects the Commander from Infantry, Militia, Anti-aircraft and Missile, **but not** Engineer, Tank, Artillery or Air force; attacks that can destroy only HQ leave Commander for subsequent resolution. Some accounts phrase Navy special treatment separately; verify the precise Navy/HQ interaction from a full video or authorized manual.

### 4.3 Air-defense threats and heroic aircraft
- Anti-aircraft and Navy protect a radius-1 local airspace; Missile radius-2 orthogonal plus a single diagonal step (geometric circle interpretation). The moving path of a normal aircraft must be intersected with all enemy coverage zones. Being shot down is automatic under the source's stated conditions; there is no dice roll.
- An aircraft may sacrifice itself by successfully attacking a protected target within the hazardous zone (kamikaze). BGA clarifies that path and timing matter: if it exits a defended area before reaching the target it is shot down before the attack. A capture that removes the last defending Navy may still secure a win despite the attacker's destruction. Implement with a clearly specified event ordering.
- **Hero promotion:** a unit that checks the opposing Commander becomes Heroic for the rest of the match. It gains +1 movement/capture reach and diagonal access (if it lacked it); Hero Air force ignores air-defence zones. The inventor-associated 2016 source also discusses a final-surviving defensive Hero rule; this differs in precision between sources, so leave that optional and unverified for the heritage-video profile.

### 4.4 Passenger transport and multi-actions
- Types that can transport passengers: Tank, Air force, Navy and Engineer; HQ holds only a Commander. Other units may embark if permitted by the specific carrier and terrain.
- Board Game Arena uses a **maximum stack size of 3 pieces** for Tank/Air force/Navy (carrier + at most 2 passengers), and **2** for Engineer or HQ. A Tank may carry at most 1 Infantry. A flying carrier may carry a Tank, but not two. These are BGA formalizations that are not equally explicit in the shorter 2015 booklet.
- Engineer carries a **single** Artillery / Anti-aircraft / Missile only across a river segment, not an unrestricted mobile platform.
- In a composite stack, eligible pieces can separate and execute their own distinct moves/captures during a single player turn. The carrying piece may move with passengers remaining attached. **Actions must be tracked per component**, and a carrier destroyed with passengers also destroys its cargo. Source-native transport is not just an animation.
- The inventor-associated tournament explanation states embarking may consume an action before the loaded stack performs its later movement. The BGA guide more explicitly describes single-turn disembark/multiple moves. Choose an explicit profile and test both; never accidentally allow unlimited embark/disembark cycles.

### 4.5 Artillery, Navy, aircraft attack resolution
- Artillery's special jumping attack is not permission to jump on regular travel. Verify a valid target and terrain; resolve target removal and displacement.
- Navy can move/capture on water and attack land at range 3. The 2015 booklet describes firing its sea torpedo and land artillery within the same turn, permitting two captures (where targets qualify). Distinguish ranged-fire events from ship movement.
- Aircraft do not have a required refuel-on-next-turn mechanic in this source profile. Airstrike-to-origin is a **same-turn** option; capturing an opposing aircraft is an explicit exception. An aircraft transporting a passenger may drop it and return in one turn as described in the 2015 booklet.

## 5. Suggested playable modes and UX (do not disguise design changes as heritage)

1. **Learn / Practice (modern interface):** no clock, single mechanic at a time, overlays for legal destination and shooting range; include a step-by-step multi-unit stack interface. Red side bottom by default, view rotates in software for Blue.
2. **Heritage Standard — 2015 rules profile:** 4 win conditions, optional 15-minute total match clock, source-native roster and positions. Default recommended for this *specific 2015 video research* pending accurate setup/ford confirmation.
3. **Heritage Long / Total War:** same movement rules, only Commander defeat auto-wins, optional 30-minute clock and points at expiry.
4. **Creator 2024 Standard (labelled variant):** 9-unit land division definition rather than 6; track source-specific scoring rule.
5. **Arctic Friendly Sprint (explicit MODERN adaptation):** short configurable clock and simplified turn presentation, but **do not silently remove legal move types, carrier capabilities, air-defense or hero status**. If simplifying mechanics, name the game variant clearly and don't call it original Cờ Tư Lệnh.
6. **Free arrangement / scenario editor:** source-documented alternate deployment configurations exist, but arbitrary piece placement needs safe validation and a clearly displayed “custom setup” label.
7. **Local, practice, bot, and online** modes must run the same authoritative rule engine; only interface assistance and opponent source differ.

## 6. Source conflicts to be decided BEFORE engine finalization

| Topic | AncientChess booklet / 2016 tournament | BGA / creator 2024 | Development rule |
|---|---|---|---|
| Land division win | 2 Infantry + 2 Tanks + 2 Artillery = 6 | 2024 creator-side text adds 2 Engineers + 1 Militia = 9; BGA still says 6 | Versioned win profile, default 2015 = 6 |
| Commander move range | “Any number” of unobstructed orthogonal steps | BGA table says maximum 10 | Use unlimited for 2015 profile; BGA mode = 10 |
| Missile diagonal step | 1 diagonal step allowed | BGA piece table uses no diagonal | Use 2015 1 diagonal; no diagonal only in BGA profile |
| Air defence by Engineer | Some 2015 booklet table text says radius 1 | BGA and other summaries only specify Aa, Ms and Navy | Flag as conflict; do not enable without author clarification / video frame |
| Tank movement | 2015 table says “8 possible directions” while also saying “along lines” | Inventor-associated 2016 and BGA specify orthogonal 2 | Treat “8 possible directions” as an ambiguous/likely erroneous phrase; implement orthogonal unless authenticated demonstration contradicts |
| Stack capacity/actions | Short booklet allows several pieces together / one-turn multi-actions | BGA explicitly caps carrier + 2 passengers and engineer + 1 | Use BGA capacities provisionally, but annotate that detailed caps are BGA-derived |
| Navy simultaneous attacks | 2015 booklet says may fire two weapons, 2 captures | BGA text less explicit on simultaneous attacks | Preserve 2015 two-weapon action subject to legal ranges |
| Timed bonuses | 2016 tournament describes 100-point bonus | 2024 note describes 50 after Commander defeat | Separate tournament scoring policies |
| No legal moves / check | Not sufficiently resolved by companion booklet | BGA enforce-check may require resign if no legal moves | Explicit source-specific draw/resign adjudication required |
| Airstrike return | Same turn, excluding attack on opposing plane | BGA same-turn bomb-and-return, special AA path handling | No fuel cooldown in heritage profile |

## 7. Engine data model and event ordering recommendation (PROPOSED, not heritage fact)

Rules engine inputs: `rulesProfile`, `boardGeometry`, `turn`, `pieces[]`, `stackIds`, `heroFlags`, `attackZones`, `scores`, `clocks`, `history`. Piece state needs `id`, `faction`, `type`, `column`, `row`, `carrierId|null`, `heroic`, `alive`. A single display coordinate may have a water/land coast coexistence scenario and/or allied stack; represent this intentionally rather than a single `board[row][column]` occupant. Preserve original catalogue IDs and game URLs; do not connect this rules engine to chain payments or wallet state.

`validateAction` should be pure and server-shared. Classify actions into: `MOVE`, `CAPTURE_DISPLACE`, `SHOOT_STAY`, `AIRSTRIKE_RETURN`, `EMBARK`, `CARRIER_TRAVEL`, `DISEMBARK`, `STACK_SEQUENCE`, `HERO_PROMOTE`, `AIR_DEFENSE_INTERCEPT`, `RESIGN`, `TIMEOUT`, `FINISH`. Enforce a bounded number of permitted subactions from a composite unit; clients only request, servers adjudicate.

Recommended deterministic resolution ordering, subject to heritage sign-off: (1) choose rules profile and active stack, (2) validate action path and terrain, (3) evaluate firing zones during travel, (4) resolve interception and suicide-strike exception, (5) apply target capture and displacement/stay, (6) update cargo stack or discharge selected passengers, (7) update Hero status upon check, (8) check immediate victory conditions (including simultaneous final-aircraft loss edge case), (9) update score and clocks, (10) record turn and pass control. Record a source-specific conflict note for any event ordering not explained in published rules.

## 8. Acceptance tests required before gameplay release

### Static geometry and initial state
- Exactly 11 columns, 12 rows, 132 valid intersection IDs (NOT 132 squares); playable terrain zone mask matches the physical diagram.
- Exactly 19 units per side, counts of all 11 types verified; no Deputy Commander; all 38 initial positions validated against the 2015 diagram; no forbidden terrain placements.
- Reef crossing positions match the source diagram, not arbitrary visually appealing bridge art.

### Movement/capture
- For every unit, legal targets and path blocking at board edges, land/sea boundary, both reefs, river, and diagonal routes.
- Attack by land on ship and ship on land removes target while remaining on original position where required; coastal capture displacement tested separately.
- Artillery jumps only for eligible captures; cannot jump just to relocate; enemy target removal path validated.
- Aircraft can carry passenger, disembark and return where permitted; cannot silently return after capturing opposing aircraft.
- Anti-aircraft/Airforce interactions: enter, exit and remain within ring; kamikaze resolution; Heroic plane immunity; simultaneous victory-vs-shot-down case.

### Stacks, wins, turn finalization
- Embark eligibility, maximum stack sizes, no two tanks on aircraft, Engineer heavy-weapon bridge restriction, cargo loss on carrier capture.
- Composite turn allows documented separation and multiple captures but forbids repeated reuse of the same component outside the profile's action budget.
- Check detection and persistent hero flags, +1 range, diagonal promotion, opposing-Commander sightline, HQ protection interactions.
- Standard 2015 wins on commander, 2/2 Navy, 2/2 Air force, 6/6 core land; creator 2024 variant wins on 9/9 land; Long only on Commander. Timeout scoring and draws test separately.
- Multiplayer server refuses illegal action regardless of client; local, bot, practice and online share deterministic identical legal moves.

## 9. Pending verification and rights

**Before declaring historical research complete:** (a) obtain an accessible caption transcript or video file for the requested YouTube link and log timestamped differences; (b) transcribe all 38 exact starting coordinates and precise ford indices against primary image; (c) establish which current official edition to support, especially changed land-division condition; (d) clarify the Engineer/AA, Missile diagonal, aircraft/stack edge cases with official manual; (e) implement tests and confirm passed runs (none are claimed here).

**Commercial release:** The 2015 AncientChess booklet explicitly reserves rights to the game to the creator and grants only the booklet maker permission for that use. Comicola reports that rights were transferred/licensed to **Everjoy Publishing in late 2024**: https://blog.comicola.com/nhan-dip-30-4-ke-lai-hanh-trinh-voi-san-pham-co-tu-lenh/ . Verify the scope of rights and obtain appropriate commercial digital adaptation authorization before commercial release; those sources do **not** constitute permission for Antarctic Kingdoms. A separate character-led, visually distinct adaptation and independent graphics do not themselves resolve the licensing question.

**Artwork:** Existing approved red/blue penguin references are the basis for proposed character-led fantasy pieces; `PENGUIN_HOSTS_DIRECTION.md` generally keeps guides outside playable source-native roles, so explicitly document Cờ Tư Lệnh's character pieces as an approved **modern visual adaptation**, and retain an original-symbol/heritage display option if permission allows.

**Outcome:** Research-grade provisional ruleset with source conflicts identified; no repository changes, code tests or deployment claimed.