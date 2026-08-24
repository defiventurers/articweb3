# Security Hardening Report

**Assessment revision:** `6002e6c` baseline with local remediation changes

## Scope and safety boundary

This review covered repository-contained source, lockfiles, deployment configuration, local builds, and automated tests. Dynamic testing was restricted to local synthetic test flows. No production account testing, high-volume probing, destructive requests, secret extraction, or user-data access was performed.

## Remediated controls

| Control | Change applied | Verification evidence |
|---|---|---|
| Wallet authentication | Profile creation now uses a short-lived server challenge and a wallet signature verified server-side before the socket is bound to an address. This prevents a client from claiming an arbitrary address merely by submitting it in a payload. | Transformed-server syntax check and hardening tests passed. |
| Rate limiting | WebSocket actions use configurable, bounded limits with separate per-IP and per-account buckets. Authentication and room creation receive stricter independent limits. | Regression assertions confirm the configurable limits and both bucket classes are active. |
| Input validation | The WebSocket server rejects oversized messages, malformed envelopes, invalid request types/identifiers, non-plain payloads, and excessively large payload objects before dispatch. Profile names and wallet addresses receive stricter server-side validation. | Regression assertions confirm message size and envelope checks; game service regression suite passed. |
| Error leakage | Raw storage, provider, and settlement errors are logged server-side while client responses use stable generic messages. | Regression assertions cover generic profile errors; transformed-server syntax check passed. |
| Dependency vulnerabilities | Direct dependencies were pinned to validated versions. Targeted overrides update `axios` and `ws`; `viem` was updated to `2.55.19`. | Production dependency audit reduced from **36 findings, including 11 high**, to **13 findings with 0 high and 0 critical**. |
| Browser hardening | Production deployment now sets `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, cross-origin opener policy compatible with wallet popups, and cross-origin resource policy. The development route and calibration query are restricted to local development builds. | Frontend production build and browser smoke suite passed. |
| File uploads | No browser file input, `FileReader`, `FormData`, multipart, or upload implementation exists in the reviewed application surface. | Static source search found no upload implementation requiring storage or execution controls. |

## Validation record

| Check | Result |
|---|---|
| Frontend production build | Passed: `npm run build:testnet` |
| Browser closed-beta suite | Passed: **22/22** serial Playwright cases across desktop and mobile |
| Full online-game/server suite | Passed: **143/143** tests |
| Focused server hardening suite | Passed: **2/2** files |
| Transformed backend syntax compilation | Passed |
| Production dependency audit | **0 critical**, **0 high**, 11 moderate, 2 low |

## Residual risks and required operating controls

The remaining package advisories are moderate or low transitive findings in wallet-provider and connector dependency chains. They have no high-severity path after the targeted upgrades. Maintain the exact lockfile, monitor upstream releases, and revisit them during the next dependency maintenance window rather than using unsafe forced major upgrades.

> Environment artifacts are intentionally not read or copied by this review. The repository contains tracked environment-specific files and the root ignore policy applies only to untracked future files. Any real signer, database, API, or token value must be removed from version control, rotated if it has ever been committed, and configured only in the hosting provider’s secret manager. This operational remediation cannot be safely automated without secure access to the deployment secret configuration.

>The signature flow must be exercised manually with a real supported wallet after deployment. Automated browser tests intentionally use synthetic local profiles and do not sign real wallet challenges.

> The application currently has no upload surface. If uploads are added later, the implementation must validate content signatures and size server-side, use isolated non-executable object storage, generate server-side filenames, enforce authorization, and serve only with safe content-disposition and content-type headers.
