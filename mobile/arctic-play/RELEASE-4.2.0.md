# Antarctic Kingdoms 4.2.0 — Hosts, history and required updates

The game cards now match the intended player hosts. Sannin Shogi, Sanguo Qi and San You Qi have three hosts, with Polly removed. Sanguo Yan Yi Qi has a slightly larger yellow penguin Emperor Han in an imperial robe and headdress. Xiangqi has two hosts and a rotated table: Red and its army on the left, Blue and its army on the right. Shogi and the four-kingdom scene retain their approved artwork.

The four-kingdom game is named **Chaturanga** throughout the mobile interface, invitations, rules and current build metadata. Its stable `dominion` identifier keeps saved games, team mode and room compatibility. Its chosen dice and royal-elimination rules remain the same modern edition.

All seven cards show an English name or meaning in parentheses and a researched date line directly beneath it. Hall and heritage details include the literal-name explanation, distinctions between historical evidence and invention, and source links. See `GAME_NAMES_AND_HISTORY.md` and `src/gameHistory.js`.

## Update and theme controls

The top-right controls open App updates and switch Night mode. They are available in the main lobby, waiting rooms and matches; the required-update screen keeps them accessible while scrolling. The former Join shortcut is now a visible button above the game filters; App information is in Profile.

Native Android builds check the trusted update feed at launch, on focus/resume, when connectivity returns and every five minutes while visible. A valid higher version code requires an update. The app replaces its playable interface with a non-dismissible **Update to continue** screen. Back, Escape, tapping outside or starting a download cannot dismiss it. The highest verified release is retained across offline relaunches; stale or lower-version responses cannot remove the requirement. The original Android package and signer preserve saved data during installation.

If the app has never learned of a required newer version and the feed is unreachable, existing offline practice remains available. A known requirement remains enforced offline. Browser users receive a Refresh game control instead of an APK download requirement.

**Enforcement begins with this build.** Previously installed APKs cannot acquire new enforcement logic until their users install 4.2.0. Future updates are detected after their signed APK and valid `latest.json` are published to the existing release channel. The proposed metadata in the source archive is prepared for review; no remote publishing or update-feed write was performed in this task.

## Artwork and rebuild

`art/tables-3d-v2` contains seven masters, optimized WebP assets, hashes and the final prompt set. Five scenes were edited separately with the built-in image-generation tool; two approved scenes were retained. Runtime files use a new versioned path so old card images are not reused from cache. Only optimized WebP files are packaged in the APK and matching browser bundle.

Use the pinned `build-deps` installation, then from the repository root:

```sh
node mobile/arctic-play/scripts/prepare-table-art.mjs
node mobile/arctic-play/scripts/build-web.mjs --reuse-artwork /absolute/path/to/recovery/baseline-art
npm test --prefix mobile/arctic-play
```

Use `scripts/build-apk.py` with the original private signing key as described in `RELEASE-4.0.0.md`. Version: 4.2.0 / code 42; package: `xyz.arcticdominion.play`. Signing material is excluded from deliverables.

## Validation

The 92 mobile gameplay/interface/update tests pass. Required-update tests cover download handling, stale feeds, offline persistence, Back/Escape, actual native version changes and theme persistence. Real-browser reports, package preservation checks and signing/alignment results are in `verification/release-4.2`. Browser checks use desktop Chromium and emulated phone viewports; no physical Android or iPhone installation was performed.
