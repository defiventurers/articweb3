# One Google sign-in → game wallet → Antarctic Visa

Implementation candidate 5.5.0 / Android code 69. Backend reviewed against main 29c7d40c5e2aad572c470e2beef6449f7c5b51df. No production deployment or wallet-provider project activation is included.

## Player flow

Continue with Google opens the system browser. MetaMask Embedded Wallets (Web3Auth SDK 11.4.3) authenticates the player with Google and creates or restores their application wallet. There is no AGW, Privy login, email code, wallet app installation or pasted wallet address in this new flow. The browser returns a one-use ticket bound to the APK’s separate PKCE verifier. The app registers a visa with the server-verified wallet and the Google display name. Existing passports and saved games stay intact. A failed setup shows Retry and does not unlock gameplay.

Profile → Your Antarctic Visa → My wallet & NFTs opens the wallet. Confirmed game collectibles show Send to another wallet. Transfer review names the network, destination, collectible and possible fee. The portal checks the live ERC1155 balance and simulates the transfer before signing, then waits for an onchain receipt. The permanent visa remains non-transferable under the existing contract. No contract transfer rule has been changed. NFTs sent to old external/Privy wallets are not moved to a new wallet automatically.

The address can receive native currency and supported tokens on the displayed EVM network. This candidate displays the native balance and delivered game NFTs; it does not provide a universal token indexer, arbitrary-token withdrawal UI or cross-chain bridge. Provider sign-in/transaction approval may require the system browser. Real provider sign-in, new-device recovery, soft keyboard and an actual NFT transfer require device/provider test accounts.

## Security and recovery

Server verification checks the provider ES256 JWT signature using its official JWKS, exact issuer, project audience, dedicated Google connection, expiry and issued-at time. It derives the Ethereum address from the full secp256k1 application public key, verifies possession with a fresh request-specific signed message, and rejects substituted addresses and reused attempts. Only the existing app verifier can exchange a login ticket. Management also requires the game account’s existing session and matching pinned wallet. Existing verified email mappings preserve game progress when adopting the Google wallet. Temporary recovery expiry, rotation restrictions and offline-license restrictions are retained from current main.

Neither private keys nor provider identity tokens go in app-return URLs. Keys are managed by the embedded-wallet SDK and infrastructure; the game backend stores the verified address and opaque identity mapping. The game cannot recover a wallet from an old game recovery code. Users must retain their Google account and the provider’s supported recovery factors. Recovery behavior must be verified on another device before accepting live assets. Do not rotate the wallet project, connection ID, SDK key mode or provider network after onboarding; doing so can produce a different wallet.

## Activation still required

1. Create an Embedded Wallets project at https://developer.metamask.io/ . Use a development project first. Enable Google as its only social connection. Choose the default Google connection or a dedicated Google connection; do not choose an email/custom-JWT/multi-provider group. Pin its exact Auth Connection ID in the server. Enable Return user data in identity token so the backend can preserve existing verified-email accounts. Review current plan limits before production; this task starts no paid plan.
2. Allow https://articweb3.onrender.com as an origin and https://articweb3.onrender.com/arctic-play/wallet/ as the redirect URL. The SDK uses redirect mode to avoid blocked automatic popups. Default Google uses provider-managed OAuth credentials. If choosing your own Google OAuth client, follow the official Google provider instructions and add https://auth.web3auth.io/auth as its authorized redirect. Do not replace the old callback needed by older APKs.
3. Add these non-secret settings in the existing Render service: AK_WALLET_CLIENT_ID=<exact project client ID>, AK_WALLET_GOOGLE_CONNECTION_ID=<exact dedicated Google connection ID>, AK_WALLET_NETWORK=sapphire_devnet, AK_VISA_CHAIN_ID=11124, AK_WALLET_ENABLED=true. Keep mainnet disabled. APKs contain no guessed client ID. The public /arctic-play/v3/auth/wallet/config endpoint must report enabled:true only once these are set and the database is configured.
4. Deploy the reviewed backend source and build the wallet portal during the existing server install step using scripts/build-game-wallet.cjs. Do not use the older Privy portal PR. Keep the old direct Google endpoints for older APK compatibility; only the new APK uses /auth/wallet/*.
5. Test first Google login, cancellation, another Google account, repeated login, new-device recovery, reconnects, duplicated callbacks, lost app verifier and account logout. Verify the provider token shape matches the strict backend checks. Test the CSP in a real browser with the selected provider environment.
6. The existing visa NFT contracts and delivery worker must separately be deployed/configured/funded on the same testnet before real NFTs arrive. Registration alone does not mint. UI continues to show the actual delivery status. Test one real transferable arrival/achievement NFT to a new address before release. No mainnet, payment or payout is enabled by this change.
7. Production requires a separate approved rollout. The backend requires matching sapphire_mainnet/Abstract 2741 settings plus AK_WALLET_PRODUCTION_APPROVED=true before advertising mainnet readiness; provider plan review, recovery/device checks and funded gas/issuer infrastructure remain release gates.

## Rebuild

Overlay apk-source-update on the saved v5.4.0 full source plus v5.4.1 and v5.4.2 updates. Overlay backend-update on the full server tree. Delete the superseded mobile/arctic-play/tests/signin-retry.test.mjs, now replaced by Google-only visa tests. Install pinned dependencies in mobile/arctic-play/build-deps and shared/fair-play, rebuild with the existing --reuse-artwork option, then sign with the original private certificate. The server portal has its own pinned wallet-build lockfile. Private signing backups are never included.

## Evidence

20 backend checks passed across Google wallet identity, PKCE, account migration, passport, legacy Google and temporary recovery. 14 UI/startup checks passed including the new Google-only welcome and automatic visa issue. Portal production build passed. Original signing certificate and runtime asset equality are checked separately in verification.json. Real provider login, phone installation, recovery on another device and real NFT transfer remain unverified; this is an integration candidate.

Official references checked 2 November 2026:
- https://docs.metamask.io/embedded-wallets/authentication/social-logins/google/
- https://docs.metamask.io/embedded-wallets/authentication/id-token/
- https://docs.metamask.io/embedded-wallets/sdk/js/
