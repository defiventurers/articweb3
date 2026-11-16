# Early signup delivery — 16 November 2026

Reviewed main: c95a0f03724b35e83caae52a38f423c28c9d7751.

## Accepted behavior

The signup page explains the Para wallet, automatic Passport NFT and shared first-33 Egg promotion before consent. Verified Para login carries page consent through the server-side PKCE ticket and queues delivery using only the server-bound Robinhood testnet wallet. Existing sessions complete consent once on the signup page. Passport contains status, artwork and verified explorer receipts, with no separate registration action.

Allocation reuses existing durable Passport registration and advisory locks: repeat login, worker retries and concurrent signup cannot create duplicate editions or expand the 33-slot campaign. A queue failure preserves login and retries on the next Passport read. Confirmation remains distinct from registration.

## Narrow launch gate

AK_EARLY_AUTO_ENROLL_ENABLED=true allows this consented flow, own receipt acceptance and aggregate early statistics while the shared AK_LAUNCH_RESET_PAUSED hold remains in place. Other paused mutations remain unavailable. AK_GOLDEN_EGG_PROMOTION_ENABLED must be true; existing delivery configuration and signer remain unchanged.

## Dashboard coverage

/early/dashboard/ counts unique verified Para accounts with server-recorded antarcticgaming.co/early enrollment. Repeat logins count once. Historical accounts have no reliable source attribution and are excluded until they complete this signup; a separate aggregate describes that gap. No account list, email, bearer credential or private wallet information is exposed. Egg slots are shared across launch channels, not restarted for this page.

## Acceptance and validation

Local authentication, consent, origin, queue retry, launch-hold isolation and frontend regression checks pass. PostgreSQL CI exercises 40 concurrent auto-signups against the 33-slot cap and verifies scoped aggregate SQL. Playwright checks confirmed and pending Passport views at 320×640, 360×740, 393×852 and desktop, plus dashboard refresh/error behavior. Production configuration and live deployment are verified separately; simulated users must not consume real campaign slots.
