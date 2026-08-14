export function GameInfo({ game, index, total, onEnter }) {
  const playable = Boolean(game.available);

  return (
    <section className="game-info" aria-label={`Details for ${game.title}`}>
      <div className="game-info__counter">{String(index + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}</div>
      <div className="game-info__title-row">
        <p className="game-info__eyebrow">ARCTIC GAME KINGDOMS</p>
        <span className={`game-info__status ${playable ? "is-playable" : "is-upcoming"}`}>{playable ? "PLAYABLE NOW" : "COMING SOON"}</span>
      </div>
      <h1>{game.title}</h1>
      <p className="game-info__heritage">{game.heritage}</p>
      <p className="game-info__metadata">{game.players.toUpperCase()} <span>·</span> {game.engine.toUpperCase()}</p>
      <p className="game-info__summary">{game.summary}</p>
      <button
        type="button"
        className={`game-info__action ${playable ? "is-playable" : "is-upcoming"}`}
        onClick={playable ? onEnter : undefined}
        disabled={!playable}
        aria-describedby={!playable ? "coming-soon-note" : undefined}
      >
        {playable ? "ENTER KINGDOM" : "COMING SOON"} <span aria-hidden="true">→</span>
      </button>
      {!playable && <span id="coming-soon-note" className="game-info__coming-note">This kingdom is not playable yet.</span>}
    </section>
  );
}
