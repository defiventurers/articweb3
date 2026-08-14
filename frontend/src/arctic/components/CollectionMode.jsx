export function CollectionMode({ games, focusedGameId, onFocusGame, onOpenGame, onClose }) {
  return (
    <aside className="arctic-collection" aria-label="Game collection">
      <header className="collection-header">
        <div>
          <p>ARCTIC GAME KINGDOMS</p>
          <h2>The Collection</h2>
        </div>
        <button type="button" onClick={onClose} aria-label="Close collection">Close</button>
      </header>
      <p className="collection-intro">All twenty-one game worlds remain available here while the frozen kingdom stays your primary map.</p>
      <div className="collection-list">
        {games.map((game) => {
          const playable = Boolean(game.available);
          return (
            <button
              key={game.gameId}
              type="button"
              className={`collection-game theme-${game.theme} ${focusedGameId === game.gameId ? "is-focused" : ""}`}
              onMouseEnter={() => onFocusGame(game.gameId)}
              onFocus={() => onFocusGame(game.gameId)}
              onClick={() => onOpenGame(game.gameId)}
            >
              <span className="collection-game-mark">{game.mark}</span>
              <span className="collection-game-copy">
                <strong>{game.title}</strong>
                <small>{game.heritage}</small>
              </span>
              <span className={`collection-game-status ${playable ? "is-playable" : ""}`}>{playable ? "PLAY" : "COMING SOON"}</span>
            </button>
          );
        })}
      </div>
    </aside>
  );
}
