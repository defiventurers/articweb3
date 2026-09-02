# Migration Validation Log

## Native route check

The cloned Arctic Dominion testnet frontend successfully loaded the new route at `?skipLoader=1&game=heritage-arcade`. The rendered page confirmed all 25 migrated Board Arcade table records, the category counts, the local roster selector, the collection cover image, and the dedicated free-play / wallet-readiness copy.

The interface reports an unconnected session as `FREE`, `READY`, and `OFF — moves never transact`. This confirms that local board play is available without a wallet and that the imported collection does not treat a normal move as an on-chain action.

## Asset check

The rendered route resolved its compass mark, clan portraits, and collection cover from `/assets/heritage-arcade/`, not the former Manus storage paths. The source trace and user-supplied Red, Green, and Blue role coin files were copied into the same public collection directory for the board components.

## Remaining check

The collection screen loaded under Vite’s testnet mode. Launching a game from the native collection shell successfully mounted the imported Penguin Mills board, including its 24-node graph, player roster, legal placement controls, demo/reset/undo controls, and local rules panel.

The target repository’s testnet and mainnet production builds both succeeded after the port. Its existing Ruma rules regression also passed all six tests. The build retains the repository’s pre-existing large-chunk and dynamic-import warnings, but no migration-induced build failure or test regression was observed.

## Post-merge Sanguo Qi issue investigation

The production deployment is access-protected by Vercel authentication in the sandbox browser, so the reported defect is being reproduced against the merged local checkout. The first code inspection confirms that the Sanguo board should render role coins from live React state, above one immutable source-rail layer. The next validation targets the selection and destination-hit layers, then confirms that no static board or fallback presentation layer contains opening-piece artwork.

The local route successfully opens the migrated Sanguo Qi table with all 48 role coins mounted as individually addressable SVG controls. The initial view confirms the accepted white field and black rail geometry. The remaining reproduction is a first-turn Red/ Shu soldier move, checking that its target is visible and clickable and that only the moved live coin disappears from its old node.

The Red/ Shu soldier legal destination accepted a move and advanced play to Green/ Wu, confirming that the pure rule engine and live state transition are sound. The post-move view also confirmed the user-reported artifact: a static opening-piece impression remains at the vacated node beneath the live state. The focused repair therefore separates the trace from its stale opening artwork and strengthens the interactive hit area of each live role coin.

The repair masks only the source image’s obsolete opening-token impressions, directly beneath the live supplied coins, without changing any source rail or node coordinate. Live role coins now own a pointer-enabled circular surface, and each legal endpoint exposes a larger invisible hit area above the static rail layer. An ordinary Red/ Shu selection and move completed successfully after the fix, advanced play to Green/ Wu, and left the former node clear of the static token imprint. The testnet and mainnet builds both passed again, as did the existing six-test Ruma regression suite.

## Source-rail topology rebuild

The former Sanguo target resolver relied on rank/file offsets that could return display nodes without proving that each movement segment followed a visible black rail. It has been replaced by `sanguoGraphMoves.ts`, a graph-native resolver that traverses only declared source-rail neighbours. The existing display-node coordinates remain the sole rendering locations for pieces and legal markers.

The central delta is now modelled by the three actual central-triangle connections—Red–Blue, Red–Green, and Blue–Green—rather than false outer-perimeter hops. Chariots and Cannons may enter the documented opposing central files and continue only along that matching visible file. Soldiers may use the connected central node to cross, then move forward or sideways within the entered enemy field; Elephants, Generals, Advisors, Horses, and Bannermen remain subject to their field or palace restrictions.

Local checks confirmed a graph-native Red opening, a clear central-file Chariot route reaching both eligible opposing fields, no Horse cross-field result, and a Soldier central-delta crossing only to the two corresponding opposing nodes. The testnet and mainnet frontend builds passed, and the existing Ruma regression remains 6/6. The historical movement source used for the crossing interpretation is Quadibloc’s *The Game of the Three Kingdoms* (<http://www.quadibloc.com/chess/ch0304.htm>).

## Reference-coordinate translation layer

Sanguo Qi now exposes reference-facing node IDs through `sanguoReferenceCoordinates.ts`. The layer translates each immutable source node into a sector-prefixed axis/depth label: Red uses the reference W–E axis, while Blue and Green use explicit rotated-sector axis tables. Movement traversal and target deduplication compare these translated identities, while source pixel coordinates and the authoritative rail adjacency remain unchanged. Central delta nodes remain reserved for explicit portal naming in the next historical transcription pass.

## Reference-coordinate layer validation

The clean local preview rebuilt successfully in testnet and mainnet modes. The translated-coordinate audit route mounts after the normal Heritage Arcade atlas flow; the initial blank frame was a transient first-load state, and a subsequent view confirmed the route rendered normally.

The translated audit route now renders labels from the reference layer across all 135 nodes. The first visual pass exposed an ambiguity in multi-digit Green labels such as `G-100`, where axis `10` and depth `0` run together; the next correction will use a delimiter (`G-10-0`) so every axis/depth component is unambiguous.

The final local audit pass renders the translated IDs with explicit separators: Red `R-W-0` through `R-E-4`, Blue numeric-axis labels such as `B-9-0`, and Green numeric-axis labels such as `G-10-0`. The piece-free board remains readable at the board scale, and the audit legend identifies the translated reference-coordinate mode.
