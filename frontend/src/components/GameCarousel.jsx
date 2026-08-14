import { useEffect, useRef, useState } from "react";
import { GameBox } from "./GameBox.jsx";

export function GameCarousel({ games, selectedIndex, onSelectIndex, onPrevious, onNext }) {
  const [dragOffset, setDragOffset] = useState(0);
  const dragStartRef = useRef(null);

  const previousIndex = wrapIndex(selectedIndex - 1, games.length);
  const nextIndex = wrapIndex(selectedIndex + 1, games.length);
  const previousGame = games[previousIndex];
  const selectedGame = games[selectedIndex];
  const nextGame = games[nextIndex];

  useEffect(() => {
    setDragOffset(0);
  }, [selectedIndex]);

  function onPointerDown(event) {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    dragStartRef.current = { x: event.clientX, pointerId: event.pointerId };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }

  function onPointerMove(event) {
    if (!dragStartRef.current) return;
    const rawOffset = event.clientX - dragStartRef.current.x;
    setDragOffset(Math.max(-110, Math.min(110, rawOffset)));
  }

  function finishDrag(event) {
    if (!dragStartRef.current) return;
    const offset = event.clientX - dragStartRef.current.x;
    dragStartRef.current = null;
    setDragOffset(0);

    if (offset <= -48) onNext();
    if (offset >= 48) onPrevious();
  }

  return (
    <section className="game-carousel" aria-label="Browse the game collection">
      <button
        type="button"
        className="game-carousel__box-control game-carousel__box-control--previous"
        onClick={onPrevious}
        aria-label={`Previous game: ${previousGame.title}`}
      >
        <GameBox key={`previous-${previousGame.id}`} game={previousGame} position="previous" />
      </button>

      <div
        className="game-carousel__selected-stage"
        style={{ "--drag-offset": `${dragOffset}px` }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={finishDrag}
        onPointerCancel={finishDrag}
        onPointerLeave={(event) => {
          if (dragStartRef.current && event.buttons === 0) finishDrag(event);
        }}
      >
        <div className="game-carousel__drag-hint" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <GameBox key={`selected-${selectedGame.id}`} game={selectedGame} position="selected" priority />
      </div>

      <button
        type="button"
        className="game-carousel__box-control game-carousel__box-control--next"
        onClick={onNext}
        aria-label={`Next game: ${nextGame.title}`}
      >
        <GameBox key={`next-${nextGame.id}`} game={nextGame} position="next" />
      </button>

      <div className="game-carousel__sr-status" aria-live="polite">
        Selected {selectedGame.title}, game {selectedIndex + 1} of {games.length}.
      </div>
    </section>
  );
}

function wrapIndex(index, length) {
  return (index + length) % length;
}

export { wrapIndex };
