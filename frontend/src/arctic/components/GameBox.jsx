export function GameBox({ game, isFocused, isOpening, onFocus, onOpen }) {
  const artworkStyle = game.frontArtwork ? { backgroundImage: `url(${game.frontArtwork})` } : undefined;
  const sideArtworkStyle = game.sideArtwork ? { backgroundImage: `url(${game.sideArtwork})` } : undefined;
  const topArtworkStyle = game.topArtwork ? { backgroundImage: `url(${game.topArtwork})` } : undefined;
  const playable = Boolean(game.available);
  const statusLabel = playable ? "PLAY" : "COMING SOON";

  return (
    <button
      type="button"
      className={`arctic-game-box theme-${game.theme} ${isFocused ? "is-focused" : ""} ${isOpening ? "is-opening" : ""} ${playable ? "is-playable" : "is-coming-soon"}`}
      style={{
        "--box-x": `${game.position.x}%`,
        "--box-y": `${game.position.y}%`,
        "--box-depth": game.position.depth,
        "--box-rotation": `${game.rotation}deg`,
        "--box-scale": game.scale,
        "--reveal-accent": game.revealConfig.accent
      }}
      aria-label={`${game.title}. ${statusLabel}. ${game.summary}`}
      aria-pressed={isFocused}
      data-game-id={game.gameId}
      onMouseEnter={() => onFocus(game.gameId)}
      onFocus={() => onFocus(game.gameId)}
      onClick={() => onOpen(game.gameId)}
    >
      <span className="box-snow-cap" aria-hidden="true" />
      <span className="box-shadow" aria-hidden="true" />
      <span className="box-object" aria-hidden="true">
        <span className="box-lid">
          <span className="box-face box-top" style={topArtworkStyle}>
            {!game.topArtwork && <span className="box-top-mark">{game.mark}</span>}
          </span>
          <span className="box-face box-front" style={artworkStyle}>
            {!game.frontArtwork && (
              <span className="box-placeholder-copy">
                <small>{game.heritage}</small>
                <strong>{game.title}</strong>
                <i>{game.mark}</i>
              </span>
            )}
          </span>
          <span className="box-face box-side" style={sideArtworkStyle}>
            {!game.sideArtwork && <span>{game.mark}</span>}
          </span>
        </span>
        <span className="box-base">
          <span className="box-base-front" />
          <span className="box-base-side" />
        </span>
        <span className="box-latch latch-left" />
        <span className="box-latch latch-right" />
        <span className="box-interior">
          <span className="box-interior-glow" />
          <span className={`box-board board-${game.revealConfig.board}`} />
        </span>
      </span>
      <span className="box-world-label">
        <span className="box-world-status">{statusLabel}</span>
        <strong>{game.title}</strong>
        <small>{game.landmark}</small>
      </span>
    </button>
  );
}
