# Game cover asset convention

The cinematic launcher resolves each game cover using the `id` in `src/data/gameCatalog.js`:

```text
/assets/games/<game-id>/front.webp
```

For example, the Arctic Dominion cover is stored at:

```text
public/assets/games/arctic-dominion/front.webp
```

The interface uses these bright, rectified front-facing covers for the standardized WebGL boxes, the responsive fallback carousel, and the collection strip. When a cover is absent or fails to load, the launcher uses its built-in CSS physical-box placeholder instead.

No component or catalog change is required when final front-facing cover renders are added.
