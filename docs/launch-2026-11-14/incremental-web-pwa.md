# Incremental web/PWA candidate

Reviewed source baseline: `7c0cdd74f2bb4e75bf2ff38021f287273f314503`. The starting APK is exactly SHA-256 `27ab56bc1c8f2575f6d6ea0573432ac354102283e725d5bb33d1ed37b3cc2488`, v5.9.15/code 103. The shipped bundle contains presentation layers missing from a clean source build, so this path preserves the shipped runtime instead of replacing it with an older full App build.

## Build and integration

```sh
node mobile/arctic-play/scripts/build-incremental-web.mjs \
  --baseline-apk /absolute/path/AntarcticKingdoms-v5.9.15.apk \
  --runtime-dir /absolute/path/approved-runtime-overlay \
  --output /absolute/path/new-web-output \
  --version 5.10.2 --version-code 106
node --test mobile/arctic-play/tests/incremental-pwa.test.mjs
```

`--runtime-dir` is optional. It may contain baseline public runtime files and additive artwork, including the separately tested heritage `app.js` patch and appended `app.css`. It may not contain source files, logs, secret configuration, hidden entries or symlinks. The output must be empty or an output previously created by this builder; arbitrary directories are never removed. Installation and startup assets are taken from the APK, not from v5.10.0.

The builder preserves the baseline `startup.js` and `theme-init.js` byte for byte and checks the baseline index before adding browser-only installation/session scripts and a stylesheet. It preserves all 17 baseline capability declarations and adds new declarations without replacing the list. All original public resources remain packaged. A baseline-only build retained 420 files, all original artwork exactly, and all games/workers; only the release configuration, public cache/manifest metadata and additive HTML links changed. The resulting `web-build-info.json` reports the exact changed original paths and hashes the source APK. It is a local candidate, not proof of publication or live gameplay.

The baseline compiled required-update hook already uses the real Android bridge to decide whether a mandatory APK update applies. Its exact guard is asserted. Browser builds neither create a fake Android bridge nor bypass account, online-access, Offline Access Pass or legal-move checks.

## Player behavior

After the existing loading screen reaches ready state, a small install control attaches to the existing lobby header or the initial Lantern Harbor sign-in landing. On that landing it is positioned in the corner without adding a layout row or changing the sign-in content. It is absent from game boards and the native Android app. The install dialog offers the browser's own install prompt when available, iPhone/iPad Safari instructions when relevant, and accurate menu guidance otherwise. It supports keyboard close/focus handling and reduced motion. It does not add a first-run overlay or a new landing screen.

An optional `--apk-url https://…/actual.apk` adds an Android download link. Leave it absent until the exact version, signature, downloadable bytes, update-feed behavior and installation path have been checked. The builder validates URL form, not remote APK identity. No unsigned candidate or rejected-release feed is advertised by default.

## Cache and update behavior

The existing bundle already registers `game-assets-sw.js` at the app scope. This build keeps that filename so two competing workers are not introduced. It embeds SHA-256 digests for the exact public files in this release, precaches a verified shell, and rejects the entire installation if even one file changed during deployment. Public artwork is cached lazily with the same byte verification. Only explicit same-origin file URLs are handled. Account requests, API calls, OAuth routes, POST requests, unknown files, private query strings and range requests pass through normally.

There is no `skipWaiting` or `clients.claim` call: an open game retains its current release. When a new release waits, the install dialog explains that the player should save, close all game tabs/app windows and reopen. Cache cleanup is limited to this builder's cache family and exact app scope. A user's browser can evict storage; offline availability is not a guarantee of indefinite storage or a bypass of the existing account access policy.

Publish the directory atomically over HTTPS, retaining the generated `_headers` policies or host-equivalent `no-cache` for mutable release files and `no-store` for the service-worker script. The host must serve JS/CSS/images with their correct MIME types; API fallback HTML will fail the digest checks. The worker sends same-origin credentials only when fetching an explicitly whitelisted, digest-verified static file, allowing an owner-private preview host's access cookie to work. Redirects are rejected and account/API routes remain outside the cache. Sign-in on a new preview origin still requires that origin to be supported by the existing authentication configuration; private-preview QA does not establish public installation readiness.

## Verification and limits

Seven targeted tests pass: coherent offline shell/navigation with same-origin static credentials; rejection of mixed releases; no private/API caching; corrupt public-art rejection; scoped cleanup without interrupting games; optional browser installation controls preserving startup/native UI; and installation discoverability on the initial sign-in landing. The actual baseline-only build succeeds and reports exact protected-file/art preservation. These are Node/DOM/cache integration checks, not a real phone or browser-engine PWA install, rendered mobile comparison, Para sign-in, live multiplayer or production deployment. Those acceptance gates remain explicit.


## Anonymous launch-session wiring

`launch-visit.js` connects the browser to the separate `/arctic-play/v3/launch/visit` endpoint. After the existing startup panel becomes ready, it sends one POST per page with only `{sessionId}`. The secure random UUID stays in `sessionStorage`, not account storage, and is reused on reload. No permanent counted flag prevents a later UTC day or launch cohort from reaching server-side deduplication. This measures best-effort ready browser sessions, not people, page views or installed wallets.

The request omits credentials and referrer, rejects redirects, has an eight-second timeout and never blocks or modifies the game. Native Android, insecure contexts, missing secure entropy and unavailable session storage skip counting. User names, account IDs, room/invitation URLs, cookies, email and wallet data are not included. The backend stores a daily/cohort hash rather than the raw UUID; this does not independently remove bots or test traffic.

The default endpoint is the existing Render app URL. `--metrics-endpoint` accepts a credential-free HTTPS URL without query/fragment when deliberately configuring another backend. Its origin must also be permitted by CSP and backend CORS. The source endpoint alone or browser wiring alone does not prove working live analytics: until the matching backend and allowed origin are deployed, requests may return 404/CORS errors and counts remain unverified. API requests are outside the service-worker static whitelist.

Verification: four focused session tests plus seven existing PWA/cache/install tests pass. They cover one request after readiness, payload minimization, reload identity, unsupported contexts, invalid endpoints and nonblocking failure handling.
