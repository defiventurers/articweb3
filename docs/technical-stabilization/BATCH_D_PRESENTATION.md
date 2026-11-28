# Batch D — separate review-presentation correction

Reviewed reference: `74dfcea4bb0f1ef8f09af07f20f3158187d1c8d3`. The existing
signed v5.11.1 remains the original, unchanged review artifact. This follow-up
prepares an opt-in browser candidate; it does not create, sign, publish or
physically accept a corrected APK.

## Reproduced defects

Independent inspection of the [retained-reference CI screenshots](https://github.com/defiventurers/articweb3/actions/runs/46105166782)
found two presentation defects in the existing guarded review:

1. In light mode, unselected Adventure/All Games, How to Play, Game Setup,
   filter and card controls have dark text on dark buttons. The light theme
   changes `--sb-ink` to `#14314a`, while those controls keep their dark
   backgrounds and inherit that text variable.
2. Enlarging root text to24px makes action labels and Crown copy exceed fixed
   grid-row heights. At360×800, text overlaps adjacent panels and approaches
   the bottom navigation. The existing large-text rule enables scrolling but
   retains the fixed-height Adventure rows.

The original24 browser check groups passed because they test navigation,
reachability and Home preservation. They do not establish contrast or the
absence of text overlap. The failing observations are preserved separately
from the passing original checks.

## Correction boundary

The opt-in correction lives in `mobile/arctic-play/src/storybook-accessibility-review.css`.
It is appended only to a fresh copy of the original guarded review's `app.css`.
The original `storybook-games.css`, `storybookGames.js`, patch command and
signed-APK verifier retain their exact original behavior.

- Light-theme Games controls use readable text on their existing dark panels;
  gold/selected controls and disabled states keep their explicit treatments.
- Enlarged-text Adventure content uses content-dependent heights and a contained
  scroll region, preserving actions and Crown copy at the enlarged font size.
- Home, loading, artwork, catalogue IDs, direct routes, JavaScript callbacks,
  workers, rules and saved-game behavior are unchanged.

The staging command accepts pinned complete original runtime trees, refuses
unexpected or already-corrected input, and requires a fresh disjoint destination.
Its report identifies the input variant and the only changed runtime file.
Original signed review bytes and an original guarded overlay have different
release literals; the script preserves whichever explicitly accepted input it
receives. An overlay's version label does not turn it into a signed release.

## Verification procedure

```sh
python3 -m unittest discover -s mobile/arctic-play/tests -p 'test_storybook_accessibility_review.py'
python3 mobile/arctic-play/scripts/prepare-storybook-review.py
python3 mobile/arctic-play/scripts/prepare-storybook-accessibility-review.py \
  --source storybook-review --output storybook-accessibility-review
```

CI first runs the unchanged original review checks, then runs stricter checks
against that original with `STORYBOOK_STRICT_ACCESSIBILITY=1`. The expected
failure must contain `low-control-contrast` and at least one enlarged-text
overlap/containment failure targeting the Crown panel, while all six Home comparisons still pass. A page
error or unrelated test failure cannot substitute for reproducing the defects.

The same strict mode then checks the separate corrected candidate. It must
have no strict issues, retain all navigation checks and preserve Home under the
original pixel thresholds. Original, negative and corrected screenshots/results
are saved separately. Their final run IDs and observations are recorded in the
combined Batch D evidence; no passing result is inferred from source inspection.

The affected control labels use a4.5:1 contrast target, consistent with
[W3C's ordinary-text criterion](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html).
These bounded24px-root layout checks do not establish full200% resizing or
general accessibility conformance; [text resizing](https://www.w3.org/WAI/WCAG22/Understanding/resize-text.html)
and native accessibility need their own acceptance observations.

## Release and owner boundary

The exact signed v5.11.1 does **not** contain this correction. Do not describe
browser-source verification as a corrected signed APK. Keep the original
v5.10.2 baseline and both original APKs intact.

After review of this bounded presentation change, a future corrected APK needs
its own selected release identity, controlled use of the compatible signing
material, archive/signature/payload verification and physical acceptance. This
session does not authorize that signing/publication step or use a different
mobile-source build as a substitute.

The founder's existing save remains protected. In-place upgrade testing and a
separate clean-install profile follow `BATCH_D_ACCEPTANCE.md`; native WebView,
Back, TalkBack, real Para, performance and crash behavior remain unverified
until actually observed. Keep the original v5.11.1 presentation defects on the
review record even if the separate corrected browser candidate passes.
