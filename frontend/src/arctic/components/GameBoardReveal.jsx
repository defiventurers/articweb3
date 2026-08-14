export function GameBoardReveal({ game, phase }) {
  return (
    <div className={`arctic-board-reveal phase-${phase} reveal-${game.revealConfig.board}`} aria-hidden="true">
      <span className="reveal-beam" />
      <span className="reveal-board">
        <span className="reveal-board-grid" />
        <span className="reveal-piece reveal-piece-one" />
        <span className="reveal-piece reveal-piece-two" />
        <span className="reveal-piece reveal-piece-three" />
      </span>
      <span className={`reveal-particles particles-${game.revealConfig.particles}`} />
    </div>
  );
}
