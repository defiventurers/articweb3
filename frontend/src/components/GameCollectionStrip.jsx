export function GameCollectionStrip({ games, selectedIndex, onSelectIndex }) {
  return (
    <nav className="game-collection-strip" aria-label="Game collection">
      <div className="game-collection-strip__rail" role="tablist" aria-label="All 21 game kingdoms">
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
              <span className="game-collection-strip__spine" aria-hidden="true">
                <span>{game.mark}</span>
              </span>
              <span className="game-collection-strip__number">{String(index + 1).padStart(2, "0")}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
