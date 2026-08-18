import { useCallback, useEffect, useRef, useState } from "react";
import { GameCarousel, wrapIndex } from "../components/GameCarousel.jsx";
import { GameCollectionStrip } from "../components/GameCollectionStrip.jsx";
import { GameEnvironment } from "../components/GameEnvironment.jsx";
import { GameInfo } from "../components/GameInfo.jsx";
import { GameNavigation } from "../components/GameNavigation.jsx";
import { GAME_CATALOG } from "../data/gameCatalog.js";

export function GameLibraryScreen({ onSelectGame }) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const wheelLockRef = useRef(false);
  const selectedGame = GAME_CATALOG[selectedIndex];
  const previousGame = GAME_CATALOG[wrapIndex(selectedIndex - 1, GAME_CATALOG.length)];
  const nextGame = GAME_CATALOG[wrapIndex(selectedIndex + 1, GAME_CATALOG.length)];

  const selectIndex = useCallback((index) => {
    setSelectedIndex(wrapIndex(index, GAME_CATALOG.length));
  }, []);

  const selectPrevious = useCallback(() => {
    setSelectedIndex((index) => wrapIndex(index - 1, GAME_CATALOG.length));
  }, []);

  const selectNext = useCallback(() => {
    setSelectedIndex((index) => wrapIndex(index + 1, GAME_CATALOG.length));
  }, []);

  useEffect(() => {
    function onKeyDown(event) {
      const tagName = event.target?.tagName;
      if (tagName === "INPUT" || tagName === "TEXTAREA" || tagName === "SELECT") return;
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        selectPrevious();
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        selectNext();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectNext, selectPrevious]);

  function onWheel(event) {
    if (wheelLockRef.current || Math.abs(event.deltaY) < 12) return;
    wheelLockRef.current = true;
    window.setTimeout(() => { wheelLockRef.current = false; }, 260);
    if (event.deltaY > 0) selectNext();
    if (event.deltaY < 0) selectPrevious();
  }

  return (
    <main className={`arctic-game-world theme-${selectedGame.theme}`} onWheel={onWheel}>
      <GameEnvironment theme={selectedGame.theme} />

      <header className="arctic-game-world__masthead">
        <a className="arctic-game-world__wordmark" href="/" aria-label="Arctic Dominion home">
          <span>THE FROZEN ARCHIVE</span>
          <strong>ARCTIC DOMINION</strong>
        </a>
        <div className="arctic-game-world__masthead-meta">
          <span>21 PRESERVED KINGDOMS</span>
          <p className="arctic-game-world__instruction">DRAG · SCROLL · ARROW KEYS</p>
        </div>
      </header>

      <div className="arctic-game-world__content">
        <GameInfo
          game={selectedGame}
          index={selectedIndex}
          total={GAME_CATALOG.length}
          onEnter={() => onSelectGame(selectedGame.id)}
        />

        <GameCarousel
          games={GAME_CATALOG}
          selectedIndex={selectedIndex}
          onSelectIndex={selectIndex}
          onPrevious={selectPrevious}
          onNext={selectNext}
        />

        <GameNavigation
          previousGame={previousGame}
          nextGame={nextGame}
          onPrevious={selectPrevious}
          onNext={selectNext}
        />
      </div>

      <GameCollectionStrip
        games={GAME_CATALOG}
        selectedIndex={selectedIndex}
        onSelectIndex={selectIndex}
      />
    </main>
  );
}
