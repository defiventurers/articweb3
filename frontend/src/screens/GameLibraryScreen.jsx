import { useMemo, useState } from "react";
import { GAME_CATALOG } from "../data/gameCatalog.js";

const PLAYABLE_GAME_IDS = new Set(["arctic-dominion", "nine-ice-forts"]);
const FILTERS = [
  { id: "all", label: "All games" },
  { id: "playable", label: "Playable" },
  { id: "build-now", label: "Build now" },
  { id: "build-next", label: "Build next" }
];

export function GameLibraryScreen({ onSelectGame }) {
  const [filter, setFilter] = useState("all");
  const visibleGames = useMemo(() => {
    if (filter === "all") return GAME_CATALOG;
    if (filter === "playable") return GAME_CATALOG.filter((game) => PLAYABLE_GAME_IDS.has(game.id));
    return GAME_CATALOG.filter((game) => game.statusKey === filter);
  }, [filter]);

  return (
    <section className="game-library-screen" aria-label="Game library">
      <div className="library-sky" aria-hidden="true">
        <span className="library-aurora aurora-one" />
        <span className="library-aurora aurora-two" />
        <span className="library-snow snow-one" />
        <span className="library-snow snow-two" />
      </div>

      <header className="library-header">
        <p className="library-kicker">PROJECT ABSTRACT INDIAN GAMES</p>
        <h1>ARCTIC GAME KINGDOMS</h1>
        <p className="library-intro">
          Enter a frozen world of revived Indian heritage games. Select a kingdom to open its cover.
        </p>
        <div className="library-stat-row" aria-label="Catalog summary">
          <span><strong>{GAME_CATALOG.length}</strong> game worlds</span>
          <span><strong>4</strong> reusable engines</span>
          <span><strong>{PLAYABLE_GAME_IDS.size}</strong> playable now</span>
        </div>
      </header>

      <nav className="library-filters" aria-label="Filter games">
        {FILTERS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={filter === item.id ? "active" : ""}
            aria-pressed={filter === item.id}
            onClick={() => setFilter(item.id)}
          >
            {item.label}
          </button>
        ))}
      </nav>

      <main className="game-library-grid" aria-live="polite">
        {visibleGames.map((game) => (
          <GameLibraryCard key={game.id} game={game} onSelect={() => onSelectGame(game.id)} />
        ))}
      </main>

      <footer className="library-footer">
        Heritage rules and modern tournament policies remain separately versioned for every release.
      </footer>
    </section>
  );
}

function GameLibraryCard({ game, onSelect }) {
  const playable = PLAYABLE_GAME_IDS.has(game.id);
  const practice = game.id === "nine-ice-forts";
  return (
    <button
      type="button"
      className={`game-library-card theme-${game.theme} ${playable ? "is-playable" : "is-planned"}`}
      onClick={onSelect}
      aria-label={`${playable ? "Play" : "Open cover for"} ${game.title}`}
    >
      <span className="game-card-art" aria-hidden="true">
        <span className="game-card-orbit orbit-one" />
        <span className="game-card-orbit orbit-two" />
        <span className="game-card-mark">{game.mark}</span>
      </span>
      <span className="game-card-copy">
        <span className="game-card-topline">
          <span className={`game-status status-${playable ? "playable" : game.statusKey}`}>{practice ? "PLAYABLE PRACTICE" : game.status}</span>
          <span className="game-priority">{game.priority === 0 ? "FLAGSHIP" : `#${game.priority}`}</span>
        </span>
        <strong className="game-card-title">{game.title}</strong>
        <span className="game-card-heritage">{game.heritage}</span>
        <span className="game-card-summary">{game.summary}</span>
        <span className="game-card-meta">
          <span>{game.players}</span>
          <span>{game.engine}</span>
        </span>
        <span className={`game-card-action ${playable ? "play" : "preview"}`}>
          {playable ? "Enter kingdom" : "View cover"}
          <span aria-hidden="true">→</span>
        </span>
      </span>
    </button>
  );
}
