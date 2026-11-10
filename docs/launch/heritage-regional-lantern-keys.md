# Heritage Lantern Keys — mobile integration and origin audit
Reviewed branch baseline: `main` at `880ab5e6ad0f8527f8418088cbc18c08ef1e8508` (11 Nov 2026).

## Outcome
- **Implemented in this branch:** source-labeled modern Xiangqi rule quizzes (China) and shogi rule quizzes (Japan) in the existing Android Lantern Formations screen.
- Every three *distinct* correct answers in a region earn one **regional** Lantern Key. China keys can unlock Sanguo Qi, San You Qi, or Sanguo Yan Yi Qi. Japan keys unlock Sannin Shogi. Existing universal keys, 12 formation puzzles, Nine Ice Forts victory keys, match-victory unlocks, and paid entitlements are retained.
- Existing `ap_access_complete` and `ap_access_spend` server paths share the new model; the server recomputes answer correctness and destination eligibility. No NFT/token/money reward is issued.
- These new quizzes are **modern teaching challenges** based on game rules, NOT historical Chinese or Japanese puzzle artifacts. The key's region refers to the parent game's tradition, not the birthplace of the newly authored question.

## Already-built website candidates for later APK ports
These are separate full game engines and UIs in the React/Vite website. Their existing catalogue IDs, rules, and modes must not be overwritten by the short learning quizzes.

| Website ID | Game / source name | Origin assignment | Evidence caution | Suggested key destination |
|---|---|---|---|---|
| `nine-ice-forts` | Navakankari / Nine Men's Morris | widespread; Indian *variant*, ultimate origin uncertain | Do **not** claim Nine Men's Morris was invented in India | Universal key, as already shipped |
| `four-wing-ice-hunt` | Diviyan Keliya / Leopards and Cattle | Sri Lanka | Parker, *Ancient Ceylon* (1909), pp. 581–583; selected ruleset | Future Sri Lankan collection, not an unrelated Chinese hall |
| `ice-hunters` | Bagh-Chal | Nepal | Label documented Nepali tradition; historical invention date uncertain | Future Nepal-linked collection |
| `sixteen-ice-warriors` | Hewakam Keliya | Sri Lanka | Parker (1909) source attribution; inspect full rules notes before port | Future Sri Lankan collection |
| `forty-glacier-guards` | Chalis Gutiya | South Asia / Indian tradition to verify by variant | Require regional rules source | Future verified Indian collection |
| `fishflow` | Pallanguzhi | Tamil South India | Durai (1928) named rule baseline in project | Future Indian collection |
| `khasi-fishflow` | Mawkar Katiya | Khasi tradition of Northeast India | Research-status rules; avoid invented origin date | Future Indian collection |
| `aurora-vulture` | Kaooa / Vulture and Crows | Indian subcontinent (verify variant) | Cultural area is not proof of birthplace | Future Indian collection |
| `ruma-ice-puzzle` | Tchuka Ruma | provenance disputed | Repository explicitly warns against definite Indian origin | Universal puzzle, not India-only key |
| `agon-cold-throne` | Agon / Queen's Guards | British 19th-century publication | Peacock (1842) cited in catalogue; verify origin and edition | Future British/European collection |
| `two-stones` | Do-guti | South Asian tradition | Specific locality/source to audit | Future verified regional collection |

The wider `heritage-arcade` has **modern originals, reconstructions, non-Indian traditions and commercial published games**. Naming a geographical theme after a historical culture does not establish that a modern original originated there. Do not award a geographical key based only on its theme.

## Follow-on porting work
1. Inventory source-native React games/engines, board geometry, difficulty and touch UX; check web-game rights where relevant.
2. For every candidate, document title, source, locality, ruleset, movement/capture/sowing, initial state, win condition, verification and test coverage.
3. Build short **fixed-position, server-verifiable** problems with immutable ruleset IDs. Server replays legal moves against the canonical engine, then awards once per challenge ID. Do not trust client-supplied `won: true`, completion time, or a fabricated replay.
4. Move full games into the mobile catalogue only as separately scoped releases and do not silently expand the seven-game All Access product.
5. Introduce a Nepal, Sri Lanka and India Lantern Key only when that region has a corresponding APK destination; until then keep those games as free side activities or universal-key earners. Avoid making any region's puzzle rewards unusable.
6. Reconcile the Android source with shipped APK assets before rebuilding; update versionCode, preserve certificate and native bridge, run touch screen QA and actual install/update checks.

## Acceptance checklist
- Chinese quizzes grant China-only access and Japanese quizzes grant Japan-only access.
- Three different correct answers, not three retries of the same puzzle, earn a key.
- Wrong answers and local edits of a key ledger do not grant server-authoritative unlocks.
- Original universal keys, paid passes and verified victories work unchanged.
- Cross-device restore and simultaneous spending reconcile, never duplicate keys.
- A return to a solved puzzle teaches its answer without issuing new credit.
- Country, traditional title, documented-versus-modern labels and sources remain visible.
- Tests, APK packaging and real-device checks must pass before release; a PR alone is not an APK.

## Sources
- World Xiangqi Federation, *World XiangQi Rules* (2018): https://www.wxf-xiangqi.org/images/wxf-rules/2018_World_XiangQi_Rules_English2018.pdf
- Japan Shogi Association basic rules: https://www.shogi.or.jp/knowledge/shogi/
- Japan Shogi Association illegal moves: https://www.shogi.or.jp/knowledge/shogi/05.php
- H. Parker, *Ancient Ceylon* (1909), pp. 581–583 (repository's Four-Wing Ice Hunt heritage notes).
- Existing repository: `docs/games/four-wing-ice-hunt.md`, `docs/games/ruma-ice-puzzle.md`, `frontend/src/games/heritage-arcade/ported/data/games.ts`.
