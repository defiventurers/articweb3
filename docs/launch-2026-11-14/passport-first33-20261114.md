# 14 November 2026 — Passport-only / first-33 launch candidate

Source baseline: main `d281c329505ad17606fff2678c195e27e8aecc18`. The isolated /early site uses the v5.10.2 image assets but replaces its web entry screen with a Passport-only microsite. No main site or native APK changes.

## Public player experience

- Home and Passport are functional tabs. Home cards and Games/Shop/Chats tabs show a Coming Soon dialog. Passport is the sole signup entry via bottom navigation.
- The Passport tab starts with a server wake/config check and redirects through official Para auth (PKCE and one-use ticket). Supported social/email/phone methods are those Para actually offers. Verified wallet address is displayed before registration and after.
- Consent and name precede registration. Registration is durable and separate from NFT delivery. The account's Passport and optional Golden Egg appear in two cards with statuses and explorer links after confirmed mint evidence. No mock NFTs or fake receipts.
- Instagram follow-up: https://www.instagram.com/antarcticgamingco/
- No claim of live provider readiness: a BETA Para account can show its real provider warning. Production requires the official PRODUCTION credentials, origin allowlisting, actual verified sign-in and explicit operator approval.
- No paid gameplay, shop purchases, reward promises or games are enabled.

## Exactly 33

- Robinhood Chain **testnet 46630 only**. `AK_GOLDEN_EGG_PROMOTION_ENABLED=true` enables eligibility for authenticated Para registrations submitted with `campaign: first33-20261114` on or after November 14, 2026 00:00 IST. Existing registrations do not retroactively take a slot.
- One global PostgreSQL transaction-scoped advisory lock allocates edition 1–33 in serial order; `UNIQUE(chain_id,egg_serial)` and the onchain ERC721 cap/unique edition enforce a hard ceiling. Passport registration and the egg queue commit together. Retrying a registration never consumes another slot. Eligible registrations 34+ get a Passport, not an egg.
- NFT delivery waits for a confirmed Passport. Egg minter role is checked independently; no configured/authorized egg contract means `awaiting_setup`, never a fictitious minted token.
- A reserved edition is a contractual fulfillment promise **not** a confirmed blockchain NFT. A receipt is confirmed only after canonical chain, claim, owner and matching Transfer event checks.
- `AntarcticMysteryEgg.sol` provides 33 ERC721 edition numbers, idempotent claims, one initial mint per wallet and Passport-first issuance. The metadata remains sealed and reveals no user identifiers.
- The contract deployer must use `node contracts/launch/deploy-eggs.mjs` for an offline plan before any explicit `--broadcast` with a private, separately funded operator key. It uses the existing Passport, never redeploys it.

## Live launch blockers / operator actions

1. Confirm Render workspace, deploy the reviewed backend branch, and verify current runtime readback and PostgreSQL migration safely.
2. Set the same `AK_VISA_CHAIN_ID=46630`, exact previously-deployed Passport address `0xF059141A4e21eF5786e66e96F1c4357858a0De11`, and the chain-scoped RPC/signer. No keys in GitHub or frontend. Protect DB backups.
3. Passport contract owner must grant only MINTER_ROLE to the dedicated signer `0x009bFDc9d4C2738c1594c485040aa1994723330b`, and fund a limited amount of **test ETH**. Latest recorded gate (12 Nov) was `awaiting_minter_role`, minter=false, funded=false.
4. Deploy, verify and fund the independent egg collection; configure `AK_EGG_CONTRACT_46630` and ensure the same signer has its MINTER_ROLE; verify metadata and supply/edition mapping.
5. Configure genuine approved Para production application to eliminate provider development warnings; note that testnet 46630 itself is not mainnet and the current code rejects Para production unless approved configuration. Do not imply a production/mainnet NFT without a reviewed migration.
6. Validate new Chrome/Safari sessions, real Para sign-in and return URL, one Passport+one egg confirmed for an eligible account, post-33 non-winner, two concurrent 33/34 signups, revisits, database/server restarts, out-of-gas recovery, refresh, and no broken navigation.
7. Only then merge/deploy to `/early/`; keep the main site and native APK untouched. Run CI and record deployment SHAs, contract addresses and canonical transaction hashes.

**HOLD:** Until role/gas, official Para environment, real testnet egg deployment and live acceptance are confirmed, do not promote the marketing claim “NFTs already delivered.”
