export function GamePreviewScreen({ game, onBack }) {
  if (!game) return null;

  return (
    <section className={`game-preview-screen theme-${game.theme}`} aria-label={`${game.title} cover`}>
      <div className="game-preview-sky" aria-hidden="true">
        <span className="preview-aurora preview-aurora-one" />
        <span className="preview-aurora preview-aurora-two" />
        <span className="preview-mountain preview-mountain-one" />
        <span className="preview-mountain preview-mountain-two" />
        <span className="preview-board-emblem">
          <span className="preview-emblem-ring ring-one" />
          <span className="preview-emblem-ring ring-two" />
          <strong>{game.mark}</strong>
        </span>
      </div>

      <button type="button" className="library-return-button" onClick={onBack}>
        <span aria-hidden="true">←</span> All games
      </button>

      <div className="game-preview-content">
        <div className="game-preview-badges">
          <span className={`game-status status-${game.statusKey}`}>{game.status}</span>
          <span className="game-preview-priority">BUILD PRIORITY #{game.priority}</span>
        </div>
        <p className="game-preview-kicker">{game.heritage}</p>
        <h1>{game.title}</h1>
        <p className="game-preview-summary">{game.summary}</p>

        <div className="game-preview-meta" aria-label="Game details">
          <div>
            <span>Players</span>
            <strong>{game.players}</strong>
          </div>
          <div>
            <span>Engine</span>
            <strong>{game.engine}</strong>
          </div>
          <div>
            <span>Release</span>
            <strong>In development</strong>
          </div>
        </div>

        <div className="game-preview-notice">
          <strong>This kingdom is not playable yet.</strong>
          <span>
            Its heritage ruleset will be frozen and versioned before public play. No unfinished game flow has been exposed.
          </span>
        </div>

        <button type="button" className="game-preview-back-cta" onClick={onBack}>
          Return to game library
        </button>
      </div>
    </section>
  );
}
