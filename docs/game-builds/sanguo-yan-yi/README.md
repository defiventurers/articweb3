# Sanguo Yan Yi Qi - tutorial Free Play edition

Playable route: https://arcticdominion.xyz/?game=heritage-arcade&table=sanguo

This is the modern cross-board Yan Yi variant from the supplied 36:52 Chinese
tutorial, not the existing three-arm historical Sanguo reconstruction.
The original table and online room protocol remain at `table=sanguo&rules=legacy`;
existing `room` links also route to that table. The new campaign supports three
local humans, two humans plus a bot, or one human plus two bots. It saves locally.

## Deliverables

- `frontend/public/assets/heritage-arcade/sanguo-yan-yi/pieces/`: 25 individually
  generated, transparent 512x512 WebP sprites: seven roles in each of three colors
  and four yellow/gold Han designs matching the supplied piece sheet.
- `pieces/manifest.json`: English display names, roles, physical counts, final
  filenames, generation mode and every final prompt.
- `yan-yi-arctic-board.webp`: supplied board artwork. English UI overlays cover
  its decorative Han inscriptions. Exact rules use integer coordinates, never pixels.
- `Sanguo-Yan-Yi-Qi-Final-English-Rules.pdf`: illustrated rulebook, edition
  comparisons, source notes, extra information and the complete English transcript.
- `Sanguo-Yan-Yi-Qi-Free-Play-English.srt`: 588 timed, non-overlapping UTF-8 cues.
  Timeline starts at zero; final cue ends at 00:36:48,760. Five unclear fragments
  are retained explicitly rather than guessed.

## Names and counts

| Role | Arctic name | Copies in each army | Files |
|---|---|---:|---|
| King | Frost King | 1 | blue-king, green-king, red-king |
| Advisor | Shield Guard | 2 | blue-advisor, green-advisor, red-advisor |
| Elephant | Royal Mammoth | 2 | blue-elephant, green-elephant, red-elephant |
| Horse | Ice Unicorn | 2 | blue-horse, green-horse, red-horse |
| Chariot | War Chariot | 2 | blue-chariot, green-chariot, red-chariot |
| Cannon | Frost Cannon | 2 | blue-cannon, green-cannon, red-cannon |
| Soldier | Penguin Spearman | 5 | blue-soldier, green-soldier, red-soldier |

Every filename has the `.webp` extension. The 21 player-army assets represent 48
starting player pieces. Three Han Chariots, one Han Cannon and one Han Emperor
bring the physical starting total to 53. Four Han artwork files replace the gold
letter markers, with the two outer Chariots sharing one design:

| Role | English artwork name | Physical copies | Filename | Permanent piece IDs |
|---|---|---:|---|---|
| Emperor | Han Golden Emperor | 1 | han-emperor.webp | han-emperor |
| Chariot | Han Imperial Chariot | 2 | han-chariot-imperial.webp | han-chariot-6, han-chariot-10 |
| Chariot | Han Vanguard Chariot | 1 | han-chariot-vanguard.webp | han-chariot-8 |
| Cannon | Han Golden Cannon | 1 | han-cannon.webp | han-cannon |

All three Han Chariots use the same movement rules. These four assets were created
using the built-in `image_gen` tool in `stylized-concept` mode, with the supplied
blue/green/red piece sheet as the style reference. Final prompts and mappings are
in `pieces/manifest.json`. Source alpha is preserved during conversion to WebP.
The board, inspector and downloadable gallery all use the same named images.
Artwork follows Han origin and permanent ID, so it stays yellow after a move,
activation or inheritance. Controller rings and labels still identify its owner.

## Rules and edition boundaries

Default: Wu -> Wei -> Shu; 225 points on a 17x17 cross. Horses have no blocked
leg, Elephants no blocked eye, and Wei/Shu Kings may face. Single check responds
immediately, then resumes from the replying seat; simultaneous checks use normal
order. Horse-triggered alliance/regicide activates Han once. Allies cannot capture,
check or expose allied Kings. Immediate checkmate transfers the surviving army to
the direct checker, with the mover preferred when it also checks. Inherited
Advisors transfer one at a time to empty legal palace points; inherited Elephants
use controlled home networks. Soldiers use their controller's boundary.
Resigned armies remain inactive, capturable obstacles and Cannon screens.

The speaker's early-conquest Han balance proposal is an off-by-default option.
The video stops opening Cannons at the defensive line. The later written article
has different rules for facing Kings, the opening boundary, ally exposure, defence
transfers, the Emperor's post-alliance point, resignation and stalemate; the PDF
records these rather than claiming they are the tutorial rules.

Disclosed digital conventions: warn after six or nine repeated previous-seat
checking positions; another unchanged repetition forfeits, while distinct checking
positions and captures reset the counter. Mate takes priority. An unchecked seat
with no legal move passes, following the original patent's convention because the
video does not adjudicate stalemate. Agreement requires all surviving human seats.
Only home-defence roles, or no legal continuation for any survivor, produces an
automatic draw. No threefold or 120-quiet-move rule is imported.

The supplied current piece sheet takes precedence for the custom campaign art.
The historical role is always shown beside its Arctic name. The other Heritage
tables and their existing host designs are unaffected.

## Implementation and checks

`sanguoYanYiRules.ts` is separate from the legacy engine; its worker does tactical
legal-move selection. `sanguoYanYiPresentation.ts` calibrates the supplied artwork
without changing geometry. `SanguoYanYiGame.tsx` handles saved campaigns, English
rules, 25-design downloads, ownership labels, zoom, journal, resignation and draw.

From `frontend/`:

```sh
npm ci
npm run test:sanguo
npm run test:xiangqi
npm run test:sanyou
npm run check:sanguo-engine
npm run build:mainnet
```

The test suite covers rules, image-target captures for each faction, Han activation,
Han artwork downloads, all five Han tokens and saved ownership for all three teams.
Browser layout QA was unavailable in this managed container; no browser preview was substituted.
The rulebook was rendered and every page checked, with all 588 timed intervals
and all 21 filenames verified after PDF compression.

## Rebuild the rulebook

Requires Python, ReportLab, Pillow, DejaVu fonts and optional Ghostscript.
From the repository root:

```sh
python docs/game-builds/sanguo-yan-yi/build-rulebook.py --output /tmp/yan-yi-raw.pdf
gs -sDEVICE=pdfwrite -dCompatibilityLevel=1.7 -dPDFSETTINGS=/printer -dDownsampleColorImages=true -dColorImageResolution=300 -dDownsampleGrayImages=true -dGrayImageResolution=300 -dDetectDuplicateImages=true -dNOPAUSE -dBATCH -dQUIET -sOutputFile=frontend/public/assets/heritage-arcade/sanguo-yan-yi/Sanguo-Yan-Yi-Qi-Final-English-Rules.pdf /tmp/yan-yi-raw.pdf
```

## Sources

- User-supplied `Free Play Method` tutorial audio and preserved English SRT.
- https://www.bilibili.com/opus/380944400655958160 (2020 written tutorial,
  subsequently edited in 2021; disagreements and additional modes are explicit).
- https://patents.google.com/patent/CN2870925Y/zh (original 2007 publication).
- https://www.wxf-xiangqi.org/images/xiangqi-intro/xiangqi-introduction-for-wxf.pdf
- Existing repository Xiangqi, Sanguo Qi and San You Qi engines for role naming,
  capture validation and interface patterns; their board topologies are not reused.

The existing GitHub-to-Vercel production pipeline deploys `main`. No contract,
settlement, wallet, backend room protocol or secret changes are required.
