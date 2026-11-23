# v5.11.0: approved v5.10.2 reissue

Decision: retain the exact approved v5.10.2 APK as the product baseline. Do not rebuild from the later application source. Only Android/app version and public-art cache metadata change. Version 5.11.0, code 110, package xyz.arcticdominion.play. Original release certificate is required; signing keys remain outside Git and deliverables.

Baseline SHA-256: 275cf9bf69aadfa4f4d844ff412e0885d8a5a656539f4bb583af27bfc95e8ecd.

Reviewed main: 191d816a5abb1bdd1357cdd57d4a05dfb8747b6c. Live backend before repair: f1270cdb539ad7135dd1b2242a8e95995b19d768. Its launch hold returns LAUNCH_RESET_PAUSED for /capabilities, so the APK readiness controller never reaches Para sign-in. The same hold also blocks authenticated play access, preferences and progress after sign-in.

Repair: allow the exact methods and routes required for APK readiness, authenticated access, progress and optional communication preferences during the hold. Existing authentication, ownership, rate limits and PKCE checks still apply. Keep the hold enabled; ordinary NFT registration, checkout and unrelated writes remain blocked. The existing explicitly enabled early-signup path is unchanged. No wallet migration, data reset, new chain deployment, fee activation or public update-feed change.

Acceptance: signed reissue verifies with original certificate; native version is 5.11.0/code110; assets, native code, rules and appearance match the approved baseline; APK login can reach the current service. Automated local account/authentication/security suites: 43 pass, zero failures. This includes Android PKCE callback, account access lease, progress, opt-out, logout revocation and hold enforcement. Native signature v2/v3, ZIP CRC, stored resources, zipalign and package/version checks pass. 439 of 444 payload entries are identical; app.js changes only its version literal. Physical Android update, saved-data retention and real Para authentication remain owner/device acceptance checks.

Reproduce with Android Build Tools 35 and the private original signing inputs:

```sh
python3 mobile/arctic-play/scripts/build-v5110-reissue.py \
  --baseline /path/AntarcticKingdoms-v5.10.2.apk \
  --sdk /path/android-build-tools \
  --output /path/output \
  --keystore /private/ArcticPlay-release.jks \
  --password-file /private/signing-password.txt
```

The later general release-config and source app are intentionally not used by this reissue builder. Do not run the general rebuild to reproduce this APK.
