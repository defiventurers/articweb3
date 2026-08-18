export function GameCollectionStrip({ games, selectedIndex, onSelectIndex }) {
  return (
    <nav className="game-collection-strip" aria-label="Arctic Dominion game collection">
      <div className="game-collection-strip__header">
        <span>THE FROZEN ARCHIVE</span>
        <span>{String(games.length).padStart(2, "0")} TITLES</span>
      </div>
      <div className="game-collection-strip__viewport">
        <div className="game-collection-strip__rail" role="tablist" aria-label="All Arctic Dominion board games">
          {games.map((game, index) => {
            const selected = index === selectedIndex;
            return (
              <button
                key={game.id}
                type="button"
                role="tab"
                aria-selected={selected}
                aria-label={`Select ${String(index + 1).padStart(2, "0")}: ${game.title}`}
                className={`game-collection-strip__item theme-${game.theme} ${selected ? "is-selected" : ""}`}
                onClick={() => onSelectIndex(index)}
              >
                <span className="game-collection-strip__thumb" aria-hidden="true">
                  <img src={`/assets/games/${game.id}/box.webp`} alt="" loading={index < 7 ? "eager" : "lazy"} decoding="async" />
                  <span className="game-collection-strip__thumb-shine" />
                </span>
                <span className="game-collection-strip__number">{String(index + 1).padStart(2, "0")}</span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

export default GameCollectionStrip;
