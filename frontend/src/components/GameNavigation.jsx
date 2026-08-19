export function GameNavigation({ onPrevious, onNext, previousGame, nextGame }) {
  return (
    <nav className="game-navigation" aria-label="Game navigation">
      <button
        className="game-navigation__button game-navigation__button--previous"
        type="button"
        onClick={onPrevious}
        aria-label={`Previous game: ${previousGame.title}`}
      >
        <span className="game-navigation__ice-object" aria-hidden="true">
          <svg className="game-navigation__ice-glyph" viewBox="0 0 64 64" focusable="false">
            <path className="game-navigation__ice-outline" d="M32 3 43 17 58 22 48 34 51 51 34 47 22 59 17 43 3 32 17 21 21 5 34 17Z" />
            <path className="game-navigation__ice-cut" d="m32 11 6 16 15 5-14 5-7 16-6-16-15-5 14-5Z" />
            <path className="game-navigation__ice-arrow" d="M28 21 17 32 28 43M18 32H46" />
          </svg>
        </span>
        <span className="game-navigation__label">PREVIOUS</span>
      </button>
      <button
        className="game-navigation__button game-navigation__button--next"
        type="button"
        onClick={onNext}
        aria-label={`Next game: ${nextGame.title}`}
      >
        <span className="game-navigation__label">NEXT</span>
        <span className="game-navigation__ice-object" aria-hidden="true">
          <svg className="game-navigation__ice-glyph" viewBox="0 0 64 64" focusable="false">
            <path className="game-navigation__ice-outline" d="M32 3 43 17 58 22 48 34 51 51 34 47 22 59 17 43 3 32 17 21 21 5 34 17Z" />
            <path className="game-navigation__ice-cut" d="m32 11 6 16 15 5-14 5-7 16-6-16-15-5 14-5Z" />
            <path className="game-navigation__ice-arrow" d="M36 21 47 32 36 43M46 32H18" />
          </svg>
        </span>
      </button>
    </nav>
  );
}

