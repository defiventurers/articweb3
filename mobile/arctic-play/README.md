> Latest: v5.0.10 (61). Uploaded ice-white San You Qi board and 27-piece atlas, recalibrated points and preserved owner startup. See docs/releases/v5.0.10-sanyou-ice-white.md.

# Current release: 4.7.0 — A compact Home and Games screen

See [RELEASE-4.7.0.md](RELEASE-4.7.0.md) for the current changes, rebuild commands, validation and publication status.

# Antarctic Kingdoms for Android

## What is new in 3.9.0 — Your turn, your choice

Arctic Dominion dice show the actual current team’s eligible pieces instead of
piece-name text. Rolls 1 and 5 show both Snow Guard and Frost King. Used dice
remain visibly dimmed and marked Used; screen readers retain the piece names.
After rolling, **End turn** is available before any move or after the first move.
It advances to the next surviving kingdom, keeps accepted moves and resets dice.
Automatic passing of unusable dice and normal two-move turns are retained.
Casual bots keep using playable dice. See `RELEASE-3.9.0.md` for verification.

## What is new in 3.8.0 — A celebration at every table

The Eternal Gathering celebrates remarkable games and their communities.
The Home motto is now **Remarkable games. An endless celebration.**
Eleven original story scenes connect Lantern Harbor, all seven halls, Friends,
the Lantern Passport and the Eighth Lantern finale. Real board previews remain
visible within the illustrated hall tables. Twelve free transparent stickers
connect each game to its hosts, plus welcomes, good games, ideas and rematches.
Find them in Profile → Festival stickers or in table chat. Image sharing exports
a transparent PNG through the existing share sheet.

All artwork is bundled for offline use. Full-size PNG masters, optimized WebPs,
the generation briefs and the visual guide are included in the source and asset
deliveries. See `RELEASE-3.8.0.md` and `verification/celebration/` for scope and
evidence. The completed local v3.7.0 source, package identity and signing key are
the baseline for this update.

## What is new in 3.7.0 — The Eternal Gathering

Lantern Harbor welcomes players into seven individually written halls. An optional
25-second captioned opening, 17 legal-rule scene links, original tap-to-hear
sound motifs, a Lantern Passport, private hall invitations, hall postcards and
the Eighth Lantern reveal connect the collection. Every game remains open.
The final reveal earns a free postcard and a placeable Camp lantern.

Stories have an independent Off switch. Existing mascot preferences, day/night
ice, game modes, rules, save keys, recovery and collections are retained.
Aurora Nights is labelled as a future concept; there is no fabricated activity.
New story timestamps/keepsakes are local to the device.

Source baseline: recovered v3.5.0 source plus v3.5.1 runtime art and sporty icon.
Reviewed GitHub main: 59efca11d56fe161699545d1d032ae4420fcbc43. The older main
branch was not substituted for the newer source. The conversational v3.6 files
were unavailable, so its story paths were reconstructed.

Build from the archive root:

```bash
npm ci --prefix recovery/android-build-deps
ln -s ../recovery/android-build-deps/node_modules frontend/node_modules
ln -s ../recovery/android-build-deps/node_modules server/node_modules
npm run build --prefix mobile/arctic-play -- --reuse-artwork recovery/baseline-art
npm test --prefix mobile/arctic-play
python mobile/arctic-play/scripts/build-apk.py --sdk /path/android-sdk --jdk /path/jdk --keystore /private/ArcticPlay-release.jks --password-file /private/signing-password.txt --output out
```

A JRE-only environment can add `--javac-jar /path/ecj.jar` to use Eclipse ECJ.
Browser QA is `tests/gathering-browser.mjs`, with `BROWSER_PATH` selecting a
local Chromium executable. Verification reports and acceptance decisions are
in `verification/gathering/` and `ETERNAL_GATHERING_PLAN.md`. The complete
original brief is preserved as `STORY_WORLD_BIBLE_v1.md`.

The v3.7/v3.8 story releases did not change website hosting or the public update feed.
The v3.9 online turn fix is scoped to the separate Android room engine; see its release notes.
The original signing key and application ID are retained. Physical-device
installation, real TalkBack, receiving-app sharing and receiving-app behavior still require physical-device validation.

A separate, signed Android app containing seven games: Shogi, Sannin Shogi,
Sanguo Qi, San You Qi, Sanguo Yan Yi Qi, Xiangqi and Arctic Dominion (Chaturanga). Antarctic Kingdoms is the separate Android app by Antarctic Gaming Co.:
**Timeless games. A new world.** The Frozen Archive, original penguin guides,
glacier-daylight and night-ice appearances and a learning journal surround the games. Game art and
canonical rule engines come from Heritage Arcade. See BRAND_DIRECTION.md for
the accepted direction, edition labels and continuity requirements.

The existing Arctic Dominion website's frontend files and rule engines are not
modified. Android rooms use a separate `ap_` protocol and `arctic-play` room type.
The backend validates moves in worker threads, keeping its main event loop free
for the existing website rooms.

## Install and play

1. Download `AntarcticKingdoms-v3.9.0.apk` onto an Android phone and open it. Install it
   over an earlier version to keep your profile, favorites, practice games and saved seats.
2. If Android asks, allow the app that opened the APK to install from that source.
3. Open Antarctic Kingdoms and choose your name/avatar in Profile.
4. In Games, choose a game and tap **Play with friends**.
5. Share the invitation or the six-character room code. Friends tap **Join room**
   and enter the code or paste the full invitation message/link.
6. Everyone taps **I'm ready**. The host starts the table. Empty seats can be
   filled with casual bots. Arctic Dominion supports four players.

The APK itself can be shared from **Profile → Share the Android app** through
Android's share sheet. Guest play remains available; recovery accounts and collections are optional.
Online play needs internet; practice and pass-the-phone games work offline.
Android 7.0/API 24 or newer with an up-to-date Android System WebView is required.

## What’s new in 3.5

A new four-mascot kingdom crest and Frozen Archive illustration bring the
heritage-game identity into the ice world. Home displays the genuine Shogi
royal piece, Han Emperor and War Mammoth alongside the guides and the existing
motto. Warm inlays, quieter reading surfaces and heritage headings now connect
the main screens, learning, match controls, dialogs and the free default Camp.

The catalogue presents compact game cards, removes a repeated Join row and
moves the returning-player puzzle below the games. Friends and Chats have
optional mascot welcomes; empty Chats leads into game discovery. Profile and
the companion dock take less space. Existing purchased Camp scenery and all
game rules, boards, piece art, saved data and preferences remain intact.

Version 3.5.0 / code 25 retains the package and signing identity. See
`FROZEN_ARCHIVE_DESIGN.md` for the design, source artwork, prompts and checks.

## What’s new in 3.4

Home now places Polly, Pengu, Retsba, Abster and the existing Frost King directly
on the shared ice world, using transparent artwork. A shorter introduction,
the unchanged motto and one prominent **Find a game** action bring the games
closer. **Join friends**, Camp and discoveries retain their existing routes.

Buttons, menus, selectors, utility controls and the five-tab navigation share
translucent ice materials in both appearances. The new launcher icon features
all four companions in a playful game-ready huddle, with adaptive-mask padding.
The previous game-board, piece-spacing and transparency fixes remain intact.

Version 3.4.0 / code 24 retains the package, signing certificate and saved data.
See `FROSTBOUND_INTERFACE.md` for asset paths, prompts, build steps and checks.

## What’s new in 3.3

Original glacier and night-ice artwork now surrounds the whole app: Home,
Friends, Games, Chats, Profile, Camp, learning, game tables and dialogs. Frosted
surfaces keep instructions and controls readable. Profile's existing Dark mode
switch chooses Night ice or Glacier daylight; the saved choice is applied before
the main interface starts. Both backgrounds are bundled for offline use.

Android's launch surface and system bars use the coordinated night-ice palette.
The game boards, seven rule engines, saved progress and signing identity are
preserved, including the previous Yan Yi artwork/spacing and Xiangqi transparency
fixes. Version 3.3.0 / code 23 installs over earlier releases.

The scene masters, runtime WebP files and exact generation prompts are in
`art/ice/`. See `ICE_THEME.md` for build steps and verification details.

## What’s new in 2.8

Short first-game routes lead to Practice, with the complete rules available in
168 interactive cards. The one-piece explorer supports all 52 starting piece
types, with Red at the bottom and Shu/Red for Yan Yi. Original match rules and
opening turns remain intact.

The four reference mascots have six responsive expressions each, with no dice
in their artwork. Permanent memories, free cosmetic unlocks, Camp keepsakes,
one-move daily puzzles and an easy weekly discovery goal support return play.
Private reactions and illustrated postcards are optional and require a tap to
send or share. An invitation can be added or removed in the postcard preview.
Quiet, Off and reduced motion remain available.

Version 2.8.0 / code 14 keeps the package and original signing identity. See
[COMPANION_DIRECTOR.md](COMPANION_DIRECTOR.md) for details and build instructions.

## What’s new in 2.5

Learning now presents one short mascot instruction, the board and the next
action. First-time players see their game's goal and **Start learning**;
returning players resume the first untried lesson. All 28 game-specific
discoveries remain available through **Options → Choose a lesson**.

**Need help?** opens hints, watch-once examples, setup comparisons and the
rule explanation. **Options** holds the game/section choices, pieces, free
board, warm-ups and rules. Zoom remains available through a small disclosure;
pinch and drag still work. Completed moves reveal the next lesson action.

Rules open with the goal and three turn steps. A single selector opens
interactive examples, one piece at a time or searchable full rules. Game
entry offers **How to play**, **Play with friends** and **Practice with bots**
(or **Continue saved practice**). Seats, joining, pass-the-phone and additional
reading are under **More options**.

Version 2.5.0 / code 11 keeps the package, signing identity, saved progress,
game-specific lessons and artwork. See [MINIMAL_LEARNING.md](MINIMAL_LEARNING.md)
for decisions, acceptance criteria and validation.

## What’s new in 2.4

Each of the seven games now has its own four-stop beginner adventure: 28
engine-backed discoveries with game-specific mascot cues, manual hints,
watch-then-try examples and reversible rule comparisons. Shogi teaches
promotion and royal safety; Sannin explores rotated hex paths and a real Garden
win; Sanguo teaches inheritance; San You explores Fire, Flags and terrain;
Yan Yi teaches Han and alliances; Xiangqi explores its river, Horse and palace;
Arctic Dominion teaches a complete two-dice turn and royal elimination.

**Rules → Try a rule** opens the same interactive scenes directly inside the
pocket guide. Each game keeps its own discovery stamps. Watching, switching
setups and tapping a mascot never earn a stamp. All 21 earlier warm-ups, 52
piece examples, seven free boards and full canonical chapters remain available.

See [CURATED_ADVENTURES.md](CURATED_ADVENTURES.md) for the scope and validation.

## What’s new in 2.3

- Four new transparent, rounded mascot illustrations preserve Polly, Pengu,
  Retsba and Abster's colours and roles. Original references remain in the repo.
- **Pocket rules** provides a quick goal and three turn steps, visual piece
  cards, small glossary terms, searchable complete rules and edition details.
- All five learning steps fit on a phone. Short cues, optional explanations,
  calmer drop examples and a badge for three accepted challenges simplify play.
- Tap guides for tiny tips or a flipper five; **Learn together** connects the
  companion camp to school. These taps never change moves or lesson progress.
- Version 2.3.0 / code 9 keeps the package, original signing key, saved data and
  online protocol. See CUTE_SCHOOL.md for the accepted direction and checks;
  art/brand/hosts-cute-v3 contains the assets, manifest and generation prompts.

## What’s new in 2.2

- **How to play → Little Flipper School** brings Polly, Pengu, Retsba and Abster
  into every game’s lessons. Try a first move, a capture and a special action;
  all 21 challenges use the existing rule engines. Only accepted moves save
  lesson progress. The existing quick start and full rules remain available.
- **Meet the pieces** explains all 52 starting piece types, with original art,
  legal movement examples and game-specific special/promotion notes.
- **Free board** lets you arrange every army freely, swap occupied points,
  remove pieces, undo and reset. Setups save separately from real games and
  show clearly that normal movement rules are off.
- Teaching uses independent boards. Visiting school preserves an existing
  practice game or online seat. Off hides teaching portraits; instructions,
  controls and progress stay available. Quiet and reduced motion are respected.
- Version 2.2.0 / code 8 keeps the original package and signing key. See
  HOW_TO_PLAY.md for the curriculum, source baseline, decisions and checks.
  The additional external practice URL is pending the user’s supplied link.

## What’s new in 2.0

- Antarctic Kingdoms replaces Arctic Play as the visible app name; the umbrella
  brand is Antarctic Gaming Co.
- A generated penguin royal-piece emblem is packaged for legacy launchers,
  adaptive masks and Android 13 themed icons. Source masters and prompts are
  in art/brand; build-brand.mjs reproduces the packaged sizes.
- Discover introduces the fictional Frozen Archive, the four original hosts and
  a local learning journal. Only an accepted guided piece move completes an
  entry. All games remain open, with no progress locks.
- Every game exposes origin/edition labels. Living traditions and historical
  variants are distinguished from Arctic Dominion’s modern adaptation.
- Version 2.0.0 / code 6 keeps the original signing key, package, storage and
  multiplayer protocol. Old invitations work; antarctickingdoms:// links are
  supported too. Android sharing uses the actual installed version filename.
- Public updates keep the existing trusted ArcticPlay-vX.Y.Z.apk URL format so
  v1.4 users can discover this rebrand. The public alias is byte-identical to
  AntarcticKingdoms-v2.0.0.apk; neither file requires uninstalling the old app.

## What's improved in 1.4

- **Profile → App updates** checks for the newest public APK when opened. It
  shows the installed version from Android, latest version, download size and
  release notes. **Check for updates** refreshes the feed; failures and a
  12-second timeout show a retry action and clear stale download targets.
- **Download update** opens the exact APK in the phone's browser. The browser
  handles downloading, and Android asks the user to confirm installation. No
  installer or storage permission is added to the app. The same-version APK can
  also be downloaded for sharing. Older versions cannot be downloaded here.
- Version 1.4.0 / code 5 retains the original signing certificate, app package,
  local storage and multiplayer protocol. Install 1.4 once to gain this screen;
  future releases are discovered through it.
- `release-config.json` supplies the displayed build version. Builds verify it
  against the Android manifest. The update feed requires the matching app
  package, a positive version code, HTTPS repository URL, APK size and SHA-256.
  Android's installer checks the APK signature during installation.

### Publish future APK updates

The stable feed is
`https://raw.githubusercontent.com/defiventurers/articweb3/arctic-play-releases/releases/latest.json`.
Download files live alongside it as `ArcticPlay-vX.Y.Z.apk` on the separate
`arctic-play-releases` branch. It does not require a game-server deployment.

1. Increase `release-config.json`, `package.json`, Android manifest and Gradle
   versions together. Increase versionCode for every APK update.
2. Build, test and sign with the original private signing key. Verify certificate
   continuity against the previous public APK. Keep signing material private.
3. Write release notes as a JSON array, then generate the feed with:

```bash
python3 mobile/arctic-play/scripts/prepare-update.py \
  --build-info /absolute/path/to/release/build-info.json \
  --notes /absolute/path/to/release/release-notes.json \
  --output /absolute/path/to/release/latest.json
```

4. Publish the APK and `releases/latest.json` in one commit on the release branch,
   preserving older APKs. Verify that the public feed and APK return successfully
   and that the downloaded bytes match the feed's checksum before announcing it.

For a presentation-only rebuild, `npm run build --prefix mobile/arctic-play --
--reuse-artwork /absolute/path/to/prior/art` reuses the previous APK's unmodified
`assets/art` tree, including all seven cards and board manifests. A normal build
continues to produce artwork from the canonical source assets.

## What's improved in 1.3

- Arctic Dominion joins the collection: the original 8 × 8 four-kingdom game,
  two dice, automatic Guard promotion and royal King elimination, adapted from
  `server/gameRules.js` without changing its rules. Each online roll is generated
  inside the server worker; the client sends only an allowed action ID.
- A new piece-led card features Green Frost King, Blue Aurora Unicorn, Red War
  Mammoth and Pink Icebreaker. Four-player filtering, seat avatars, a dice tray,
  die-choice controls, rules, guided learning and offline bots are included.
- Existing two- and three-player games, profiles and room seats retain the same
  online protocol and storage namespace.

### Appearance and learning retained from 1.2

- Dark mode is the default across Games, Home, Friends, Chats, Profile, private
  tables, matches and dialogs. Native startup and system bars use the same dark
  navy. Profile's **Dark mode** switch saves a light appearance when preferred.
- Six new covers feature the actual important pieces at a readable scale: King
  and Rook for Shogi; three Kings for Sannin; General/Chariot/Horse for Sanguo;
  General/Fire/Flag for San You; yellow Han Emperor and blue unicorn Horse for
  Yan Yi; and General/walrus Cannon for Xiangqi.
- The original artwork guides the characters, faction colors, props and token
  shapes. `art/cards/` holds the optimized images, reference manifest and exact
  prompt set. Earlier canonical board previews remain in quick starts.
- VersionCode is 4; the package, storage namespace, original signing key and
  online ruleset protocol are retained.

## Learning and friend-room improvements

- Six distinct Arctic cover scenes are paired with thumbnails rendered from the
  actual starting positions. Board shapes and all existing pieces stay accurate.
- Every game has a three-step quick start and an offline first-move guide using
  the real legal-move engine. The full English rules remain available.
- Gold rings show the last accepted move. Undo and restart clear those rings.
- Guests enter the board automatically when their host starts. A saved table
  can be resumed directly from Games using its existing seat credentials.
- Join accepts codes, deep links, web links and a complete shared invitation.
- Board zoom reaches 400%, board tap areas are larger, and essential controls
  have comfortable touch targets. Navigation text cannot be accidentally selected.

The Android app and its separate server rule bundle add the new table. Existing
website frontend files, original rule authorities and legacy events are unchanged. The package and storage namespace also
stay the same. Updates must use the original signing key.
See `art/cards/README.md` for the piece-led covers and `art/covers/README.md`
for the earlier decorative scenery and canonical board previews.

## Phone controls

Tap a piece, then a highlighted destination. Orange rings mark captures; blue
dots mark empty destinations. Every legal destination also has a text button
below the board. Pinch or use **+ / − / Fit** to zoom; drag a zoomed board to pan.
Use **Quick start & first move** from a game card to learn the first interaction.
Gold rings show the source and destination of the most recent accepted move.
Shogi hands have drop buttons; legal promotions, Sannin castling and illumination
have explicit controls. Inherited armies keep their original art and show an
owner ring. The yellow Han sprites stay yellow after takeover.

The match menu has English rules, offline undo/restart, invitations and explicit
leave controls. Backing out keeps an online seat reserved; leaving a live match
resigns in Shogi/Xiangqi/Sanguo/Yan Yi, or hands a Sannin/San You/Arctic Dominion seat to a bot.
Keep the app's data on the same phone to reclaim a saved online seat.

Friends is a local list of names for invitations. Chats contains private room
conversations. It does not claim contact discovery, global messaging or a
friend-presence service. Bots are casual one-ply practice opponents.

## Build from the repository

```bash
npm ci --prefix frontend
npm install --prefix server --ignore-scripts --package-lock=false
npm run build --prefix mobile/arctic-play
npm test --prefix mobile/arctic-play
node --test server/tests/arctic-play-online.test.js
```

Use JDK 17, Android SDK Platform 35 and Build Tools 35.0.0. Build a signed APK:

```bash
python mobile/arctic-play/scripts/build-apk.py \
  --sdk /absolute/path/to/android-sdk \
  --jdk /absolute/path/to/jdk-17 \
  --output /absolute/path/to/private-artifacts \
  --keystore /absolute/path/to/ArcticPlay-release.jks \
  --password-file /absolute/path/to/signing-password.txt
```

For a first build, omit both signing arguments to create a signing key under the
output directory. Keep that private key and password: future updates must use
the same key and a higher versionCode. Never commit the signing directory.

The native Android project in `android/` also opens in Android Studio. Build web
assets first. Its conventional Gradle build uses AGP 8.9.2 / Gradle 8.11.1 / JDK 17.
The Python build uses official `aapt2`, `javac`, `D8`, `zipalign` and `apksigner`
directly and avoids extra Android runtime dependencies.

## Backend integration

The existing backend gains `arcticPlayService.js`, its generated shared engine,
two isolated rule workers and a small bootstrap injection. Deploying the normal
backend entry point enables:

- `wss://articweb3.onrender.com` with `ap_room_create/join/get/ready/start`,
  `ap_game_action`, `ap_room_chat`, `ap_room_leave` and `ap_room_detach`.
- `https://articweb3.onrender.com/arctic-play/health` listing the seven games.
- `https://articweb3.onrender.com/arctic-play/join?room=CODE` invitation landing.

Moves use authenticated seats, the expected board revision and a server-generated
legal action ID. Clients cannot replace game state. Tokens are random 256-bit
secrets; persistence stores only their SHA-256 hashes. Room responses exclude
secrets. Chat is limited to 500 characters and the latest 100 messages. Persistent
rooms use the backend's existing PostgreSQL room store when configured.

The Android app requests only INTERNET. Local HTML, scripts, rules and artwork
load from a controlled HTTPS asset origin. File/content access and mixed content
are disabled. External web pages open outside the bridge-enabled WebView. APK
sharing grants a temporary read-only ContentProvider stream, requiring no storage
permission. No signing material belongs in the public repository or shareable APK.

## Verification and limits

Tests cover all seven rule adapters and boards, legal moves for every seat, captured
Shogi drops, Yan Yi captures for every faction and inherited Han, room ownership,
turn/revision validation, authenticated chat, reconnect, bot fills and phone UI
controls. Android tooling verifies the package and its APK v2/v3 signature.
Real-device installation, soft-keyboard rendering and pinch gestures still need
an Android phone check; no Android device/emulator is available in this workspace.


## Version 4.5.0: personal board views

Every seat in all seven games starts with its army at the bottom of the display.
Online matches use the authenticated player's seat; bot practice uses the chosen
human seat. Shared-phone games follow the active seat and reset zoom and pan on
handoff. The view is a presentation transform only: cell IDs and legal action IDs
are identical across clients. Board art, pieces, highlights and tap targets share
one camera. Shogi wedges follow their army's direction; round tokens remain upright.
Lessons continue to use their authored Red-at-bottom teaching view.

See `docs/board-perspectives.md` for the seven board mappings and verification.
The browser route also serves the existing SVG cutout pieces with their image MIME type.
The signed APK and browser bundle are built locally. Publishing the browser files,
APK and update feed remains a separate deployment step.

Validation:

```bash
node mobile/arctic-play/scripts/build-web.mjs --reuse-artwork recovery/baseline-art
cd mobile/arctic-play
node --test --test-concurrency=2 tests/*.test.mjs
BROWSER_PATH=/path/to/chrome-headless-shell node tests/board-view-browser.mjs
```


## Version 4.6.0: iPhone invitations and Safari room play

In a private room, tap **Invite iPhone / browser player** to share a direct HTTPS
browser game link. The guest opens it in Safari, enters a name, taps **Join table**,
and uses the same room, board, turns and chat as the Android players. No APK or
account is required for browser guests. The regular invitation page also puts
**Play in browser** before the Android app link.

Saved Safari invitations rejoin the same authenticated seat automatically on
reload. Page restoration, longer backgrounding and network recovery refresh the
connection without replaying a pending game action. A stale socket cannot clear
requests on a newer connection. Room credentials remain in site data and never
appear in shared links.

The existing two-/three-/four-player rules and all seven game views are unchanged.
The browser game needs an internet connection. Keep the browser's site data to
retain its saved seat. Clearing site data removes the local seat credentials.

The source and signed APK are built locally. Publish the included browser bundle
and server changes to the existing service before inviting public Safari guests.
Do not publish a new update feed before the signed APK and matching service are
available. No live deployment is claimed by this archive.

See `docs/safari-room-play.md` and `verification/release-4.6` for test evidence.
