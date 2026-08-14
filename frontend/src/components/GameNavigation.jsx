export function GameNavigation({ previousGame, nextGame, onPrevious, onNext }) {
  return (
    <nav className="game-navigation" aria-label="Game navigation">
      <button type="button" onClick={onPrevious} aria-label={`Previous game: ${previousGame.title}`}>
        <span aria-hidden="true">←</span>
        <span className="game-navigation__label">PREVIOUS</span>
      </button>
      <button type="button" onClick={onNext} aria-label={`Next game: ${nextGame.title}`}>
        <span className="game-navigation__label">NEXT</span>
        <span aria-hidden="true">→</span>
      </button>
    </nav>
  );
}
