# Games expedition — v5.9.8 / code 96

## Outcome and acceptance

Games opens as one game per chapter, starting with Chaturanga. A rightward swipe advances; a leftward swipe goes back. Previous/Next buttons and arrow keys provide equivalent navigation. All games retains the original nine-game grid, search, filters, favourites, Play and Learn. Learning shortcuts can still open the learning catalogue directly.

Each chapter has one large existing illustration, an origin/era caption, a labelled edition, a short story lead, two smaller discovery tiles, Play/Unlock and Learn actions, and expandable field notes. The first chapter says “8 more games to discover.” These are nine games in total, including documented modern designs; they are not all described as ancient.

The bottom-centre Crown stays above the bottom navigation. It records a first winning bot or online match for that game, with the original earned instant. Visits, learning moves, draws, losses, hotseat, practice, arranging and explicitly ineligible matches do not award it. It is a cosmetic completion marker, separate from a Passport lantern, the seven-hall Passport Crown, paid access and keys. Existing winning-match records can be displayed without rewriting them.

Existing open/locked access remains authoritative. The three starter games and already owned access stay open; locked chapters can be previewed and invoke the existing unlock sheet. Completing a chapter does not silently replace the current unlock system.

## Accepted layout and asset decisions

No new generated images are included in this iteration, as requested. Existing approved board/table and piece art is reused without recolouring or changing character identities. A native SVG Crown provides the interim completion mark. The next artwork round can replace these slots after layout review:

| Slot | Current content | Suggested next master |
| --- | --- | --- |
| Main scene | Existing illustrated game table | 1200 × 800; central safe area, background detail above the lower title overlay |
| Origins & story | Four existing Chaturanga piece sprites; game scene elsewhere | 640 × 360; a specific historical motif, with no embedded UI text |
| First discovery | Existing board preview | 640 × 360; the actual board/pieces, preserving topology |
| Conquest mark | Small native gold Crown | Separate transparent gold stamp; game name and earned date remain live text |

Chaturanga uses a warm gold accent against the Arctic palette, an explicit Indian subcontinent label, “An army becomes an idea,” and “Four divisions.” The image is still the existing Antarctic adaptation. Dedicated subcontinent artwork remains the next step. Story prose is original documentary-style writing; no broadcaster affiliation is implied.

## History and edition boundary

The user proposed 574 AD. The sources checked do not establish this exact year. The chapter uses **“Roots: 6th–7th century CE”** and explains the uncertainty in its field notes. The Met collection publication discusses India in this period; Michael Mark’s research surveys the limited early evidence and the unresolved dating. “Four divisions” refers to elephants, cavalry, chariots and foot soldiers. The shipped four-player dice/royal-elimination/2v2 game is explicitly a **modern adaptation**, not a reconstruction of a sixth-century match.

- The Metropolitan Museum of Art, *Chess East and West, Past and Present*: https://resources.metmuseum.org/resources/metpublications/pdf/Chess_East_and_West_Past_and_Present_A_Selection_from_the_Gustavus_A_Pfeiffer_Collection.pdf
- Michael Mark, “The Beginnings of Chess,” in *Ancient Board Games in Perspective*, British Museum Press (2007): https://www.chesslongo.com/wp-content/uploads/2022/09/Mark-2007-the-beginnings-of-chess.pdf

Other chapter dating/edition labels are inherited from the existing `gameHistory.js` catalogue, not newly certified historical research in this task. Sanguo dating remains disputed; Shanshui’s invention date remains unresolved; Commander Chess remains a versioned research draft. Sannin Shogi, Sanguo Yan Yi Qi and Commander Chess remain labelled modern. The fictional Antarctic journey is identified separately from game history.

## Source, runtime and release boundary

Reviewed main: `797df870bdca917c3d7f96980dd482b113b03f50`. Implementation branch: `feature/games-expedition-v598`, based on the pending Frost Passport branch at `7c54aa44ed7f98225d18e7dcdb8d9e1362f26414` (PR #70). This retains the compact frost book. PR #70 must be accounted for when merging this stacked work.

The public whole-App source still predates some shipped discovery/Shop presentation, as documented in the Passport releases. The APK therefore uses the shipped v5.9.7 baseline, SHA-256 `605e724720ced7590045ad7d0ad960733449a7ea27513f87b3152e7a9fec754d`, with a guarded presentation patch. The patch wraps the existing grid, adds the Games module/CSS and observes four existing result presentation sites covering all nine games. Each anchor is unique and must match or the build aborts. The source also restores the shipped discovery grid/catalogue and supplies optional result callbacks for the two newer game UIs; neither frontend engine is changed.

The result observer reads canonical local engine outcomes or existing online room outcomes. It does not change move application, server validation, unlock proofs, purchases, blockchain state or Passport milestones. It refuses an already-terminal board that was never observed playing. Crown records are scoped to the active account on this device, deduplicated by game, and stored separately. They are not a security-attested achievement system or a cross-device sync promise. Existing validated win-ledger entries are projected read-only.

All 399 prior art files, eight other JS/workers and native DEX are byte-identical to the baseline. The builder checks the original signing certificate, v2/v3 signatures, ZIP integrity, alignment and every preload byte count. Use `scripts/build-games-expedition-update.py --help` for the reproducible entry point; `--esbuild` is the esbuild **module directory**, not its executable. Signing credentials are provided locally and never included in source or review files.

## Verification and limits

- 70 focused Node checks, including six expedition/model checks; five APK layout checks.
- 108 Games layout cases: nine chapters, six viewport sizes, both themes. Existing images load, controls have 44px touch heights, no horizontal overflow, dock remains above navigation.
- Games browser scenarios: right swipe, consecutive arrow keys, existing unlock sheet, original grid/search/favourites, selected-chapter persistence, per-game Crown isolation, and a real worker-applied final Chaturanga capture from a controlled near-win fixture. The first earned date survives reload. This is not a full-match replay.
- Home regression: 12 layout cases, original routes and saved-board restoration. Passport regression: 72 layout cases, book motion, dates, settings, Chats, saved-room presentation and a real qualifying Xiangqi lesson. No browser page errors.
- Seven changed JSX modules pass syntax transformation. The guarded packaged bundle also passes parsing and runs in the browser scenarios.

Account APIs and Android bridge use local fixtures. Physical Android installation/WebView, TalkBack, live authentication, real online match completion, end-to-end payment and cross-device Crown sync have not been verified. This task prepares the signed APK and source review; it does not merge main, deploy the backend or promote a mandatory-update feed.
