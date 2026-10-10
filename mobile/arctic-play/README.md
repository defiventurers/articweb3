# Arctic Play for Android

A separate, signed Android app containing exactly six games: Shogi, Sannin Shogi,
Sanguo Qi, San You Qi, Sanguo Yan Yi Qi and Xiangqi. The light lobby, game cards,
blue filters, five bottom tabs and dark board/chat screens follow the supplied
Plato reference. Game art and canonical rule engines come from Heritage Arcade.

The existing Arctic Dominion website's frontend files and rule engines are not
modified. Android rooms use a separate `ap_` protocol and `arctic-play` room type.
The backend validates moves in worker threads, keeping its main event loop free
for the existing website rooms.

## Install and play

1. Download `ArcticPlay-v1.0.0.apk` onto an Android phone and open it.
2. If Android asks, allow the app that opened the APK to install from that source.
3. Open Arctic Play and choose your name/avatar in Profile.
4. In Games, choose a game and tap **Play with friends**.
5. Share the invitation or the six-character room code. Friends tap **Join room**.
6. Everyone taps **I'm ready**. The host starts the table. A third seat can be
   filled with a casual bot when only two friends are available.

The APK itself can be shared from **Profile → Share the Android app** through
Android's share sheet. There are no accounts, wallets, entry fees or purchases.
Online play needs internet; practice and pass-the-phone games work offline.
Android 7.0/API 24 or newer with an up-to-date Android System WebView is required.

## Phone controls

Tap a piece, then a highlighted destination. Orange rings mark captures; blue
dots mark empty destinations. Every legal destination also has a text button
below the board. Pinch or use **+ / − / Fit** to zoom; drag a zoomed board to pan.
Shogi hands have drop buttons; legal promotions, Sannin castling and illumination
have explicit controls. Inherited armies keep their original art and show an
owner ring. The yellow Han sprites stay yellow after takeover.

The match menu has English rules, offline undo/restart, invitations and explicit
leave controls. Backing out keeps an online seat reserved; leaving a live match
resigns in Shogi/Xiangqi/Sanguo/Yan Yi, or hands a Sannin/San You seat to a bot.
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
- `https://articweb3.onrender.com/arctic-play/health` listing the six games.
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

Tests cover all six rule adapters and boards, legal moves for every seat, captured
Shogi drops, Yan Yi captures for every faction and inherited Han, room ownership,
turn/revision validation, authenticated chat, reconnect, bot fills and phone UI
controls. Android tooling verifies the package and its APK v2/v3 signature.
Real-device installation, soft-keyboard rendering and pinch gestures still need
an Android phone check; no Android device/emulator is available in this workspace.
