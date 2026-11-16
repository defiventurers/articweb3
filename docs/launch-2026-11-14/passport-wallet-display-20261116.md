# Passport wallet and collectible display — 16 November 2026

Reviewed baseline: `main` at `92ef5f46e6b5e15243a93047883dce08ad993077`.

## Outcome and accepted decisions

- Fix the blank Passport screen. A click handler was attached to every `[data-tab]`, including the outer app container. The first Passport handler changed that container's tab to `profile`; bubbling triggered its handler next and hid both views. Bind and update navigation buttons only.
- Open Passport after server-verified sign-in. Show the verified Para address, network, copy button and chain-specific wallet explorer link whether or not NFT registration is complete.
- Retain explicit free registration/consent. Show a separate Passport and Mystery Golden Egg card with allocation, queued, confirming, delayed and received states. Never infer Egg eligibility from sign-in.
- Use existing artwork. Home Passport card and header avatar open the functional Passport page.
- Provide public transaction links whenever a valid delivery hash exists. Show Received only after authenticated server acceptance matches the chain, verified Para binding, wallet, token ID and transaction hash. Pending receipt links do not imply success.
- Preserve the existing backend, contracts, wallet flow, no-purchase policy and first-33 allocation rules.

## Verification

- Reproduced baseline click bug in JSDOM: after tapping Passport, `homeHidden=true`, `passportHidden=true`, container tab `home`.
- 14 existing/extended frontend checks pass: loading and sign-in gate, ticket exchange, invalid/expired session handling, repeated Home/Passport navigation, Passport shortcut, wallet link, both confirmed receipts, pending transactions, no allocation, registration not yet complete, wrong owner/chain/token/hash and verification failure.
- JavaScript syntax and `git diff --check` pass.
- Public backend `/arctic-play/v3/passport/delivery/config` reported ready for `visa` and `egg` on chain 46630, funded/minter true, at 2026-11-16T12:23:19Z. This is service readiness, not this user's receipt.
- Explorer configuration checked against https://docs.robinhood.com/chain/connecting/ and the existing chain adapters.

## Limits

Personal wallet and mint receipt verification requires the user's authenticated browser session. Tests use explicit fixtures; no personal receipt is claimed. Local Chromium could not run in this execution environment, so mobile visual rendering was not verified locally. Frontend-only change; backend deployment and owner wallet signatures are not required.
