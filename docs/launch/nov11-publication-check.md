# November 11 publication check

The resumed release was already merged through PR #77 at main commit
`880ab5e6ad0f8527f8418088cbc18c08ef1e8508`. The release branch's `latest.json`
advertises version 5.10.0 / code 104, and its publicly downloaded APK was checked
against the saved release bytes on November 11, 2026.

| Item | Verified state |
| --- | --- |
| APK | 57,557,582 bytes; SHA-256 `62686ae9800ce2154c1c08e21f796914a77e09a3d8d218e7a44e1b0762c0a387` |
| Play Store bundle | 57,556,786 bytes; SHA-256 `91eaae9298b7e972e332ae3c09e0e582907d9c65a2cf289918ab02110dfea6ed`; saved, not submitted |
| Final references | 1.jpg = Ziggy, 2.jpg = Piko, 3.jpg = Nova, 4.jpg = Rocco; all four packaged host WebPs match the APK entries byte for byte |
| Browser app | Live app-version.json returns 5.10.0 / 104; health reports merged source commit and long-dice, proof, story and dashboard capabilities |
| Para | Public config reports BETA, Robinhood Chain Testnet 46630; production project setup remains outstanding |
| Passport delivery | Registration is available; NFT delivery is disabled and confirmed mint count is zero at inspection |
| Fresh start | No deletion was executed; the scoped reset remains date-gated for November 14 IST |

## Startup conflict

Render's first deploy of the merged release became live. A subsequent deploy
of the same source failed on `Unsupported embedded wallet environment` in the
legacy Google wallet adapter. That adapter read `AK_VISA_CHAIN_ID`, rejected
Robinhood's 46630, and aborted startup even though Google embedded wallets were
disabled. The previous live instance continued serving the app.

The adapter now validates its supported environment only when explicitly
enabled. The regression starts the real company service with a Robinhood
passport setting, checks that Para remains available, verifies that disabled
Google wallet login returns 503, and retains rejection for an explicitly
enabled unsupported Google wallet configuration. The Google wallet suite is
included in the required launch checks. No provider keys, wallet identity,
chain selection, game rules or Android release bytes are changed by this fix.

Deployment of the startup fix must be observed separately before it is called
live. Physical Android installation, Play Console submission, production Para
credentials and funded testnet contract deployment remain unverified.
