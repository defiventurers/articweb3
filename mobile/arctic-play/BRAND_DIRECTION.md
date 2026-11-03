# Antarctic Kingdoms · accepted direction

Accepted by the user on 16 October 2026: rebrand the separate Android app in the
direction proposed in the conversation and generate its app icon.

- App: **Antarctic Kingdoms**.
- Umbrella brand: **Antarctic Gaming Co.**
- Tagline: **Timeless games. A new world.**
- Story: the Frozen Archive is a fictional Antarctic meeting place for the
  world's games. It does not claim that these games originated in Antarctica,
  were all lost, or are all ancient.
- Preserve Shogi, Sannin Shogi, Sanguo Qi, San You Qi, Sanguo Yan Yi Qi, Xiangqi
  and Arctic Dominion as distinct games. Keep their pieces, board topology,
  rules, online IDs and chosen editions.
- Polly welcomes and guides practice; Retsba guides tactics; Pengu guides rules
  and routes; Abster guides patterns and puzzles. Hosts surround the game and
  never replace source-native playing pieces.
- Retain the dark default and saved light preference. Use navy, icy blue and
  white for the brand, with the original clan colours as secondary accents.
- Introduce a Discover tab, edition/origin labels, a four-guide introduction
  and a local Archive journal. A journal entry requires an accepted guided
  piece move; merely opening a guide or rolling dice cannot complete one.
  No game is locked behind journal progress.

## Release and continuity

Version 2.0.0 / Android versionCode 6. The source base is the v1.4.0 app branch
`codex/arctic-play-v1.1-covers` at
`70eb7a6304905cb6a5f5c0627043b41e5b198ba7` (PR #49). Main was inspected at
`3fa3455be2b38c310b2a85da579248f6c085403f`; it contains the separate room-service
addition. This rebrand does not require a website or game-server deployment.

Keep `xyz.arcticdominion.play`, the original signing certificate, the local
storage namespace, existing room credentials and the `arctic-play-1.0.0`
multiplayer protocol. Accept both `arcticplay://room/CODE` and
`antarctickingdoms://room/CODE`. Existing HTTPS invitations continue to work.

The public update feed retains its existing URL and `ArcticPlay-v2.0.0.apk`
download name so the strict v1.4 client can discover the rebrand. That file is
byte-identical to the user-facing `AntarcticKingdoms-v2.0.0.apk`. Android's share
sheet exposes the actual installed version under the new filename.

The brand names are proposed product names. This work does not establish
trademark, company-registration, domain or social-handle availability.

## Acceptance criteria

1. Launcher, in-app brand, sharing, About and Updates display the new identity.
2. All seven existing games remain playable with the same rules and artwork.
3. Origin/edition text distinguishes living traditions, historical variants and
   the modern Chaturanga-inspired game. The fictional setting is explicit.
4. A guided move updates the local journal without replacing the user's profile,
   favourites, saved theme or existing room credentials.
5. Existing mobile and private-room checks pass; the new discovery journey is
   exercised; phone layouts are visually checked in portrait and landscape.
6. The signed APK keeps the previous package/certificate, increases versionCode,
   passes Android signature/alignment checks and contains the verified assets.
7. Publish the APK and matching feed together; verify the public APK checksum.

Physical Android installation, system launcher masking, native sharing and the
browser-to-installer handoff still require a real phone. Automated browser
checks do not verify those Android interactions.
