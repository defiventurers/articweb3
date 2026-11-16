# Early website security review — 16 November 2026

Reviewed baseline: `main` at `596f6f6b37ceec48d6a84a8409dfedd256630949`.
Scope: `https://antarcticgaming.co/early/`, its Para sign-in portal, the shared account/Passport APIs and their live deployment configuration. This is a source review and tested hardening release, not a penetration-test certificate or a promise of invulnerability.

## Outcome and acceptance criteria

| Requested area | Result and evidence |
| --- | --- |
| Authentication | Retain verified Para/Google signatures, wallet binding, PKCE and single-use expiring handoffs. Reduce sessions from 90 days to seven days, with 24-hour inactivity expiry. Migrate existing sessions to the shorter cap on first use. Salted scrypt hashes protect new email codes; ten-minute expiry and five attempts remain enforced. Recovery/session tokens are random 256-bit values stored as hashes. No local passwords or password-reset flow exist; verification and recovery for Para methods belong to Para. |
| Ownership / IDOR | Private Passport, progress, account, purchase and match-proof data are derived from authenticated account ownership. Account deletion additionally requires a live session and that same account's recovery code. Regression tests deny another account's deletion and access by substituted identifiers. Public NFT metadata, anonymous totals, deliberate challenge links and opt-in proof shares remain public. |
| Secrets | Scan 1,656 current tracked text files and 3,424 distinct historical text blobs. No high-confidence live credentials were found by the scan rules. The historical database-password match is the local CI PostgreSQL fixture. A repeatable redacting scanner and security CI now guard tracked text. Public Para client keys, network/contract addresses and public frontend configuration are intentionally public; server credentials remain environment-only. Binary artifacts, unknown credential formats and files larger than 5 MB are outside the scanner's coverage. |
| Input | Reject oversized bodies/URLs, compressed API bodies, non-JSON bodies, overly deep/wide structures, invalid types and prototype-pollution keys. Preserve parameterized SQL and existing route-specific wallet, proof, consent and edition validation. WebSocket payloads receive the structural validation too. Static file paths remain confined to public roots. No user file-upload or AI-generation endpoint is implemented in this launch. |
| Abuse | Apply independent IP and credential budgets, tighter sign-in/recovery/registration/expensive-action limits, Retry-After responses, bounded limiter maps and JWKS-refresh cooldowns. A fabricated bearer no longer substitutes for an IP budget. Cross-site socket upgrades are rejected; connection counts and payloads are bounded. Trust only Render-appended forwarding information in Render; ignore supplied forwarding headers elsewhere. |
| Deployment / logging | Enforce certificate validation on all database pools with a shared configuration that cannot be weakened by URL sslmode flags. Add HSTS, response CSP for /early, anti-framing, MIME protection, no-referrer and bounded HTTP timeouts. Stop accepting operator secrets in query strings; use Authorization headers. Public diagnostics omit raw database/RPC errors. Structured authentication/error/denial logs omit bodies, tokens, emails, raw IPs and query strings. |

The backend entry point is `server/scripts/start-with-runtime-status.js`, preloaded by `allGamesBackendBootstrap.js`. The existing prize/multigame source transformations were traced before adding shared HTTP ingress and WebSocket guards. Game geometry, catalogue IDs, rule sources, contracts, launch allocation and approved artwork are unchanged. The generated Sanguo server bundle is regenerated for the patched compiler; its 178 rules tests and socket integration pass.

## Local verification

- 57 server security/authentication/ownership tests pass, including Para, legacy Google wallet, expiry, recovery, email verification, cross-account denial, rate-limit bypass, SQL connection configuration and public diagnostics.
- 14 frontend entry/Passport checks pass.
- Three real socket integration tests pass for Sanguo, Shogi and Xiangqi: create, invite, play, reconnect and bot actions.
- Broader launch suite: 53 pass; three PostgreSQL integration checks require the CI-provided test database and are skipped locally.
- The updated Vite frontend and Para wallet portal both build successfully. Generated unrelated engine artifacts from the frontend build were restored. The Sanguo compiler output is refreshed because CI compares it byte for byte with the patched build tool output; its 178 rules tests pass. No game rule source or approved /early game bundle changes.
- Backend production dependency audit: zero reported vulnerabilities. Backend direct dependencies are pinned to the reviewed lockfile versions.
- Frontend and wallet dependency updates apply compatible fixes, including patched build tools, Axios and ws 8.x. The generated portal is built from reviewed sources by server installation and is excluded from Git.

## Live firewall configuration

Vercel project `articweb3`: an active, validated deny rule blocks environment files, Git internals, private-key file types and source maps. Readback confirms firewall enabled. Safe HEAD checks verified `/early/` = 200 and `/early/.env`, `/.git/config`, `/early/passport-launch.js.map` = 403. Existing platform DDoS protection remains enabled. The Render service has one instance; rate limits are currently per process and reset on restart. A shared limiter is required before adding instances.

## Remaining issues and limits

1. **Database network isolation is not configured.** The identified Neon project is on Free and has no IP allowlist. Neon requires Scale for IP Allow. Render and Neon do not share a private network. Blocking public connections now would disconnect the application; no paid upgrade or breaking network change was made. Once a paid plan is approved, allow only the service's confirmed outbound ranges (and explicitly approved maintenance access) before applying the rule. Database passwords and verified TLS remain required now.
2. **Upstream browser-wallet advisories remain.** The post-update production audit reports 31 affected dependency nodes in the frontend and 51 in the wallet portal. These are dependency-tree counts, not that many distinct exploits. The two remaining high-severity advisory families concern `decode-uri-component` and `zod` resource exhaustion. Older connector branches also retain low/moderate advisories in `uuid`, `elliptic`, `bn.js` and build tooling. Forcing new major versions or downgrading Para/wagmi solely to clear audit output can break identity/wallet behavior and is not treated as a safe fix. A separately tested SDK/connector migration is still required. No claim is made that these advisories establish exploitability of the current login flow or that they can be ignored.
3. **Operational response still matters.** New structured logs make denials, failures and unusual bursts visible in Render. External alert delivery, a response owner, penetration testing and independent wallet-provider account controls have not been configured by this change. Rate limits and edge mitigation cannot prevent all distributed attacks or scraping of intentionally public information.
4. **No personal wallet acceptance was performed.** Automated tests use fixtures. The actual user's Para session and NFT receipts are not accessed or simulated as live evidence.

## References checked

- Render environment-variable and private-network documentation: https://render.com/docs/configure-environment-variables and https://render.com/docs/private-network
- Render client-IP and abuse guidance: https://render.com/articles/how-render-handles-ddos-attacks
- node-postgres TLS configuration: https://node-postgres.com/features/ssl
- Neon IP Allow availability and scope: https://neon.com/docs/introduction/ip-allow
- Vercel firewall rule configuration: https://vercel.com/docs/vercel-firewall/vercel-waf/rule-configuration
- Remaining high-severity upstream advisories: https://github.com/advisories/GHSA-qr28-fpjm-wq7f and https://github.com/advisories/GHSA-mrhx-c7xc-m3w5

## CI review

The dedicated security regression/secret-scan/backend-audit job, Passport first-33 PostgreSQL/contract checks, frontend builds, backend checks and browser smoke job passed on the candidate. Broader mobile launch checks still contain two **reproduced baseline failures**: the Chaturanga test expects an older board-art filename, and the heritage-story test requires historicalNote properties missing from the baseline JSON. Both failures reproduce with baseline test/story sources from `596f6f6b`, and mobile sources are unchanged by this release. They are not silently waived as successful tests or repaired by altering approved artwork or inventing history. They remain a separate mobile-release maintenance issue.
