# Arctic Dominion: optional End turn

After rolling, an Android-room player may end with both dice unused or after
one move, even when another legal move exists. Accepted board moves remain in
place; the next living kingdom receives fresh, unrolled dice. The existing
automatic pass for unusable dice and ordinary two-move completion still apply.
Casual bots continue to spend dice when they have legal moves.

The previous Android adapter returned End turn only when its move list was
empty. The bundled Android-room engine now returns legal moves plus End turn
for every nonterminal rolled position. Its existing apply validation therefore
accepts voluntary ending only during the rolled phase. Room authentication,
actor seat checks, revision checks and rule-worker validation are unchanged.
The engine protocol version is unchanged, allowing existing Android rooms to
continue. Website rules in server/gameRules.js are unchanged.

The two small generated-engine hunks are deliberately based on main commit
59efca11d56fe161699545d1d032ae4420fcbc43, rather than replacing its entire bundle
with a different build. The complete newer Android source is delivered in the
AntarcticKingdoms-v3.9.0-source.zip release archive. Its source adapter and bot
selection contain these same changes. Rebuilding from that archive preserves
the correction. The older public mobile source is not used to rebuild this APK.

Validation:

```sh
node --test server/tests/arctic-play-end-turn.test.js server/tests/arctic-play-online.test.js server/tests/arctic-play-socket.test.js
```

The new test covers zero/one move, an unchanged board on ending, reset dice,
broadcasts, stored-room verification, pre-roll rejection, invalid credentials,
wrong seat, stale revision and replay rejection. The existing tests cover all
seven Android games, bots, reconnects, real sockets and website health.
