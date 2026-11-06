# Passport entry update · 5.9.1

Reviewed repository: `main` at `d83f6d4de2c12955c96c8a807d3af02a5cce8819`.

## Outcome and acceptance criteria

- A bounded, light icy entry page with the supplied logo and welcoming Polly, real accessible sign-in/recovery buttons, visible errors and actual background-loading status.
- Android opens the existing allowlisted portal using a browser-owned Custom Tab attached to the app task, retaining the PKCE ticket callback. No embedded OAuth WebView and no automatic full-browser fallback when a Custom Tabs provider is missing.
- Hosted modal opens automatically, uses matching presentation overrides and attempts automatic app return after verification; manual return remains available where browsers require a gesture.
- Only build-hashed public SDK bundles become immutable-cacheable. JavaScript/CSS/WASM are gzip-compressed at build time and served with Accept-Encoding negotiation, cutting the current 82 public build files from 6,455,841 to 1,903,255 bytes. Auth HTML, attempts, identity data, APIs and errors remain uncached. Existing dashboard login-method/security settings remain authoritative.
- Existing game engines, workers, modes and shipped art remain preserved.

## Important source boundary

Public main predates the delivered v5.9.0 discovery UI. A normal rebuild from this checkout would regress that release. `scripts/build-entry-update.py` therefore verifies the exact v5.9.0 APK SHA-256 `3a8454da624118eba8605a42e9341095e260b5a251b0bf4df20f8599d6462d36`, compiles the pure `VisaLandingView` and native shell, and replaces only the entry render in that pinned bundle. All original account/passport hooks and game/discovery code outside that render are retained. The builder rejects another baseline. Restore the complete v5.9.0 source before returning to ordinary full application builds.

The seven pre-existing Java classes are recompiled with the new Custom Tabs helper. Original Android resources/launcher art retain their resource IDs. Signing requires the owner's existing keystore; no credentials belong in source.

```sh
python3 mobile/arctic-play/scripts/build-entry-update.py \
  --baseline /path/to/AntarcticKingdoms-v5.9.0.apk \
  --sdk /path/to/android-sdk \
  --esbuild /path/to/node_modules/esbuild \
  --keystore /private/path/release.jks \
  --password-file /private/path/password.txt \
  --output /path/to/output
```

Requires Java 21 (including the compiler module), Android platform/build tools 35, Node and esbuild. SDK directory must contain `android.jar`, `aapt2`, `d8.jar`, `zipalign` and `apksigner`. The keystore alias remains `arctic-play`.

## Verification

The signed release passed APK v2/v3 signature and ZIP alignment checks; its certificate matches v5.9.0. All 364 pre-existing art files and all pre-existing game workers remain byte-identical. Three additive landing WebPs total 479,474 bytes. Java compilation and JavaScript syntax checks passed.

After extracting the resulting APK's `assets/` into the ignored Android assets directory and installing the existing mobile build dependencies and server dependencies, run:

```sh
node --test server/tests/para-game-wallet.test.js server/tests/wallet-public-cache.test.js \
  mobile/arctic-play/tests/visa-entry.test.mjs mobile/arctic-play/tests/visa-welcome.test.mjs \
  mobile/arctic-play/tests/asset-warmup.test.mjs
```

The wallet portal builds with its pinned dependency lockfile (`npm ci` and `npm run build` in `server/wallet-build`). The bootstrap path is `allGamesBackendBootstrap` → `arcticPlayBackendBootstrap` → `arcticPlayService` → `gameWalletWeb`; no source-transform anchors, game authority or chain deployment configuration change here.

## Accepted decisions and limits

- Latest user-supplied furry mascot/logo references govern this additive landing artwork; older flat-host directions are historical for this screen. Approved existing art is preserved.
- Polly welcomes; the full existing catalogue/discovery UI remains intact.
- Custom Tabs are a secure browser surface, not fully native Para authentication. Para social OAuth can still use provider-owned windows. Physical Android/Google authentication and measured end-to-end timings remain unverified.
- No chain switch, mainnet activation, paid-plan change, mandatory update or production Para-key change is included. Para's Beta notice remains truthful.
- The server's free hosting plan can cold-start. Caching reduces repeat public SDK downloads; it cannot guarantee instant first login.
