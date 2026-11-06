# Lantern Harbor onboarding · 5.9.3

Render Free web services sleep after 15 minutes without inbound HTTP or WebSocket traffic. Render documents wake-up as about one minute, not a fixed duration or SLA: https://render.com/docs/free#spinning-down-on-idle (verified 6 November 2026). A paid service compute plan removes this idle spin-down. No hosting plan or billing setting was changed here.

## Behavior and acceptance criteria

- Local bundled voyage artwork appears while the account API becomes ready. Account requests await a shared, bounded GET-only readiness check before their existing timeout starts. This prevents the previous 20-second auth-start deadline from including the entire cold start.
- Probe `/arctic-play/v3/capabilities`, reject HTML interstitials and incomplete JSON, and accept only the existing v2 cloud/account-play readiness fields. The poll budget is 120 seconds; each GET has at most a 10-second request timeout and polls are separated by 2.5 seconds. Readiness is reused for 30 seconds. These are app limits, not predictions of Render wake time.
- One sign-in tap can wait and continue once the API is ready. Credential POSTs are never automatically replayed. Cancellation invalidates intent before asynchronous PKCE work can initiate a later sign-in. Offline and unavailable-account-service states get a retry route. Actual provider errors remain visible.
- No artificial countdown, fictitious progress percentage or compulsory story delay. Elapsed time is actual observed time for the current connection check. Reduced motion disables spinner animation.
- Nova is the foreground arrivals hostess. The Aurora dock, friends at the distant arch, open/stamping passport and ten reusable artworks from the supplied v2 ZIP are packaged alongside one new voyage background. All pre-existing artwork, game workers and native DEX remain unchanged.
- Recovery keeps the real form, server validation and existing owner-code behavior. Login remains required for online gameplay and existing signed offline-access policy remains authoritative.
- Restore current game/discovery Home rather than replacing it with illustrative HTML mockup actions. Hosted provider options remain server-controlled. No fake chooser, native Google integration, minted-NFT claim or prototype game action is introduced.

## Build and source boundary

Reviewed main: `be6d1cbfe124105dae2a53c3d2fda9542f8cb797`. Based on install-layout fix `980a8cb152b2165a891f0dc4b10b629aec46c74c` (PR 65, not merged at review). Version 5.9.3/code 91.

`scripts/build-harbor-update.py` requires the exact verified 5.9.2 baseline SHA-256 `543fcbeb7c6ed86af2c9342ffa6794ebdb5f504280f233aabd1e014363b20975`. It recompiles the readiness module and landing component, then uses checked single-match anchors for cloud preflight, intent cancellation, mounting the component with its own hook lifetime, and recovery artwork. The baseline's game/discovery runtime is preserved because public source still predates the shipped 5.9.0 discovery UI. A normal full app rebuild is still blocked on complete source restoration.

The backend route is already implemented in `companyService.js`, mounted through `arcticPlayService` and `arcticPlayBackendBootstrap` under `allGamesBackendBootstrap`. No backend bootstrap anchors or server behavior changed; no server deployment is required for this client readiness check. The existing browser-owned Android Custom Tab and PKCE callback remain intact.

Build with Java 21, Android platform 35/Build Tools 35, Node and esbuild:

```sh
python mobile/arctic-play/scripts/build-harbor-update.py \
  --baseline /private/AntarcticKingdoms-v5.9.2.apk \
  --sdk /tools/android-sdk --esbuild /tools/node_modules/esbuild \
  --keystore /private/release.jks --password-file /private/password.txt \
  --output /output
```

Signing secrets are not part of the source or deliverables. Android still confirms installation; the package and original certificate remain the same. `resources.arsc` is uncompressed and aligned, preserving the corrected install layout.

## Evidence and limits

- 50 focused tests passed across readiness, cancellation, DOM onboarding, recovery, passport, preload, startup, update handling, progression and offline license verification; five APK-layout regression checks passed. Tests simulate server wake-up and provider callbacks, not live Google login.
- APK v2/v3 signatures, certificate continuity, resource-table layout, ZIP integrity, all preload byte counts and byte equality of existing artwork/workers/native DEX are checked by the builder.
- Four actual rendered DOM states were inspected with a static HTML renderer. Chromium could not start in the execution environment; this is not Android WebView, responsive browser or physical-device verification.
- Render service discovery confirms `articweb3`, free compute, Singapore, on main. The latest reported live deployment is main at `be6d1cb`. Direct capability probes from the execution environment timed out, so there is no verified exact live cold-start timing or live sign-in result. Do not attribute every failure to sleep: database, provider configuration, network and deployment problems need their own error handling.
- Source is prepared on a feature branch for review. Do not equate this APK build with production multiplayer or launch readiness. Main-branch publication and public update feed are separate release steps.

## Accepted decisions

Player-facing onboarding uses Antarctic Passport and Nova. The other three characters retain their source identities. Waiting uses local art and real readiness; access and chain authority do not change. Use the latest supplied furry renders for this onboarding; retain existing heritage assets and modes.
