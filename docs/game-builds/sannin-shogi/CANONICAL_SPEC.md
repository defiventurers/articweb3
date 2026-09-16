# Sannin Shogi — canonical game specification

> Lead-owned shared state. All workers must read this file before starting or
> resuming Sannin Shogi work. Items marked **provisional** are research inputs, not
> verified historical claims. Only the lead changes this specification.

## Identity and ownership

- Historical name: Sannin Shogi / Kokusai Sannin Shogi
- Arctic Dominion title: **Sannin Shogi — Three Homes, One Pleasure Garden**
- Game ID / slug: `sannin-shogi`
- Existing Heritage table ID: `24`
- Primary game owner: Worker 1, thread `f2e774c9-a27a-468c-b7d8-33359a78db70`
- Lead: thread `a4347253-6996-4e08-af75-24f321cbe01e`
- Status: Release implementation complete; frontend integration audited
- Acting coordinator for this continuation: thread `91a9a288-314f-4129-b0c2-95a37a010da2` (user-directed while the designated lead tab is closed)
- Last updated: 2026-09-16

## User-locked product requirements

- Build a Sannin Shogi Heritage Arcade game for Arctic Dominion.
- The user has already supplied piece artwork. Do **not** redesign or regenerate the
  pieces; locate the supplied source images and convert/extract them into optimized
  `.webp` game assets while preserving their appearance.
- Board silhouette: one regular hexagon made from exactly 127 identical regular
  pointy-top hexagonal cells.
- Grid radius: 6; side length: 7; 13 horizontal rows with counts
  `7/8/9/10/11/12/13/12/11/10/9/8/7`.
- Cells share complete edges with no gaps, overlap, crop, or rectangular-grid
  substitution. Geometry must be mathematically generated; board art cannot define
  legal topology.

## Canonical historical ruleset — approved 2026-09-15

- Rules baseline: John Fairbairn's English Shogi Magazine transcription, checked
  against Kapitan Revival #40's Japanese rules derived from Shogi Geppo material.
- Identity: Kokusai Sannin Shogi (International Three-player Shogi), devised by
  Tanigasaki Jisuke circa 1930–31. Tanigasaki's book was published in 1932; the
  game appeared in Shogi Geppo material in 1932–33. It is a modern historical
  Japanese variant, not an ancient folk game.
- Sources:
  - https://sanko-bunka-kenkyujo.or.jp/untitled56.html — 1932 book record.
  - https://www.ne.jp/asahi/tetsu/toybox/kapitan/kp040.htm — Japanese rules and
    Shogi Geppo publication history.
  - https://wikipedia2006.classicistranieri.com/s/a/n/Talk~Sannin_shogi_3217.html
    — Fairbairn/Shogi Magazine English rules transcription.
  - https://jpsearch.go.jp/item/tokyomuseumcolection-edo_tokyo_museumjbD03000508
    — museum record for a Kokusai Sannin Shogi supplement.
  - https://commons.wikimedia.org/wiki/File:Sannin_setup.svg — setup diagram.
- Board: the user-locked pointy-top radius-6 / side-7 / 127-cell regular hexagon
  is the approved modern historical topology. The Pleasure Garden is center cell
  `(0,0)`. Each player's nearest three ranks are home territory and the other two
  territories are promotion zones. Factions and complete setups rotate by 120°.
- Per-player force: 18 pieces — K1 R1 B1 G2 S2 N1 L2 P8. The relative formation
  is `L S G K G S L`; second rank `B` at the second file and `R` at the seventh;
  front rank `P P P P N P P P P` with the center pawn gap occupied by N.
- Exact historical setup notation is frozen from Worker 1's Phase 1 report and
  must be encoded as a fixture with 120° rotation equivalence tests.
- Turn order: First → Middle → Last, clockwise. If two players ally before play,
  the unallied player is First and the allies are assigned Middle/Last randomly.
- Piece movement, including owner-relative vectors/rays and the special diagonal
  ray that passes between flanking cells, is frozen exactly as enumerated in Worker
  1's 2026-09-15 Phase 1 evidence report. No orthodox-shogi movement assumption may
  fill a gap. K, R, B, S, L and P promote; G and N do not.
- A king's first-move castling jump may reach any empty or enemy-occupied cell in
  its three-rank home territory, but only if it is not currently checked and has
  never been checked. Alliance formation cancels every unused castling right.
- Captures are by displacement; captured pieces change allegiance, demote and enter
  the capturer's hand. Drops consume the turn, are unpromoted, have no nifu rule,
  forbid dead-terminal P/L drops, and forbid immediate pawn-drop mate.
- Promotion is optional after entering, leaving or moving wholly within either
  opponent territory, and on entering or leaving the Pleasure Garden. P/L promote
  mandatorily if declining leaves no future move. Passing through the Garden alone
  is not promotion. Allied players have no promotion or Garden-win rights.
- A non-allied safe K/+K entering the Pleasure Garden wins immediately.
- Promoted King illumination is an alternative action along its twelve rays. It
  removes **all** eligible first occupied enemy targets that are unprotected by
  either other player, at most one per ray. This all-target behavior is an explicit
  deterministic digital reconstruction of an ambiguous source passage.
- A player may not end or remain in check, including check from an ally. A checked
  player must answer on their own turn. Newly revealed ally-check is illegal.
- Without an alliance, mate eliminates that player and removes its king, board army
  and hand; the mating player acts next. The remaining two continue until one wins.
  With an alliance, mating either ally makes both allies lose. If the allies mate
  the unallied player, that player's forces are removed, the alliance dissolves,
  and the mating player acts next.
- Exactly two players may ally before play or through the documented compulsory
  consecutive/material-winning attack rules and material hierarchy. Allies may
  capture one another's nonroyal pieces but may not check or mate each other. On
  formation, unused castling ends, allies lose promotion/Garden rights, and the
  unallied king auto-promotes with illumination delayed until its next normal turn.
- Digital reconstruction after alliance dissolution: ordinary individual promotion
  and Garden-win rights return; cancelled castling rights never return.
- Repetition is prohibited and the initiating player must vary. Digital position
  identity includes board, hands, side to act, alliance, promotion, castling and
  illumination rights. A would-be repeating action is rejected. A non-check player
  with zero legal actions produces a draw. Orthodox impasse/sennichite rules are not
  imported.
- Stable engine terminology may use familiar shogi role names while the Rulebook and
  Research Notes retain the documented historical political names and attribution.

## Board and coordinate contract

- Canonical topology: radius-6 axial/cube hex coordinates satisfying
  `max(abs(q), abs(r), abs(-q-r)) <= 6`.
- Cell count invariant: `1 + 3r(r + 1) = 127` for `r = 6`.
- Orientation: pointy-top.
- Horizontal row-count invariant: `7,8,9,10,11,12,13,12,11,10,9,8,7`.
- Historical relationship between this geometry and the chosen Sannin Shogi ruleset:
  **must be verified independently**.
- Required geometry tests: 127 unique cells; ring counts `1/6/12/18/24/30/36`;
  36 boundary and 91 interior cells; degree distribution 6 corners×3, 30 boundary×4,
  91 interior×6; 342 undirected adjacency edges; reciprocal distance-1 adjacency;
  bijective 60°/120° rotations.

## Approved engine architecture

- Pure serializable engine under `frontend/src/games/sannin-shogi/`; state includes
  `gameId`, frozen `rulesetVersion`, stable piece IDs, canonical axial cell IDs,
  active faction/turn/phase, pieces, pending resolution, outcome, last action, and
  repetition state only if the approved rules require it.
- Legal-action generation is the source of truth. Public boundary:
  `getLegalActions → validateAction → applyAction`, with explicit error objects and
  illegal actions returning the original state unchanged.
- Board topology and 120° faction rotations are mathematical; rendering derives from
  axial coordinates using a pointy-top SVG viewBox.
- Reuse Agon's engine contract/hex rigor, Frozen Shogunate's separated pseudo-move,
  king-safety, promotion/drop patterns where verified, and Sanguo's three-faction
  turn/search concepts. Do not import square geometry, binary opponent assumptions,
  Sanguo-specific elimination, or unseeded bot randomness.
- Bot evaluation/search remains unapproved until victory, alliance, and elimination
  semantics are canonical. Any bot must consume the exact human legal-action set and
  use deterministic injected tie-breaking.

## Visual and product direction

- Reuse the strongest Arctic Dominion / Heritage Arcade shell, typography, tokens,
  transitions, modals, controls, responsive patterns, and navigation.
- Premium frozen night, carved blue ice, restrained aurora and amber accents,
  charming penguin-world presentation; board readability wins over decoration.
- Existing supplied piece art is authoritative for piece appearance.
- Asset decision: slice the newly supplied 1536×1024 composite into 42 transparent,
  square, Sannin-specific WebPs. Preserve each regular pointy-top hex badge exactly;
  remove only the surrounding faction-band background with an aligned hex alpha
  mask. Do not repaint, generatively fill, redesign, or use raster art as topology.
- Reuse the existing `pieces.json` semantic order and filename convention only. The
  old Frozen Shogunate WebPs are visually different tall pentagonal pieces and must
  not be used as final Sannin assets.
- Rulebook: compact, beginner-friendly, scroll-like, with topology/setup diagrams
  where useful and explicit labels for reconstructed or digital-only policies.

## Work lanes and edit boundary

- Worker 1: primary game owner; historical verification followed by end-to-end work
  within game-specific source/assets/tests/docs after lead confirms the ruleset.
- Worker 2: visual/product inspection and asset-processing recommendation; report only
  until the lead assigns a disjoint path.
- Worker 3: engine architecture and rule-test plan; report only until canonical rules
  are approved.
- Worker 4: responsive/UX baseline and later QA; report reproducible findings.
- Worker 5: Heritage Arcade/Abstract integration and deployment map; report exact
  shared-file changes; do not edit shared files.
- Lead alone edits shared catalogs, routing, registries, global styles, shared host or
  companion components, and shared server/deployment files.

## Open decisions

- Select the historically defensible Sannin Shogi ruleset and reconcile variants.
- Confirm the supplied artwork role mapping against the approved rules. The composite
  is `C:/Users/HP/.t3/userdata/attachments/f2e774c9-a27a-468c-b7d8-33359a78db70-bd3f9270-bdbf-45a5-b520-b18cf65015c0.png`
  (1536×1024). Its semantic layout is blue/red/green faction bands, each with top row
  `king/rook/bishop/gold/silver/knight/lance` and bottom row
  `pawn/dragon/horse/promoted-silver/promoted-knight/promoted-lance/tokin`.
- Freeze explicit crop boxes in a Sannin manifest; naive equal tiling is forbidden.
  Export near-lossless transparent WebP near 192×192 (or 256×256 only if source
  detail supports it), strip metadata, and QA all 42 via ordered contact sheet plus
  overlay checks for clipping, neighboring pixels, background corners, and padding.
- Select Arctic subtitle only after provenance and gameplay character are understood.
- Preserve existing catalog ID `24`. Approved routes are Heritage-native
  `?game=heritage-arcade&table=sannin-shogi` and hidden direct catalog slug
  `?game=sannin-shogi`; do not add a second outer-world box or change landing counts.

## Integration and deployment decisions

- First release is deterministic client-local three-seat/hot-seat play, with bot
  modes only if the approved rules can be implemented honestly. No online-room,
  staking, transaction, or wallet-required claim.
- Retain table 24 in the primary Heritage collection. Replace its `CompactBoard`
  fallthrough with the dedicated app and mark it audited/playable only after rules,
  build, and browser QA pass.
- Add a hidden direct catalog entry for `sannin-shogi`, the direct App render branch,
  host/companion metadata, and both direct/Heritage smoke routes. The lead owns these
  shared edits.
- No backend, contract, database, wallet, chain, or new environment-variable change
  is required. Existing Abstract network status remains observational; moves remain
  local and off-chain. Deployment is frontend/Vercel only after production build.

## Verification and deployment status

- Rules research: not started
- Existing product/repository inspection: in progress. Production already lists table
  24 as “Sannin Shogi — Three Homes, One Pleasure Garden” and describes 127 cells,
  but routes it to the generic `CompactBoard`. The current compact contract uses
  `shape: "hex61"`, 9×9 bounds, generic tokens/march scoring, and explicitly says the
  dedicated piece/drop engine is pending. This placeholder must be replaced by the
  audited 127-cell dedicated game without changing table identity.
- Supplied composite has been located and visually audited; Sannin-specific extraction
  is required because the older WebPs are not pixel/silhouette matches.
- Engine/tests/UI/assets: architecture and topology test contract approved; gameplay
  implementation remains gated on verified rules
- Desktop/mobile browser QA: not started
- Shared integration/build/regression: not started
- Abstract Chain/deployment requirements: mapped; no chain/backend change required
