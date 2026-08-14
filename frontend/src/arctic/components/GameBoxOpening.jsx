import { GameBoardReveal } from "./GameBoardReveal.jsx";

export function GameBoxOpening({ game, phase, onCancel }) {
  const isPlayable = Boolean(game.available);
  const phaseLabel = phase === "focus"
    ? "Focusing the frozen world"
    : phase === "open"
      ? "Opening the game box"
      : phase === "reveal"
        ? "Revealing the board"
        : isPlayable
          ? "Entering the game"
          : "Opening the game cover";

  return (
    <section className={`arctic-opening-sequence phase-${phase}`} aria-live="polite" aria-label={`Opening ${game.title}`}>
      <div className="opening-vignette" />
      <div className="opening-stage">
        <div className={`opening-box theme-${game.theme}`} style={{ "--reveal-accent": game.revealConfig.accent }} aria-hidden="true">
          <span className="opening-box-snow" />
          <span className="opening-box-lid">
            <span className="opening-box-top">{game.mark}</span>
            <span className="opening-box-front">
              <small>{game.heritage}</small>
              <strong>{game.title}</strong>
            </span>
            <span className="opening-box-side">{game.mark}</span>
          </span>
          <span className="opening-box-base" />
          <span className="opening-latch opening-latch-one" />
          <span className="opening-latch opening-latch-two" />
        </div>
        <GameBoardReveal game={game} phase={phase} />
      </div>
      <div className="opening-copy">
        <p>{game.landmark}</p>
        <h2>{game.title}</h2>
        <span>{phaseLabel}</span>
      </div>
      <button type="button" className="opening-cancel" onClick={onCancel} aria-label="Return to Arctic Game Kingdoms">
        Return to kingdom
      </button>
    </section>
  );
}
