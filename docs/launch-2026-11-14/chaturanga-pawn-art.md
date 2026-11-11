# Chaturanga final-four spear-pawn review candidate

## Scope and identity

The owner chose the final four supplied references. Existing later `launch-v1/chaturanga-pieces` Pawn drafts were visually compared with those references: red Rocco, blue Piko, green Ziggy and pink Nova retain the recognizable faces, crests and team palettes. Only those four existing sprite files are selected; there was no image regeneration, recolouring, background removal or image edit.

They are **costume review candidates**, not newly APPROVED production art. Each character holds a shield and a spear extended outward from the body. The green blade appearance and gold trim are artistic choices, not archaeological claims. All four poses face upper-right in their source images. As in v5.9.15, illustrated characters stay upright when the board camera rotates: the spear does not indicate a legal move direction. No piece rotation or movement geometry is changed.

The new runtime paths are:

- `art/chaturanga-final-four/pawns/red.webp`
- `art/chaturanga-final-four/pawns/blue.webp`
- `art/chaturanga-final-four/pawns/green.webp`
- `art/chaturanga-final-four/pawns/pink.webp`

Original Pawn files remain untouched at `art/dominion/*-snow-guard.webp`; all other roles and games retain their paths. The internal Yellow seat continues to map to pink artwork. Source provenance, exact existing Git blob IDs and SHA-256 values are in `frontend/public/assets/chaturanga-final-four/pawns/provenance.json`.

## Guarded runtime integration

Run **after** the heritage and fairness app transformations:

```sh
node mobile/arctic-play/scripts/patch-chaturanga-pawns-v5915.mjs \
  --input-app /path/to/heritage-and-fairness/app.js \
  --input-learn /path/to/verified-v5.9.15/learn.js \
  --output /path/to/pawn-overlay
```

Overlay only `app.js`, `learn.js` and the four additive images. Keep `chaturanga-pawns-patch.json` as evidence, outside runtime. The patch changes exactly two pure sprite-path arrows in the app (board pieces and dice/guide presentation) and one pure sprite-path arrow in the learning worker (practice inventory). It checks the complete baseline learning-worker hash, exact AST anchors, successful parse and reverse-transform equality for every untouched byte. Changed/double-applied input fails closed.

`src/dominion.js` contains the equivalent pure `pieceArt` presentation change for future source builds. Creation, legal actions, capture, dice, promotion, turns, piece IDs, labels and geometry are unchanged. No bot or fairness engine bundle is regenerated. The separate existing fairness HOLD remains in force.

## Checks

`AK_BASELINE_RUNTIME=../baseline-runtime node --test mobile/arctic-play/tests/chaturanga-pawn-presentation.test.mjs`: **4 passed, 0 failed, 0 skipped**.

- All recognized Pawn colors select four new paths; unknown inputs and every other role retain legacy paths.
- All four images decode as 320×320 RGBA. Significant-alpha bounds remain inside every edge: no alpha16-or-higher pixel touches the border. Faint existing generated transparency/glow is preserved. This is a clipping/footprint check, not a physical-device visual approval.
- Reversing the two app arrow edits recovers the complete original input byte-for-byte; mutated/double-applied mappings are rejected.
- Real baseline versus patched learning workers produce identical states, legal actions, guided studies, practice placement and movement across all seven legacy games after normalizing only the four allowed Chaturanga Pawn sprite URLs. Exactly sixteen Chaturanga starting Pawns use those four new URLs; other games and roles retain identical images.

## Historical limits

The period-inspired spear direction follows the prior research record: the ASI museum catalogue hosted by IGNCA describes a Gupta-period warrior torso carrying a long spear, catalogue3364. The NMMA record for SS-AAC-UP-1373371 is explicitly uncertain, describing a broken Gupta-attributed iron spearhead **or knife**. These sources support a broad Gupta-era spear motif; they do not establish an exact sixth–seventh-century blade, uniform, green material, or the four-player app rules in 574CE.

- https://ignca.gov.in/Asi_data/7116.pdf
- https://nmma.nic.in/nmma/antiqDetail.do?mat=39&refId=1373371

During this continuation the IGNCA PDF URL resolved but its text layer was unreadable through the research tool; the NMMA detail retrieval timed out. The specific catalogue references above preserve the earlier checked research with its limitations rather than claiming a new complete archaeological verification. Final small-screen piece/readability review remains a release gate.
