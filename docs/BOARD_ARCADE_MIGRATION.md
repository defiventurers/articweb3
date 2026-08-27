# Board Arcade Migration Contract

## Objective

This migration brings the Board Arcade collection into the Arctic Dominion repository as a native heritage-game surface. It preserves the original Board Arcade engines, source-status labels, user-supplied polar role coins, and playable local modes while using Arctic Dominion’s existing screen flow, profile identity, sound shell, catalog data, and Abstract wallet provider.

## Audited Arctic Dominion contract

Arctic Dominion currently separates game discovery (`GameLibraryScreen` and `GAME_CATALOG`), screen selection (`App.jsx`), local rule modules (`frontend/src/games/*/rules.js`), online adapters, server-authoritative lobby actions, and the Abstract wallet boundary. The migration will respect that arrangement rather than replace the existing flagship or heritage titles.

The new `heritage-arcade` catalog entry will open an `HeritageArcadeApp` with the same cover, menu, local practice, local hot-seat, rules, and return-to-library conventions used by the native game modules. Its collection screen will expose all 25 Board Arcade tables through one migrated registry. Dedicated existing Arctic games remain unchanged.

## Migration layers

| Layer | Migration choice | Reason |
|---|---|---|
| Discovery | Add one playable `heritage-arcade` catalog entry. | Preserves existing `App.jsx` routing and lets the library launch the imported collection as a native game screen. |
| Game registry | Port all 25 Board Arcade records into `frontend/src/games/heritage-arcade/arcadeData.js`. | Retains each title, rule-status disclosure, board descriptor, player count, and available local engine. |
| Engines | Port the Board Arcade rules and components under `frontend/src/games/heritage-arcade/ported/`. | Keeps its TypeScript-tested rules code separate from Arctic Dominion’s existing JavaScript engines. |
| Presentation | Create a scoped Arctic-styled collection and host shell around the ported boards. | Avoids global CSS collisions while giving the collection native navigation, player identity, and return actions. |
| Assets | Copy user-supplied coin art and required source-field images to `frontend/public/assets/heritage-arcade/`. | A Vercel deployment must not depend on the former Manus storage domain. |
| Multiplayer | Keep imported games in Free Play / local hot-seat initially. | Arctic’s online actions are server-authoritative and game-specific; adding 25 unvalidated socket namespaces would weaken validation. |

## Abstract Chain compatibility policy

Arctic Dominion already provides `AbstractWalletProvider`, Wagmi account state, chain validation, environment-specific Abstract mainnet/testnet configuration, and a gated Locked Match Lab. The migrated collection inherits this provider and adds a small `ArcadeChainStatus` interface that exposes wallet identity, expected network, and read-only free-play status.

No ordinary board move will generate an on-chain transaction. Any future match proof, cosmetics, tournament entry, or testnet escrow must enter through a named adapter and the existing `HighStakesGate`; it is off by default and remains unavailable unless backend launch status, contract configuration, and legal approval are all present. This preserves the repository’s existing safety model.

## Acceptance criteria

1. The native Arctic library can launch the Heritage Board Arcade entry and return safely to the library.
2. The collection lists all 25 Board Arcade titles with their explicit source-status labels.
3. Sanguo Qi, Xiangqi, Mills, Ryūkyū Sanzan, and all compact/special board modes load their preserved local engines without changing their legal rules.
4. Red, Green, and Blue supplied role coins, source trace, and ice texture resolve from repository public assets.
5. Free Play remains usable without a wallet; an Abstract-connected profile is recognized but no board move requests a transaction.
6. The target frontend builds in both testnet and mainnet modes, and existing Arctic routes remain available.

## Deferred work

Online rooms, server actions, replay persistence, match history, and testnet proof recording must be added per game after each imported engine has an authoritative server validator. This migration intentionally does not claim that local hot-seat state is an on-chain or multiplayer result.
