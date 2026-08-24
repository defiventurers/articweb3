/* Tactile Expedition Theatre: durable inline cover art applies only to heritage titles; the Arctic Dominion shell keeps its original art. */
import { useEffect, useState } from "react";
import { HeritageCoverArt } from "./HeritageCoverArt.jsx";

export function GameBox({ game, position = "selected" }) {
  const [arcticImageFailed, setArcticImageFailed] = useState(false);
  const isArcticDominion = game.id === "arctic-dominion";

  useEffect(() => setArcticImageFailed(false), [game.id]);

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
          {isArcticDominion && !arcticImageFailed ? (
            <img className="game-box__image" src="/assets/games/arctic-dominion/front.webp" alt="" onError={() => setArcticImageFailed(true)} />
          ) : isArcticDominion ? (
            <div className="game-box__placeholder"><span className="game-box__mark">AD</span><span className="game-box__placeholder-title">Arctic Dominion</span></div>
          ) : <HeritageCoverArt game={game} />}
          <div className="game-box__frost" />
          <div className="game-box__glint" />
        </div>
      </div>
    </div>
  );
}
