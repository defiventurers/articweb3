# Phase 6: v5.10.2 website

Status: local package prepared; public launch and end-to-end acceptance pending.

## Decisions

- Website runtime: exact signed v5.10.2 APK, SHA-256 `275cf9bf69aadfa4f4d844ff412e0885d8a5a656539f4bb583af27bfc95e8ecd`, layered over verified v5.9.15, SHA-256 `27ab56bc1c8f2575f6d6ea0573432ac354102283e725d5bb33d1ed37b3cc2488`.
- Preserve v5.9.15 loading files, icon, original artwork and game modes. Do not use v5.10.3 or later APK assets.
- Target URL: `https://arcticdominion.xyz/early/`. The generated output uses relative manifest, service worker scope and asset paths. The host chooses the directory; the URL can be changed by hosting the same output at another path. A change of path creates a different PWA scope, so retest authentication redirects and installation before migration.
- Do not alter the root site or production API until existing domain routing and backend compatibility are established.

## Build

Install the checked-in build dependencies in `mobile/arctic-play/build-deps` using `npm ci`, then run `bash mobile/arctic-play/scripts/build-phase6-early.sh BASELINE_APK SIGNED_5102_APK OUTPUT`. The output includes a browser download page that assembles and checks the exact signed v5.10.2 APK. APK files, signing keys and generated output are not committed to source.

## Evidence and pending checks

- Two independent builds generated identical build ID `5.10.2-d8a2966e6c7ec98c` and the expected APK hash. The protected startup and theme files and original artwork match the verified baseline. Seven PWA tests and six APK download tests pass locally.
- Hosting provider for the domain and production path-routing access are not established. The connected Render service runs the backend; that alone does not establish who serves the apex domain.
- Not yet deployed to `/early/`. Confirm the actual route, MIME types, HTTPS, no-cache/no-store response headers and asset hashes on the final host. Keep service worker and manifest scoped to the chosen directory; configure a redirect from the slashless path to its trailing-slash form.
- Real Para sign-in/return URL, multiplayer, PWA installation, Android APK download/install and mobile/desktop visual QA remain unverified. No claim of launch readiness or live onchain verification is made.
