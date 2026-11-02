# Para game wallets — Android 5.6.0

Reviewed baseline: main cfa20ccf1f55b569322d041e030879cc252ec8ed (PR #56). Android baseline: saved full 5.4.0 source, overlaid with 5.4.1, 5.4.2 and 5.5.0 source updates. This repository's legacy Android shell is not that complete source archive; use the companion source-update ZIP over those saved sources when rebuilding the APK.

## Accepted decisions

- One compact app entry opens Para's sign-in modal. Keep all dashboard-enabled methods, including Google, email, phone, X, Discord, Facebook, Apple and Telegram. No separate Privy or MetaMask login is added to the APK.
- Robinhood Chain is primary. Arbitrum is an explicit operator-selected fallback, not an automatic switch during a transaction. The existing main website's Abstract Global Wallet integration is unchanged.
- The supplied public beta key belongs to the Development instance. Beta wallets use Robinhood Chain Testnet (46630). Production targets Robinhood Chain (4663), after production credentials and launch gates. Arbitrum testnet/mainnet IDs are 421614/42161.
- No new mainnet contract deployment, payment, NFT transfer or funded minting is included. A successful visa registration is not a mint receipt.

## App and security

The system browser opens the hosted /arctic-play/wallet/ portal. Para controls the available login methods from the dashboard. An authenticated embedded EVM wallet signs a fresh attempt-specific message. The backend checks the Para RS256 JWT against the environment's official JWKS, exact app audience, subject, expiry and wallet attestation, then verifies the wallet signature. Tokens and private keys never enter app-return URLs. One-use PKCE tickets return through the existing Android deep link.

Repeat logins preserve the Para user mapping and wallet. Email matching alone never merges an old account; recover/sign into the old account and explicitly connect Para to retain its progress. Linking requires an active original game session, and cannot replace an already pinned different wallet. Old passports and assets remain on their original chain and wallet. Changing chain or provider does not bridge assets.

The game service stores no Para private keys and does not import a user's signing session. Guest and connected-external-wallet-only attestations cannot create a game account through this path. The user's dashboard currently has guest mode off and no external wallet providers selected.

My wallet & NFTs retains the reviewed ERC1155 transfer flow, live balance check, simulation and transaction receipt. It labels inventory by chain and only offers a transfer on the active chain. Permanent visas remain non-transferable. NFT delivery still requires contracts and a funded issuer on the selected chain.

## Configuration

The public beta key and its instance ID from Para's public /touch and /partners responses are included as Development defaults. There is no secret API key. Override with:

- AK_PARA_ENABLED=true (false disables the new routes).
- AK_PARA_API_KEY=<public beta_ or prod_ key>.
- AK_PARA_APP_KEY_ID=<that key instance's exact JWT audience ID>; required when replacing the supplied key.
- AK_PARA_ENVIRONMENT=BETA or PRODUCTION.
- AK_PARA_CHAIN_ID=46630 for beta Robinhood; 4663 for production Robinhood. Explicit Arbitrum fallback is 421614/42161.
- AK_PARA_PRODUCTION_APPROVED=true is additionally required for production readiness. Beta credentials cannot enable mainnet readiness.

Keep https://articweb3.onrender.com in Para's allowed origins. Configure the project in Para's Developer Portal; provider billing/production availability is not established by this code. The app calls /arctic-play/v3/auth/para/start; /config, /attempt and /complete implement readiness, browser setup and attestation. Old Google and MetaMask routes remain for older clients.

The server install builds the browser portal through scripts/build-game-wallet.cjs, pinned EVM-only Para SDK 3.25.0, the official setup-para stub step and Vite. Source-transformation path reviewed: start-with-runtime-status.js → start-with-indexer.js → allGamesBackendBootstrap.js → injectArcticPlay → createArcticPlayService → createCompanyService → createCompanyAuth. No game rule, multiplayer dispatcher or chain settlement engine is changed.

## NFTs and per-chain isolation

New Para visas derive chain ID from the server-verified wallet, not a browser address or the older Abstract default. Existing passports retain their chain. Contracts resolve from AK_VISA_CONTRACT_<CHAIN_ID>, AK_ARRIVAL_CONTRACT_<CHAIN_ID> and AK_ACHIEVEMENT_CONTRACT_<CHAIN_ID>. The old unsuffixed variables apply only to AK_VISA_CHAIN_ID for legacy records. Never reuse Abstract addresses as Robinhood deployments.

A worker uses AK_VISA_CHAIN_ID and its own AK_VISA_RPC_URL / signer / contracts. It validates eth_chainId and deployed bytecode and claims jobs only for its chain. All mainnet workers require AK_VISA_MAINNET_APPROVED=true. Worker deployment, chain-specific funding, deployed contract verification and receipt/indexing rehearsal remain required. Mainnet launch gates in the project still apply.

## Verification and limits

35 server checks pass across Para, legacy Google wallet, account play, passport and temporary recovery. 12 packaged app/startup checks pass. Portal production build passes. APK original signing certificate, runtime files and artwork equality are checked separately in verification.json. Official Robinhood mainnet/testnet RPCs returned 0x1237 / 0xb626 on 3 November 2026 IST.

Not verified: real Google/social/OTP login and the live Para JWT profile, provider recovery on another device, physical phone installation, browser portal visual layout, a real NFT mint or transfer. The local Chromium runner could not start; browser visual checks are not claimed. The live backend must be deployed before the APK can use the new Para endpoints. No Render deployment is claimed by this source update.

Official references checked:
- https://docs.getpara.com/v3/react/guides/sessions-jwt
- https://docs.getpara.com/v3/react/guides/react-sdk-lite
- https://docs.getpara.com/v3/react/setup/vite
- https://docs.robinhood.com/chain/connecting/
- https://docs.robinhood.com/chain/
- https://docs.arbitrum.io/chain-info
