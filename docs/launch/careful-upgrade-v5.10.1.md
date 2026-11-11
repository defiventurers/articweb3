# Antarctic Kingdoms v5.10.1 — careful restoration and launch status

Reviewed `main` at `0a7d45cefe8568bd1c66a9281fcd04ec28e1fa12`. Working branch: `codex/careful-launch-v511`. Accepted visual/runtime reference: supplied v5.9.15 APK, SHA256 `27ab56bc1c8f2575f6d6ea0573432ac354102283e725d5bb33d1ed37b3cc2488`. v5.10.0 was explicitly rejected by the user.

## Outcome and acceptance

Deliver an update-compatible, original-certificate APK restoring the accepted icon, Home composition and Home / Games / Shop / Chats / Passport navigation, with the nine-game launch additions reviewed separately. Preserve saved boards, unlock authority, local/bot/practice/private rooms, tutorials and legal engines. Version 5.10.1 / code 105 installs as an update over code 104; this is a restoration through a higher Android version, not a package downgrade.

The regression originated in a clean source build whose shell was older than the patched shipped APK. The Home and launcher images are restored from the accepted baseline. Its complete stylesheet is retained as editable source in `approved-shell.css`, pending a separate style extraction. A launcher SHA inventory now stops the Android builder if its approved PNG files change. Future artwork generation cannot silently overwrite the launcher.

## Checklist accounting

| Request | Current implementation / evidence | Remaining acceptance |
|---|---|---|
| Chaturanga cultural board, better pieces and four spear pawn teams | Existing Indian ice-court adaptation and final-reference spear miniatures retained; paired long-dice flow tested | Physical phone review of the new piece art; period-inspired costumes are not a historical reconstruction |
| Largest tile opens interesting introduction | Nine three-screen stories, sources, explicit adaptations, skip/proceed and motion pause; all nine routes/assets exercised | Cinematic animation is illustrated piece movement, not nine rendered battle videos; historical character costume scenes remain further art work |
| Cultural halls and community | Four country/cultural groups, single-game discovery cards, real server occupancy | No simulated crowds or invented player counts |
| Four mascots | Nova: welcome/practice; Rocco: tactics; Piko: rules/Fair Play; Ziggy: puzzles/reflection | Roles for blue/green are implementation choices for review; final supplied identities remain governing |
| Website version and install/APK access | Same source compiled to Android, backend browser route and `/play/`; web install support; download waits for validated release metadata and excludes rejected v5.10.0 | New website candidate is packaged, not deployed in this task; existing custom-domain routing needs release verification |
| Fairness and blockchain | Existing signed replay, drand verification, long-dice rounds, receipts, chain adapters and contracts checked | Live funded Robinhood signer, contracts, receipts and end-to-end wallet mint are not supplied by a local build; no active onchain claim |
| ERC-721 passport, mutable metadata and achievements | Existing idempotent passport-first mint queue, metadata and achievement contracts locally tested | Live minting still needs deployment and configured worker; mainnet is a separate deployment/claim migration |
| Growth dashboard | Public aggregate visits/accounts/passports; owner UI removed from public view and placed on explicit `?view=launch-operations` | Public totals are service counts; confirmed mints require actual receipts. Visits are sessions, not unique people |
| Instagram | Existing final-reference posters and scripts retained; accurate launch-status copy supplied below | No posting performed; no claim of guaranteed reach or unsupported brain benefits |
| Play Store | Official process reviewed; API 36 signed APK and AAB build | Console account, DUNS where required, testing, declaration and review remain external gates |
| Fresh start on November 14 | Existing scoped preview/backup/reset script retained, no deletion run | Exact database access/scope and launch-date cutoff; onchain tokens and Para wallets cannot be erased by a Render reset |
| One umbrella app and shorter name | Direction recorded; keep current identity while naming is undecided | Candidate names require availability checks before adoption; no forced new startup flow in this restoration |
| Portrait cover | New final-reference nine-game world artwork; optional Home story → See the Kingdom | Cover is concept art, not an exact board diagram. Entry-point overhaul remains a separate decision |
| Nine physical editions | Shop restored with nine honest previews and local saved interests; nine geometry-derived locator CAD files/starting-piece inventories | These are engineering jigs, not finished boards or character sculpts. Existing printable original sculpts were not resolved in the searched sources |

## Launch copy

Use before web readiness is verified:

> Lantern Harbor is preparing to open on the web on November 14. Your journey begins with an Antarctic Passport, nine remarkable strategy games, and four guides ready to welcome you. We are completing the Android release and the required Google Play steps alongside it. We will share each download as it becomes available.

Use only after the web and Android release are verified:

> The Kingdom is open. Enter Lantern Harbor in your browser, add the web app to your home screen, or download the Android APK from our website. Google Play availability will be announced separately. Come collect your Antarctic Passport and find your first table.

Do not attribute a delay to Google review unless Console shows an actual submitted review. Do not say passports are minted until receipts confirm that.

## Short-name exploration

Unvetted creative candidates: **Nivo, Floe, Aurio, Fjor, Tavi, Snowli**. No domain, app-store, company or trademark availability is claimed. Antarctic Gaming Co. remains the company identity; Antarctic Kingdoms remains the current game world. A name decision must precede a new launcher/store identity.

## Verification boundaries

Local checks cover gameplay, startup, updates, recovery, nine introductions, shop saves, public/owner dashboard separation, independent proof tampering and contract authorization. Browser screenshot review was blocked by the preview environment; no physical Android install, live Para sign-in, live mint, Play Console submission, new site deployment or database deletion is claimed. Keep the public mandatory update feed unchanged until the candidate is reviewed on a real device.
