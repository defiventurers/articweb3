# Arrival flow — 16 November 2026

Source reviewed: main `479dbbe803d9fd143c87ae9a4ecd3a29360c6714`.

Accepted flow: loading → explicit Para sign-in → existing Home screen after server-verified Para wallet identity. A saved session is checked with the backend before Home is shown. A failed/expired session stays at the arrival gate with sign-in or retry; network failures have bounded retries. Existing age attestation is retained before opening Para. Signing out returns to the arrival gate.

The new `antarcticgaming.co` and `www` origins are recognised in CORS, the Para attempt return address and the wallet portal's return allowlist. Existing Arctic Dominion and Android destinations remain supported.

The registration hold now permits only the explicit Para authentication routes, authenticated Passport profile read and logout, plus existing public metadata/status reads. Passport registration (`POST /passport`), legacy account creation and unrelated writes remain paused. This enables the user's requested sign-in flow without opening the first-33 NFT registration. No NFT is minted by logging in or viewing Home. Contracts, minter, metadata and assets are not replaced.

Validation: 8 frontend arrival/heritage checks and 23 backend Passport/Para/pause checks passed. New-domain Para authentication and PKCE exchange are exercised against local signed attestations, including profile read with the NFT registration hold still enforced. Production credential-based login still needs the user to complete Para sign-in. CI includes the arrival tests.
