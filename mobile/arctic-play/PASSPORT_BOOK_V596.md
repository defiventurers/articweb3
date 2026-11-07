# Antarctic Passport — v5.9.6

## Outcome and acceptance

A closed navy passport carries the gold mountain-and-star company emblem and the words Antarctic Gaming Co. Its cover contains no lantern. Tap Open or drag left; the front and inside covers rotate about the spine. Page turns rotate a separate two-sided leaf showing the actual printed content. Close reverses the cover motion.

Opening settles in 900 ms, page turns in 720 ms. Drag tracks the pointer and commits at 35% travel. Reduced-motion changes are immediate. Button, swipe, arrow-key, Escape and native Back controls remain available. Closed pages are hidden and inert.

Each founding-hall stamp contains its game name, distinct lantern motif, origin/period, and original earned date and local time zone. Dates use existing `learnedAt` records; opening never grants progress or rewrites a date. Blank slots are visibly unearned. The special Crown follows the seventh existing learning milestone and uses the latest of those seven earned dates. These are client learning records, not independent server or onchain attestations.

## Historical badges

| Game | Badge | Printed period |
| --- | --- | --- |
| Xiangqi | China origin seal | 10th–13th c. |
| Shogi | Japan origin seal | 15th–16th c. form |
| Sannin Shogi | Hinomaru symbol | c. 1930 |
| Sanguo Qi | China origin seal | Date disputed |
| San You Qi | China origin seal | 17th–18th c. |
| Sanguo Yan Yi Qi | PRC flag symbol | 2005 edition |
| Chaturanga | Indian roots origin seal | Modern adaptation |

A flag is a simplified national symbol used during that selected edition's period, not a facsimile of a particular physical flag. Origin seals are explicitly not historical flags. The game's theme does not establish its invention date. Inherited dating and uncertainty remain in `src/gameHistory.js`; this task does not newly verify every inherited attribution.

Primary checks for the badge choices:

- [Japan Shogi Association history](https://www.shogi.or.jp/history/story/) distinguishes early evidence and the later modern form.
- [Library of Congress, National Flags, October 1963, Japan section](https://tile.loc.gov/storage-services/service/ll/llglrdppub/2019670175/2019670175.pdf) records Hinomaru regulations in 1870 and 1873, supporting its twentieth-century use, not a medieval shogi flag.
- [Chinese Embassy, National Flag](https://in.china-embassy.gov.cn/eng/zggk/201010/t20101021_2234769.htm) dates adoption of the five-star flag to September 1949.
- [CN2870925Y design record](https://patents.google.com/patent/CN2870925Y/zh) records the Sanguo Yan Yi Qi filing in August 2005. The stamp says edition, not ancient invention.

## Assets and source boundary

Runtime art: `frontend/public/assets/passport-book-v2`. Names and dates are native accessible text. The downloadable pack includes seven named game stamps plus a Crown template in SVG/PNG, the gold cover, optimized runtime art and implementation source. Template dates are explicitly marked placeholders; the app uses each player's real milestone instant.

The new DRAFT cover was made with built-in image generation, using the existing company logo and navy cover as references. Prompt: remove the lantern; engrave the mountain/star company emblem in gold; preserve navy leather and gold border; exact lettering ANTARCTIC / GAMING CO. / PASSPORT; transparent exterior; no lantern or crown. Character artwork was not changed. New artwork is not labelled APPROVED.

Reviewed main: `5bb2c978fbdc96474b2788af56f56d4b35eb35c4`. Implementation base: `d76a5da7a9049b673874c05b5f4322977f8cbe7f`, draft `feature/passport-chats-v595`.

The SHA-pinned builder uses v5.9.5 APK `8ebcf3fb14b6c5bb59a926fc4f571f364a54a7f133f3dc3256cfe364a83e14d3`, recompiles only its Passport module, appends presentation styles, adds eight images and updates metadata to v5.9.6/code 94. The public whole-App source predates shipped discovery/Shop presentation; a normal full rebuild would lose that newer UI. Reconciliation remains a separate task.

The build verifies the original certificate, v2/v3 signatures, alignment, ZIP integrity, resource storage, preload sizes, all 390 old art files, eight other JS/workers and identical native DEX. Home, Chats, game rules, IDs, saved boards, room handlers and account authority remain intact.

Validation: 63 focused Node checks, five APK layout tests, 48 Passport and 12 Home browser layout cases, normal and reduced-motion controls, original timestamps/Crown, and a real qualifying Xiangqi lesson. Browser account API and Android bridge use local fixtures; real bundled game workers are exercised. The fixture waits for board art and selected-piece state before sending its next input.

Physical Android installation/WebView, live authentication and live multiplayer remain unverified. No main merge, production deployment or public update-feed promotion is included.
