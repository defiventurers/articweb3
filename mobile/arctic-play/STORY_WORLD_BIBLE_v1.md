# ANTARCTIC GAMING CO. — THE KINGDOM THAT NEVER FORGOT
## Narrative world bible and Android creative direction | Draft v1 | 20 October 2026

**Creative status:** Proposed fictional framing and UX plan, not implemented gameplay, not an endorsed history of any game's origins. **Product:** seven-game Antarctic Kingdoms Android APK, based on static inspection of user-supplied `AntarcticKingdoms-v3.5.1.apk`. **Reference repository:** `defiventurers/articweb3`, default branch `main`, reviewed at `59efca11d56fe161699545d1d032ae4420fcbc43` (2026-10-17). The uploaded APK contains a newer experience than the checked-in `mobile/arctic-play/README.md` and `src/App.jsx` appear to describe; reconcile this before implementation.

## The one-line pitch

> The rest of the world never knew about the festival at the end of the earth: a living Antarctic gathering where old, rare, regional and newly invented strategy games all receive a place beneath the aurora. You have just received an invitation.

**Core tagline:** **The kingdom that never forgot.**  
**Supporting tagline:** *Seven legendary tables. Four unforgettable hosts. One seat kept open for you.*  
**Human truth:** Games survive when people get together, learn, share and play.  
**Creative promise:** The app should feel like joining a place that is already alive, not opening a catalog of downloads.  
**Important constraint:** Shogi and Xiangqi are living traditions, not historically “lost.” Sannin Shogi is a documented 1930s variant, and Arctic Dominion is a modern Chaturanga-inspired adaptation. The Antarctic archive is explicitly fictional. The seven games do not share a single historical origin or timeline.

## The fictional world: The Eternal Gathering

Far south, far below familiar maps, the aurora takes the shape of seven ribbons of light. The four clans of the Antarctic Gathering have made it their custom to welcome games and stories from beyond the ice. Each tradition arrives with its own rules, language, players and history. The penguins don't claim to have invented these other cultures' games; they prepare a great public hall to celebrate each one.

The hall is a home, not a vault. Every table is warm with lantern light. Friends debate moves. Newcomers practice. Grandmasters explain unexpected patterns. A ceremony can be serious for five seconds and hilariously friendly the next. The only enemy is an empty chair — **The Quiet**, the silence that falls when people stop gathering. This is emotional, not a claim that living traditions would cease existing in the real world.

The central circular city is called **Lantern Harbor**. At its heart is **The Gathering Table**, encircled by seven lanterns, each reflecting a different game. Beside them is a mysterious eighth lantern, never lit. It does not advertise an unannounced eighth game: it symbolizes the place for the visiting player. The reveal after visiting all seven halls is **"The eighth light was always for you."** All seven games remain playable immediately; the revelation unlocks a story scene and cosmetic keepsake, never basic access.

### World geography

- **Lantern Harbor:** central home hub, friend arrivals, the Gathering Table, the guest-book, optional rotating events.
- **The River Gate:** Xiangqi pavilion, winter bridges and reflected moon lanterns.
- **The Second Sunrise Hall:** Shogi pavilion, returning lights and indigo-red banners.
- **The Three-Path Garden:** Sannin Shogi pavilion, three entrances converging on the Pleasure Garden.
- **The Hall of Changing Banners:** Sanguo Qi pavilion, three sectors and banners that mark changing control.
- **The Three Friends Observatory:** San You Qi pavilion, unusual Fire and Flag signals and landscape motifs.
- **The Yellow Lantern Court:** Sanguo Yan Yi Qi pavilion, a ceremonial central Han Emperor lantern watched by three other armies.
- **The Four Clans Arena:** Arctic Dominion pavilion, the one hall the penguins openly built for their own modern game.

These are seven *fictional exhibits*, not claims that a historical Chinese or Japanese palace existed in Antarctica. Keep game-native board geometry and original piece roles unchanged.

## Cast: The four penguin hosts

**Polly — pink, the welcome.** Polly organizes guest arrivals and invitations. Her worry is that the Gathering seems intimidating to outsiders; her joy comes from finding a way to teach a move without making anyone feel foolish. Best on first open, practice, cowrie/dice guidance, invites, and Arctic Dominion. Sample: *"You don't have to be brilliant to join the festival. You just have to show up."*

**Retsba — red, the rival who cares.** Retsba loves tactical puzzles and extraordinary moves, but must model good sportsmanship. He never carries weapons and never replaces native pieces. Best on Xiangqi and three-kingdom challenge commentary, captures, rematches and 'good game'. Sample: *"That capture was sharp. Want to see what made it possible?"*

**Pengu — blue, the historian-guide.** Pengu is the careful keeper of names, origins, rules, routes and distinctions between source tradition and modern presentation. His mini-arc is learning that protecting accuracy and welcoming discovery can coexist. Best on each hall's field guide and 'How to Play' bridge. Sample: *"The board has traveled through stories. The rules we're using are written right here."*

**Abster — green, the curious maker.** Abster notices patterns, tinkers with light-and-ice displays, and patiently celebrates experiments and second tries. Best on interactive tutorials, puzzles, hint previews and celebrations of learned mechanics. Sample: *"That one move changed the whole picture. Shall we look again?"*

The four hosts are story companions outside the rules. Their existing reference proportions, colors and identities govern. Do not turn a host into a historical Shogi king, Chinese general, cannon, goat or other source-native game piece. Lively / Quiet / Off controls should remain available and respect reduced-motion preference.

## The Seven Pavilions — detailed episode direction

Each pavilion has its own four-part loop: **Invitation (10–15 sec)** → **Touch a rule (interactive mini-mission)** → **Celebrate the table (play/practice/friends)** → **Collect a memory (personal journal page)**. Its game is never locked by story progression. Visiting all pavilions is optional; players can start a match within two actions.

### 1. XIANGQI — The River Between Stars
**Real-world frame:** China; living Xiangqi tradition. **Edition:** 90 intersections, two sides, palaces, river, chariots, horses, elephants, cannons, soldiers and Generals; Blue artwork stands in for the customary Black side in this APK.  
**Story question:** How can two kingdoms stay connected when a river divides them?  
**Fictional episode:** Snow has made the Lantern Harbor's ceremonial River Gate appear impassable. Pengu points out that the river is not an obstacle in the story but a reminder to study different rules on each side. A lantern floats downstream. Retsba shows how a Cannon may need a screening piece for a capture. The gate brightens whenever a newcomer masters a first legal move.  
**Signature scene:** Red and blue pavilion lamps on opposite sides of a luminous ice channel; true Xiangqi board geometry in the foreground.  
**Host pair:** Pengu + Retsba.  
**Interactive moment:** Reveal a legal Cannon capture **only in a carefully engineered puzzle state**; explain the intervening screen without inventing a rule.  
**Memory:** *River Lantern — "Distance can be part of the strategy."*  
**Game-card hook:** **A river. Two palaces. One brilliant move.**

### 2. SHOGI — The Hall of Second Sunrises
**Real-world frame:** Japan; living Hon-shōgi tradition. **Edition:** 9×9, two sides, promotion and legal captured-piece drops.  
**Story question:** Can something that leaves the board return with a new purpose?  
**Fictional episode:** The red lanterns in the hall dim, then reappear on the opposite side as Pengu explains captured-piece drops. Polly's hopeful joke is that the palace refuses to call a piece's journey "finished" too soon. The story celebrates the surprising tactical design, not a moral claim about war.  
**Signature scene:** A snow-lit Japanese-inspired winter pavilion, suspended shogi-piece silhouettes reappearing as light; original Shogi design remains readable.  
**Host pair:** Pengu + Polly.  
**Interactive moment:** Capture a legal piece and later drop it legally, with highlighting of restrictions.  
**Memory:** *Second Sunrise — "A good idea may have another turn."*  
**Game-card hook:** **Every comeback starts with one move.**

### 3. SANNIN SHOGI — The Garden of Three Paths
**Real-world frame:** Japan; Kokusai Sannin Shogi, a 1930s historical variant (not ancient ordinary Shogi). **Edition:** the APK's selected Fairbairn–Kapitan-inspired digital rules, 127-cell hexagonal board, three armies, drops, promotion, alliances and a Pleasure Garden.  
**Story question:** What changes when there are three minds at a table?  
**Fictional episode:** Three illuminated pathways arrive at one quiet garden. Each route looks inviting from a different angle. Retsba expects to find one rival; there are two, and their decisions can change each other's possibilities. Polly invites a third friend, while Pengu teaches the pavilion's special Garden and royal rules.  
**Signature scene:** A three-armed ice garden viewed from above so the 127-cell hex geometry is not hidden behind scenery.  
**Host pair:** Pengu + Polly, Retsba on tactical moments.  
**Interactive moment:** Three rotated armies, one Garden-related objective demonstrated exactly according to implemented legal actions.  
**Memory:** *Third Path — "Every extra guest changes the game."*  
**Game-card hook:** **Three kingdoms. One extraordinary garden.**

### 4. SANGUO QI — The Hall of Changing Banners
**Real-world frame:** China; historical Xiangqi variant, with precise origin and textual provenance to be checked against the project's rules source. **Edition:** 135 intersections across three sectors; defeated-kingdom pieces transfer control in the selected digital rules, while retaining original artwork and showing an owner ring.  
**Story question:** Who is responsible for a kingdom after its leader is defeated?  
**Fictional episode:** Three great banners hang over the hall. When one team falls, its pieces remain on the festival table, and the control banner changes. Abster wonders why the colors stayed the same; Retsba answers: *"Because the story of a piece isn't erased when the next chapter starts."* Crucially, this explains **digital ownership indication**, not a blanket claim about historical customs.  
**Signature scene:** Three ice citadels connected around a center, with banner light moving between towers, original piece colors intact.  
**Host pair:** Retsba + Abster.  
**Interactive moment:** A scripted, legal defeated-kingdom takeover demonstration showing color-versus-control ring.  
**Memory:** *Changing Banner — "Watch who commands, not just the color you see."*  
**Game-card hook:** **Three kingdoms. One unexpected inheritance.**

### 5. SAN YOU QI — The Three Friends Observatory
**Real-world frame:** China; Three Friends Chess associated in project sources with Qing-era history, using a specified modern digital board/rules edition. **Edition:** 156-intersection approved digital geometry, three sides, Fire and Flag pieces, and special river/mountain/fort conditions. Historical provenance and exact rule variations should be documented separately.  
**Story question:** What happens when familiar strategy meets surprising pieces?  
**Fictional episode:** Abster finds an observatory where three lanes of the aurora never quite overlap. The sky signals resemble Fire and Flags. Pengu admits that old habits from two-player chess won't explain this board; the only route is to study the actual rule markers. Visitors become skywatchers of the Three Friends.  
**Signature scene:** An angular three-way observatory with signal flags and luminous landscape marks matching real board rules.  
**Host pair:** Abster + Pengu.  
**Interactive moment:** Interactive Fire movement and Flag-specific action, each checked against the existing engine; do not convert a poetic lantern into a new rule.  
**Memory:** *Three Signals — "Curiosity notices what experience misses."*  
**Game-card hook:** **Fire. Flags. Three paths through the unknown.**

### 6. SANGUO YAN YI QI — The Yellow Lantern Court
**Real-world frame:** Three Kingdoms thematic material; this APK implements a selected free-play ruleset, **not** verified evidence of an ancient board game. **Edition:** 225 intersections, three controlling armies, a separate yellow Han imperial force, alliances and Han activation/takeover rules.  
**Story question:** Can a single central figure change every plan?  
**Fictional episode:** The Yellow Lantern Court contains a fourth, silent light, distinct from the three guest teams. Nobody may simply claim the light because it is beautiful; its activation is governed by special rules. The yellow Han Emperor appears as a dignified centerpiece, and the three factions navigate diplomacy, movement and control.  
**Signature scene:** Yellow-gold imperial pavilion centered within a multi-kingdom icy landscape, with the existing Han Emperor/chariot/cannon piece designs featured.  
**Host pair:** Retsba + Pengu.  
**Interactive moment:** A verified legal Han interaction and takeover example with owner rings and capture rules preserved; especially test every faction after takeover, based on past regression reports.  
**Memory:** *Imperial Lantern — "One decision can change every alliance."*  
**Game-card hook:** **Three armies. One Han Emperor. Endless consequences.**

### 7. ARCTIC DOMINION — The Four Clans Arena
**Real-world frame:** Modern Antarctic-themed Chaturanga-inspired game, **created for this collection**; do not represent as an untouched ancient source. **Edition:** 8×8, four clans, two dice and independent activations, Frost Kings, War Mammoths, Aurora Unicorns, Icebreakers and Snow Guards, with the selected royal-elimination victory condition.  
**Story question:** What new tradition will the four Antarctic clans create together?  
**Fictional episode:** After celebrating games from other places, Polly announces a table they have been building themselves. The other three hosts bring their personalities: Pengu specifies fair rules, Abster perfects the dice display, Retsba plans opening tactics, and Polly calls the four clans to the lantern-lit arena. No magical surprise is needed: the dramatic reveal is that heritage isn't only the past. A living culture creates new things as well.  
**Signature scene:** A full four-quadrant winter stadium under the aurora; card foreground showcases the actual Frost King, Aurora Unicorn, War Mammoth and Icebreaker artwork, not generic chessmen.  
**Host quartet:** Polly (lead) + all three.  
**Interactive moment:** Roll and spend a die on a supported piece family, clearly teaching the selected dice activation rules.  
**Memory:** *The New Winter — "A tradition can begin tonight."*  
**Game-card hook:** **Four clans. Two dice. Your legend begins here.**

## The three-act story (not a forced campaign)

**Act I — The Invitation.** Players arrive at Lantern Harbor. An aurora postcard shows seven halls, but the celebration is already in progress. Polly escorts them to the Gathering Table: "We saved you a seat." One optional tutorial or one match lights their first personal journal lantern. The player may skip everything and select a game.

**Act II — The Seven Celebrations.** Every first visit to a new pavilion adds one illustrated story page and one symbol to the personal lantern passport. After any three pavilions, the four hosts invite the visitor to a short celebration: they disagree playfully about which table to recommend next. This is not a claim to historical chronology; the halls are available in any order.

**Act III — The Eighth Light.** When all seven games have been meaningfully visited (e.g., a real tutorial move or match, not merely opening a card), a quiet vignette shows seven colorful lights reflected in the eighth empty lantern. The hosts reveal the visitor's place: *"We have never needed another game to complete this table. We needed another person."* The eighth lantern glows. The player receives a cosmetic **Gathering Guest** postcard and may invite a friend. This is personal progress, not a competitive win or tradable asset.

## First-time opening — storyboard and exact copy

**0–4 seconds:** A dark, still Antarctic horizon. Tiny distant lights; then a warm lantern flickers. Caption: *"They called it the end of the world."*

**4–9 seconds:** Over the horizon, seven aurora ribbons converge on a harbor built of luminous ice. Caption: *"To some, it was the beginning of a celebration."*

**9–15 seconds:** Close-up of seven distinct board-pattern mosaics in the city's windows: 9×9 Shogi squares, 127-cell Sannin hex, Xiangqi river layout, three-kingdom patterns, 8×8 Dominion, etc. Caption: *"Every table carries a different story."*

**15–20 seconds:** Polly opens the harbor door. Retsba practices a move; Abster hangs a lantern crookedly; Pengu adjusts the historic information plaques. Caption: *"Four hosts. Seven halls. One open seat."*

**20–25 seconds:** Wide view of the Gathering Table, with a brighter unlit lantern. Polly: *"Oh! You're here. We kept that one for you."* Primary CTA: **Enter the Gathering**. Secondary **Skip intro** visible from the first frame. Entire vignette optional, offline-capable, reduced-motion fallback. Never autoplay lengthy voice/audio.

## Screen direction

**Home = Lantern Harbor:** Make the main hero image an inhabited city, not four oversized characters staring at camera. Include foreground silhouettes of real game pieces and lanterns leading to seven pavilions. Above the fold: *"The Gathering is open"*, **Explore the Halls** and **Join Friends**. Keep **Continue your game** easy to reach. A smaller **Tonight at the Harbor** panel must use true live events, actual friend rooms or a neutral on-device featured-hall rotation — never fabricated activity.

**Games = The Seven Halls:** Seven distinct full-width or staggered art cards, every title prominently legible, quick player-count badge, correct historical classification, primary Play and secondary Explore/How-to-Play. Use game-native motifs. Do not hide games behind lore tasks.

**Hall detail = Before you enter:** 1-2 sentences of original fictional story, one verified historic/modernity label, ruleset link, a mascot with a one-line tip, and actions **Play Now / Practice / Learn / Invite**. The illustrated art must leave enough room for legible mobile labels.

**Learn = The First Move Theater:** Reuse existing interactive tutorial missions; display a brief 1–3-step scene beside an *actual legal state*. Then offer **Try the full board freely**. The host speaks briefly after a meaningful action, not every tap. Legal highlights must remain clear. Preferences: **Lively / Quiet / Off** plus a separate narrative/intro replay setting if useful.

**Friends = Festival Invitations:** "Bring someone to the table" is the emotional language around the existing room-code flow. Never imply public friend presence where the server only stores local invites. Invitations clearly show game, seats, room code and whether bots can fill remaining seats.

**Chats = Campfire conversations:** Room-scoped conversations become the cozy "Campfire" presentation; keep privacy and functionality unchanged. Do not suggest worldwide public chats or unsupported social discovery.

**Profile = Lantern Passport:** Seven illustrated pavilion stamps; first rule learned, first friend visit and personal milestone memories. Existing recovery accounts and progress synchronization may support persistence after verification, but a guest must remain able to use the APK locally.

**Collections = Make it yours:** Existing Aurora Observatory, Lantern Court and Moonlit Library camp decorations can be positioned as optional home personalization. Do not charge for basic rule explanations or misrepresent collections as historical artifacts.

**Updates = Dispatches from the Harbor:** Existing update UI could present release notes as postcards: new hall art, bug fixes, new tutorials, or actual festivals. Reuse verified update-feed download behavior; keep Android install approval explicit.

## Social energy and authentic FOMO

1. **Visible belonging:** room invitations, sharable Hall postcards, celebration reactions and optional event participation. A user can truthfully say they attended the Gathering.
2. **Discovery without pressure:** new journal pages after first legal moves; no time-limited access to heritage games. Repeatable hall discovery encourages curious wandering.
3. **Real events only:** public festival calendar after schedule and backend exist. "Aurora Nights — Saturday" only if scheduled. Never display fake online-player counts, fictitious matches, unsupported friend presence or manipulative countdowns.
4. **Return-worthy rituals:** a true rotating "Hall of the Week" with a tiny rules trivia or puzzle, on-device where possible. More discovery, not token rewards or paid entry.
5. **Friend-first share cards:** "Meet me at the Yellow Lantern Court" with an accurate room link/code and clear game identity. No false promise that all friends already joined.
6. **An honest mystery:** the eighth lantern reveal is part of the narrative, not a fake new-game tease. Future new halls can be introduced only when an actual release plan exists.

## Copy library: quick lines

- Home headline: **"The Gathering is open."**
- Home subline: *"Seven remarkable games. One secret world to explore."*
- First visit: **"The gates were never locked. We were waiting for company."**
- Play: **"Take your seat."**
- Practice: **"Learn a move."**
- Friend invites: **"Bring a friend to the festival."**
- After tutorial: **"One new move. One more lantern glowing."**
- After defeat: **"The table remembers the friends who returned, not just who won."**
- After win: **"Well celebrated. Another chapter for the Gathering."**
- Journal: **"Your Lantern Passport."**
- Seven visited: **"The eighth light was always yours."**
- Heritage footnote: *"Our Antarctic world is fictional. Each game has its own real origin, tradition and chosen edition, explained in its field guide."*

## Proposed seven-hall navigation/data mapping

Maintain the APK's short IDs `shogi`, `sannin`, `sanguo`, `sanyou`, `yanyi`, `xiangqi`, `dominion` as stable keys for all lore records, records of visited halls and screen destinations. The main web catalogue uses different IDs such as `shogi-frozen-shogunate`, `sannin-shogi`, `san-you-qi`, `arctic-dominion` and `heritage-arcade`; do not overwrite those or break direct web URLs. Each lore record needs `id`, `hallName`, `tagline`, `fictionalScene`, `leadHost`, `supportHost`, `heritageLabel`, `rulesetRef`, `tutorialMissionRef`, `posterAsset`, `visitedAt`, `firstMeaningfulActionAt`, `accessibilityDescription`. Any provenance/edition display should come from a separate evidence-backed game rules record rather than invented marketing copy.

## Practical implementation order

**Milestone A — Story without risk (small release):** Identify the **actual current APK source** and reproduce v3.5.1. Add short opening, 7 hall descriptions, clear heritage labels, a mobile-compatible welcome screen and a story setting. Reuse current covers. No backend, chain, rules, board or match protocol modifications. Run Android UI checks; confirm a match is accessible within two actions.

**Milestone B — One genuinely living hall:** Pilot the first rich pavilion on Xiangqi or Arctic Dominion. Wire the existing guided legal-move tutorial to a `firstMeaningfulAction` stamp, optional vignette and a local journal. Measure tutorial completion, render speed and friend invite flow. Expand to other six only after the pilot works.

**Milestone C — Community celebration:** Add Lantern Passport, reusable authentic room postcards, truthful featured-hall programming and real announced events only after backend support. Keep free rooms free. Do not introduce blockchain friction to learning/guest play.

**Milestone D — The Eighth Light:** Add the seven-visit culmination and optional customizable camp keepsake, verify recovery across devices if enabled, and assemble a launch QA pack.

## Acceptance criteria and non-negotiables

- All seven specified games remain reachable without playing narrative scenes or completing achievements.
- Android landscape/portrait layouts, small-screen hit targets, TalkBack accessibility, subtitles/alt text and reduced-motion behavior are tested; no flashing or large autoplay effects.
- Existing local, bot/practice, friends/online, How to Play, private-room validation and app-update flow remain intact where implemented.
- Original piece designs, boards, canonical movement/capture/dice rules and game IDs remain unchanged. Vignettes never block legal move buttons.
- Every hall clearly separates **fictional Antarctic celebration** from **documented game origin, selected historical variant or modern digital adaptation**.
- Penguin role preferences (Lively, Quiet, Off) remain effective. No mascot obstructs a small-screen board.
- Actual social and event claims are server-grounded; no fabricated friend counts, attendance, reward deadlines or fake game scarcity.
- Reconcile source-to-APK disparity first; build/sign with continuity of application identity and signing key; validate device install and upgrade.
- Track first-session load, frame time, memory and APK-size deltas to avoid seven heavy cinematic videos. Favor layered WebP/AVIF or compact vector motion, with static fallback.
- No blockchain or payment requirement for core discovery and free gameplay; no real-money mode added.

## Existing assets worth reusing

The inspected APK already bundles `art/covers/{shogi,sannin,sanguo,sanyou,yanyi,xiangqi,dominion}-card-v2.webp` with board/scene companions, `art/brand/archive-v1/home-archive.webp`, `art/brand/frostbound-v1/home-party.webp`, expressive host variants in `art/brand/hosts-director-v1/`, `art/collections/antarctic-home-hero.webp`, `moonlit-library-camp.webp`, `lantern-court-camp.webp`, `aurora/camp.webp`, and seven-game metadata in `art/covers/manifest.json`. Some asset manifests report unverified reference licensing; validate asset rights before public commercial use. Only assets marked **APPROVED** should govern re-renders of mascot identities; request approval where status is unclear.

## Evidence and limitations

Static inspection of the uploaded APK ZIP, bundled JS/CSS, embedded art manifests and cover assets confirms the presence of the seven target games, seven cover families, Frozen Archive, existing narrative labels, introductory mini-missions, journal and companion preferences. The app was **not** installed or tested on a device in this pass. GitHub `main` at SHA `59efca11d56fe161699545d1d032ae4420fcbc43` was inspected for `mobile/arctic-play/README.md` and first portion of `src/App.jsx`, and appears to describe an earlier six-game UI; do **not** assume editing that module alone reproduces the supplied v3.5.1 APK. No code, APK, assets or server deployments were changed in this creative-direction task. Historic source verification for individual obscure Chinese variants remains a separate task.

## Decision request

Approve or revise the central fiction **The Eternal Gathering**, the mystery of **the eighth lantern representing the visitor**, and the hub name **Lantern Harbor**. Once accepted, freeze the seven-pavilion chapter outlines and reconcile the APK build source before implementing Milestone A.
