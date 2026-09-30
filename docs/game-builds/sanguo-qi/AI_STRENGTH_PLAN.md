# Sanguo Qi AI Strength Plan

## Scope

This checkpoint changes **bot search and evaluation only**. The Sanguo Qi rules, movement topology, turn order, check/checkmate logic, stalemate-as-loss rule, flying-General restriction, river continuations, appropriation, resignation and draw rules are unchanged.

The implementation was reviewed before changing the AI:

- authoritative legality is standard Xiangqi movement on three logical 5×9 sectors;
- the only board-specific movement adaptation is the explicit river/junction topology;
- Red → Green → Blue turn order skips eliminated kingdoms;
- a General is never captured directly;
- checkmate or stalemate enters a forced appropriation resolution;
- appropriated pieces retain their original sector but change controller;
- the optional Bannermen remain part of the existing rule set;
- threefold repetition and 120 quiet plies are the existing Arctic completion rules.

## Why Medium and Hard were too easy

The previous Sanguo bot had two major limits:

- **Medium** was only depth 1, so it was effectively a one-move static evaluator.
- **Hard** used a depth-3 MaxN search with width 3, so it discarded almost the whole move tree before searching.

The previous evaluator also had only coarse material, progress, attacked-piece and check terms. It did not fully exploit Xiangqi concepts such as Chariot/Horse/Cannon mobility, central-file activity, river pressure, advanced Soldiers, or the huge strategic swing created by appropriation.

## Research direction

### Multiplayer search

Sanguo is a deterministic, perfect-information, three-player game. Research on multiplayer game search supports benchmarking MaxN, paranoid search and Best-Reply Search rather than assuming ordinary two-player minimax transfers directly.

The production checkpoint uses **root-centric paranoid alpha-beta** because:

- it keeps the exact Red → Green → Blue move sequence from the rule engine;
- every non-root player is treated as choosing the strongest reply against the root;
- alpha-beta pruning becomes available;
- iterative deepening, transposition tables, killer/history ordering and quiescence can be applied directly.

Best-Reply Search / opponent-pruning variants remain good candidates for later equal-time self-play benchmarking.

### Xiangqi strategy imported into evaluation, not rules

The evaluator now rewards concepts that matter in Xiangqi without changing how pieces move:

- Chariot, Horse and Cannon mobility;
- central-file activity;
- river control;
- Soldier advancement and river crossing;
- development of major attacking pieces;
- king safety and check pressure;
- avoiding attacked high-value pieces.

This is intentionally evaluation-only. It does not import Xiangqi openings or alter Sanguo movement.

## Difficulty targets

### Easy

Unchanged intentionally weak behavior:

- legal moves;
- light capture preference;
- randomness.

### Medium

- iterative paranoid alpha-beta;
- target depth 4;
- width 20, with forcing moves preserved even when selective width is reached;
- quiescence depth 2;
- ~1.6 s move budget;
- transposition table;
- killer and history heuristics;
- deterministic — no deliberate random mistakes.

### Hard

- iterative paranoid alpha-beta;
- target depth 7;
- width 34, forcing moves preserved;
- quiescence depth 4;
- ~6.5 s move budget;
- larger transposition table;
- deeper search after one kingdom has been eliminated;
- deterministic — no deliberate mistakes.

## Evaluation

The production evaluator is controller-aware, so appropriated armies are automatically evaluated as material and mobility for their new controller.

It includes:

- controlled material;
- strongest-rival and second-rival pressure;
- piece mobility;
- attacked-piece penalties;
- Soldier progress;
- crossed-Soldier bonus;
- Chariot/Cannon/Horse/Bannerman development;
- central-file activity;
- river control;
- enemy-sector penetration;
- check penalties;
- check pressure against opponents;
- eliminated-opponent / appropriation swing.

## Search enhancements

Medium and Hard now use:

1. iterative deepening;
2. paranoid alpha-beta pruning;
3. transposition tables;
4. previous best / transposition move ordering;
5. high-value capture ordering;
6. killer moves;
7. history heuristic;
8. forcing-move preservation;
9. quiescence search;
10. full legal reply search while in check;
11. automatic collapsing of the forced appropriation action inside the search tree;
12. deeper search in the two-player endgame.

The forced appropriation collapse is search-only. The live game still uses the existing separate Resolve Army action.

## Self-play tuning

The evaluator weights are exported as:

`SANGUO_EVAL_WEIGHTS`

Offline self-play tuner:

```bash
cd frontend
npm run tune:sanguo-bot
```

Quick smoke/benchmark:

```bash
npm run benchmark:sanguo-bot
```

Longer tuning example:

```bash
SANGUO_TUNE_GENERATIONS=8 \
SANGUO_TUNE_CANDIDATES=8 \
SANGUO_TUNE_GAMES=3 \
SANGUO_TUNE_BUDGET_MS=50 \
npm run tune:sanguo-bot
```

Candidates rotate through Red, Green and Blue so a weight set is not accepted merely because it performs well from one seat.

## Next strength work

1. Run large Hard-vs-Hard self-play tournaments and promote evaluator weights only after a clear all-seat improvement.
2. Build tactical regression positions for checkmate, stalemate appropriation, flying-General pins, Cannon screens, Horse-leg traps, central L5 branches and post-appropriation attacks.
3. Compare paranoid, MaxN, Best-Reply Search and opponent-pruning search under identical time budgets.
4. Build a Sanguo-specific opening book from strong self-play rather than copying two-player Xiangqi openings literally.
5. If classical search plateaus, train a Sanguo policy/value model on self-play data and use it for move ordering/evaluation or MCTS guidance.
