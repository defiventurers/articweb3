# San You Qi AI Strength Plan

## Why the old Medium / Hard bots were weak

The previous implementation was intentionally simple:

- Medium mostly chose among one-ply evaluations and could randomly take a top-three move.
- Hard used shallow three-player MaxN with a narrow beam.
- Evaluation was mostly material + promotion + a small mobility/check bonus.
- There was no quiescence search, transposition table, iterative deepening, killer/history ordering, or explicit hanging-piece / king-safety analysis.

That is not enough for the current Arctic Dominion rule set, which contains:

- three independent players;
- check interruption and resumed turns;
- army appropriation after mate;
- flying-General pins;
- Fort / Mountain / Sea movement restrictions;
- unique Cannon routes;
- custom Horse and Fire geometry;
- Soldier promotion;
- post-crossing Flag movement;
- shared central territory.

## Research-driven engine direction

### Search

The first strengthening pass used root-centric paranoid alpha-beta. Human testing showed it was actually easier to beat: it treated the two other kingdoms as a single coordinated enemy and became too defensive in a game where every kingdom is independent.

The current engine therefore uses **MaxN while three kingdoms are alive**. Each kingdom selects moves that maximize its own utility. Once one kingdom is eliminated, the position becomes truly two-player and Hard switches to **alpha-beta**.

The search stack now contains:

1. iterative deepening;
2. three-player MaxN while all kingdoms are alive;
3. alpha-beta after the game becomes two-player;
4. transposition/evaluation caches;
5. principal-variation move ordering;
6. MVV-LVA-style capture ordering;
7. killer/history ordering in the two-player phase;
8. forcing-move preservation when beam-limiting;
9. quiescence search for captures, checks, promotions and elimination;
10. full legal response search while a kingdom is in check;
11. guaranteed one-ply scoring before any time-limited deeper iteration.

### Evaluation

The evaluator now understands:

- controlled material, including appropriated armies;
- promoted Soldiers;
- crossed Flags;
- current legal mobility;
- current check and check-to-move penalties;
- checking-move pressure;
- enemy-territory development;
- shared Fort-gate occupancy;
- inner-Sea control;
- central C-point occupation;
- elimination / appropriation swing;
- strongest-rival and second-rival pressure.

This is intended to make the bot value the same strategic concepts that matter in Xiangqi while adapting them to the current three-player board.

## Difficulty targets

### Easy

Keep the existing intentionally weak behavior:

- legal moves;
- light capture bias;
- randomness.

### Medium

Target: strong tactical club-level opponent for this custom game.

Current settings:

- iterative MaxN;
- maximum depth 4;
- beam 14 plus root beam 28, with forcing moves always retained;
- quiescence depth 2;
- approximately 2.8 seconds per move;
- deterministic: no random top-three mistake injection.

### Hard

Target: strongest browser/server-safe opponent currently practical without a trained neural network.

Current settings:

- iterative MaxN while three kingdoms remain;
- maximum depth 6;
- beam 20 plus root beam 42, with forcing moves always retained;
- quiescence depth 4;
- approximately 10.5 seconds per move;
- large transposition/evaluation caches;
- switches to deeper alpha-beta after one kingdom is eliminated;
- deterministic, no deliberate mistakes.

## Self-play tuning

The evaluator weights are exported as:

`SAN_YOU_EVAL_WEIGHTS`

An offline self-play tuner is available:

```bash
cd frontend
npm run tune:sanyou-bot
```

It mutates the strategic weights and tests each candidate by rotating it through Red, Green and Blue against the current champion.

Useful environment variables:

```bash
SANYOU_TUNE_GENERATIONS=8 \
SANYOU_TUNE_CANDIDATES=8 \
SANYOU_TUNE_GAMES=3 \
SANYOU_TUNE_BUDGET_MS=50 \
npm run tune:sanyou-bot
```

A short pipeline smoke/benchmark is:

```bash
npm run benchmark:sanyou-bot
```

The tuner prints the best weight set. A longer offline run should be used before replacing production weights.

## Recommended next strength steps

1. Run large self-play tournaments and replace hand-tuned weights only when the candidate has a clear win-rate improvement across all three seats.
2. Build a San You Qi opening book from high-quality Hard-vs-Hard self-play instead of importing Xiangqi openings literally.
3. Add tactical test suites: mate-in-N, forced appropriation, flying-General pins, Cannon screens, Horse-leg traps, promotion races and third-party discovered checks.
4. Benchmark MaxN against Best-Reply Search under equal time budgets; the paranoid version is retained only as a documented failed experiment from human testing.
5. If classical search plateaus, train a policy/value network on self-play positions and use it to order / evaluate the alpha-beta tree or guide MCTS.

A neural model should be a later stage, not the first fix. The exact San You Qi graph and rules differ enough from ordinary Xiangqi that a Xiangqi network cannot simply be dropped in without fine-tuning on this game's legal positions.
