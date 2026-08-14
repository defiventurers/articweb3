import { ArcticAmbient } from "./ArcticAmbient.jsx";
import { GameBox } from "./GameBox.jsx";

export function GameWorld({ games, focusedGameId, openingGameId, onFocusGame, onOpenGame, explorationStyle, reducedMotion }) {
  return (
    <section className="arctic-game-world" style={explorationStyle} aria-label="Arctic Game Kingdoms world">
      <ArcticAmbient reducedMotion={reducedMotion} />
      <div className="world-terrain" aria-hidden="true">
        <span className="terrain-shelf shelf-one" />
        <span className="terrain-shelf shelf-two" />
        <span className="terrain-shelf shelf-three" />
        <span className="terrain-bridge" />
        <span className="terrain-path path-one" />
        <span className="terrain-path path-two" />
      </div>
      <div className="world-boxes">
        {games.map((game) => (
          <GameBox
            key={game.gameId}
            game={game}
            isFocused={focusedGameId === game.gameId}
            isOpening={openingGameId === game.gameId}
            onFocus={onFocusGame}
            onOpen={onOpenGame}
          />
        ))}
      </div>
      <div className="world-edge-frost" aria-hidden="true" />
    </section>
  );
}
