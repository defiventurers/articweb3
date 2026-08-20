import { useEffect, useState } from "react";

const BOX_ART_VERSION = "front-1";
const boxAssetPath = (gameId) => gameId === "four-wing-ice-hunt"
  ? `/assets/games/${gameId}/front.png?v=${BOX_ART_VERSION}`
  : `/assets/games/${gameId}/front.webp?v=${BOX_ART_VERSION}`;

export function GameBox({ game, position = "selected", priority = false }) {
  const [imageFailed, setImageFailed] = useState(false);
  const imageSource = boxAssetPath(game.id);

  useEffect(() => {
    setImageFailed(false);
  }, [game.id]);

  return (
    <div
      className={`game-box game-box--${position} theme-${game.theme}`}
      aria-hidden={position !== "selected"}
    >
      <div className="game-box__shadow" />
      <div className="game-box__object">
        <div className="game-box__spine">
          <span>{game.mark}</span>
          <strong>{game.title}</strong>
        </div>
        <div className="game-box__face">
          {!imageFailed && (
            <img
              className="game-box__image"
              src={imageSource}
              alt=""
              loading={priority ? "eager" : "lazy"}
              fetchPriority={priority ? "high" : "auto"}
              onError={() => setImageFailed(true)}
            />
          )}
          {imageFailed && <GameBoxPlaceholder game={game} />}
          <div className="game-box__frost" />
          <div className="game-box__glint" />
        </div>
      </div>
    </div>
  );
}

function GameBoxPlaceholder({ game }) {
  return (
    <div className="game-box__placeholder">
      <span className="game-box__seal">ARCTIC GAME KINGDOMS</span>
      <span className="game-box__mark">{game.mark}</span>
      <span className="game-box__placeholder-title">{game.title}</span>
      <span className="game-box__placeholder-rule" />
      <span className="game-box__placeholder-meta">{game.heritage}</span>
      <span className="game-box__placeholder-index">{String(game.priority + 1).padStart(2, "0")}</span>
    </div>
  );
}

export { boxAssetPath };
