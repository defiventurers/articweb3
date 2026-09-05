import { useCallback, useEffect, useRef, useState } from "react";
import { GameCarousel, wrapIndex } from "../components/GameCarousel.jsx";
import { ArcticWebGLArchive } from "../components/ArcticWebGLArchive.jsx";
import { ArcticFocalStickerLayer } from "../components/ArcticFocalStickerLayer.jsx";
import { GameCollectionStrip } from "../components/GameCollectionStrip.jsx";
import { GameEnvironment } from "../components/GameEnvironment.jsx";
import { GameInfo } from "../components/GameInfo.jsx";
import { GameNavigation } from "../components/GameNavigation.jsx";
import { LANDING_GAME_CATALOG } from "../data/gameCatalog.js";

export function GameLibraryScreen({ onSelectGame }) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [webglReady, setWebglReady] = useState(null);
  const [reducedMotion, setReducedMotion] = useState(false);
  const wheelLockRef = useRef(false);
  const selectedGame = LANDING_GAME_CATALOG[selectedIndex];
  const previousGame = LANDING_GAME_CATALOG[wrapIndex(selectedIndex - 1, LANDING_GAME_CATALOG.length)];
  const nextGame = LANDING_GAME_CATALOG[wrapIndex(selectedIndex + 1, LANDING_GAME_CATALOG.length)];

  const handleWebglReady = useCallback((ready) => {
    setWebglReady(ready);
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!mediaQuery) return undefined;
    const updateMotion = () => setReducedMotion(mediaQuery.matches);
    updateMotion();
    mediaQuery.addEventListener?.("change", updateMotion);
    return () => mediaQuery.removeEventListener?.("change", updateMotion);
  }, []);

  const selectIndex = useCallback((index) => {
    setSelectedIndex(wrapIndex(index, LANDING_GAME_CATALOG.length));
  }, []);

  const selectPrevious = useCallback(() => {
    setSelectedIndex((index) => wrapIndex(index - 1, LANDING_GAME_CATALOG.length));
  }, []);

  const selectNext = useCallback(() => {
    setSelectedIndex((index) => wrapIndex(index + 1, LANDING_GAME_CATALOG.length));
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
    <main className={`arctic-game-world theme-${selectedGame.theme} ${selectedGame.id !== "arctic-dominion" ? "heritage-library-selection" : ""} ${webglReady === true ? "arctic-game-world--webgl" : ""}`} onWheel={onWheel}>
      {webglReady !== true && <GameEnvironment theme={selectedGame.theme} />}
      {webglReady !== false && (
        <ArcticWebGLArchive
          games={LANDING_GAME_CATALOG}
          selectedIndex={selectedIndex}
          onSelectIndex={selectIndex}
          onReady={handleWebglReady}
          reducedMotion={reducedMotion}
        />
      )}

      {webglReady === true && (
        <ArcticFocalStickerLayer
          gameId={selectedGame.id}
          selectedIndex={selectedIndex}
          totalGames={LANDING_GAME_CATALOG.length}
          reducedMotion={reducedMotion}
        />
      )}

      <header className="arctic-game-world__masthead">
        <a className="arctic-game-world__wordmark" href="/" aria-label="Arctic Dominion home">
          <span>THE FROZEN ARCHIVE</span>
          <strong>ARCTIC DOMINION</strong>
        </a>
        <div className="arctic-game-world__masthead-meta">
          <span>{LANDING_GAME_CATALOG.length} PRESERVED KINGDOMS</span>
          <p className="arctic-game-world__instruction">DRAG · SCROLL · ARROW KEYS</p>
        </div>
      </header>

      <div className="arctic-game-world__content">
        <GameInfo
          game={selectedGame}
          index={selectedIndex}
          total={LANDING_GAME_CATALOG.length}
          onEnter={() => onSelectGame(selectedGame.id)}
        />

        {webglReady === false && (
          <GameCarousel
            games={LANDING_GAME_CATALOG}
            selectedIndex={selectedIndex}
            onSelectIndex={selectIndex}
            onPrevious={selectPrevious}
            onNext={selectNext}
          />
        )}

        <GameNavigation
          previousGame={previousGame}
          nextGame={nextGame}
          onPrevious={selectPrevious}
          onNext={selectNext}
        />
      </div>

      <GameCollectionStrip
        games={LANDING_GAME_CATALOG}
        selectedIndex={selectedIndex}
        onSelectIndex={selectIndex}
      />
    </main>
  );
}
