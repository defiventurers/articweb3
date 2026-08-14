# Game box asset convention

The cinematic launcher resolves each game render using the `id` in `src/data/gameCatalog.js`:

```text
/assets/games/<game-id>/box.webp
```

For example, upload the Arctic Dominion render to:

```text
public/assets/games/arctic-dominion/box.webp
```

The interface automatically attempts to load this path for the selected game and its immediate carousel neighbours. When a render is absent or fails to load, the launcher uses its built-in CSS physical-box placeholder instead.

No component or catalog change is required when final box renders are added.
