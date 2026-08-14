# Arctic Game Kingdoms Asset Plan

## Existing assets to reuse

The repository already contains Arctic Dominion and supporting artwork under `frontend/public/assets`, including:

- `assets/artic/pieces/` for colored Dominion pieces.
- `assets/how-to-play/` for kingdom and roster imagery.
- `assets/screens/` for current landing, menu, game-base, and preview art.
- `assets/sounds/` for the existing UI, gameplay, and ambient sound library.

The new world should keep the existing screen art and game assets available for fallback routes and use selected Dominion pieces/kingdom imagery as accents where they reinforce the frozen-world presentation. No existing gameplay asset should be deleted or moved as part of the landing transformation.

## New skeletal box asset contract

The first implementation uses procedural placeholder faces. Each box can later opt into:

```js
frontArtwork: "/assets/boxes/arctic-dominion/front.webp",
sideArtwork: "/assets/boxes/arctic-dominion/side.webp",
topArtwork: "/assets/boxes/arctic-dominion/top.webp"
```

Recommended future location:

```text
frontend/public/assets/boxes/<game-id>/
├── front.webp
├── side.webp
└── top.webp
```

The replacement workflow is:

1. Create the final artwork for a real catalog ID.
2. Add the three optional files to `frontend/public/assets/boxes/<game-id>/`.
3. Update one entry in `frontend/src/arctic/arcticGameRegistry.js`.
4. The shared `GameBox` component automatically uses the artwork while retaining geometry, materials, motion, lighting, opening, and routing.

## Visual direction reference

The intended direction is a premium frozen board-game kingdom: deep blue-black night, blue ice, warm amber fire, pale aurora, translucent frost, restrained snow, physically thick collectible boxes, and strong depth around a central castle. The first pass should use procedural box faces and CSS environment layers rather than spending time on final cover art for all 21 games.

The approved visual reference is `docs/arctic-game-kingdoms-world-reference.png`. It establishes the target composition: a central ice castle, deep blue nighttime terrain, aurora, glowing settlements, frozen water paths, restrained snow, and skeletal physical boxes placed throughout the world. It is a direction reference, not final game-box artwork.

## Audio

The existing `frontend/src/utils/soundManager.js` remains the audio integration point. New world events should use existing named sound hooks where appropriate and degrade silently when audio is muted or unavailable. Browser autoplay restrictions remain respected through the existing unlock flow and visible mute control.
