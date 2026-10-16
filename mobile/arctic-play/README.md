# Interactive companions in v2.1

Polly, Retsba, Pengu and Abster now keep you company throughout the app. Tap
a companion to visit the camp, greet each guide, share a high five, ask for
encouragement or choose a favourite. **Profile → Mascot companions** offers
Lively, Quiet, Off and gentle-motion controls. Preferences stay on this phone;
all conversations work offline and remain separate from table chat.

See [MASCOT_COMPANIONS.md](MASCOT_COMPANIONS.md) for the accepted direction,
interaction behaviour and verification criteria. The full How to Play section
is a later task; existing guides, rules and game modes remain available.

# Antarctic Kingdoms for Android

A separate, signed Android app containing seven games: Shogi, Sannin Shogi,
Sanguo Qi, San You Qi, Sanguo Yan Yi Qi, Xiangqi and Arctic Dominion (Chaturanga). Antarctic Kingdoms is the separate Android app by Antarctic Gaming Co.:
**Timeless games. A new world.** The Frozen Archive, original penguin guides,
dark navy identity and learning journal surround the games. Game art and
canonical rule engines come from Heritage Arcade. See BRAND_DIRECTION.md for
the accepted direction, edition labels and continuity requirements.

The existing Arctic Dominion website's frontend files and rule engines are not
modified. Android rooms use a separate `ap_` protocol and `arctic-play` room type.
The backend validates moves in worker threads, keeping its main event loop free
for the existing website rooms.

## Install and play

1. Download `AntarcticKingdoms-v2.1.0.apk` onto an Android phone and open it. Install it
   over an earlier version to keep your profile, favorites, practice games and saved seats.
2. If Android asks, allow the app that opened the APK to install from that source.
3. Open Antarctic Kingdoms and choose your name/avatar in Profile.
4. In Games, choose a game and tap **Play with friends**.
5. Share the invitation or the six-character room code. Friends tap **Join room**
   and enter the code or paste the full invitation message/link.
6. Everyone taps **I'm ready**. The host starts the table. Empty seats can be
   filled with casual bots. Arctic Dominion supports four players.

The APK itself can be shared from **Profile → Share the Android app** through
Android's share sheet. There are no accounts, wallets, entry fees or purchases.
Online play needs internet; practice and pass-the-phone games work offline.
Android 7.0/API 24 or newer with an up-to-date Android System WebView is required.

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
