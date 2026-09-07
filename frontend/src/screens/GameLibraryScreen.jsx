import { useCallback, useEffect, useRef, useState } from "react";
import { GameCarousel, wrapIndex } from "../components/GameCarousel.jsx";
import { ArcticWebGLArchive } from "../components/ArcticWebGLArchive.jsx";
import { ArcticFocalStickerLayer } from "../components/ArcticFocalStickerLayer.jsx";
import { GameCollectionStrip } from "../components/GameCollectionStrip.jsx";
import { GameEnvironment } from "../components/GameEnvironment.jsx";
import { GameInfo } from "../components/GameInfo.jsx";
import { GameNavigation } from "../components/GameNavigation.jsx";
import { LANDING_GAME_CATALOG, RACE_SOWING_GAME_CATALOG } from "../data/gameCatalog.js";

export function GameLibraryScreen({ onSelectGame }) {
  const params = new URLSearchParams(window.location.search);
  const isRaceSowingArchive = params.get("collection") === "race-sowing";
  const games = isRaceSowingArchive ? RACE_SOWING_GAME_CATALOG : LANDING_GAME_CATALOG;
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [webglReady, setWebglReady] = useState(null);
  const [reducedMotion, setReducedMotion] = useState(false);
  const wheelLockRef = useRef(false);
  const selectedGame = games[selectedIndex];
  const previousGame = games[wrapIndex(selectedIndex - 1, games.length)];
  const nextGame = games[wrapIndex(selectedIndex + 1, games.length)];
  const archiveHref = isRaceSowingArchive ? "?" : "?collection=race-sowing";
  const archiveLinkLabel = isRaceSowingArchive ? "← MAIN STRATEGY ARCHIVE" : "RACE & SOWING ARCHIVE →";
  const archiveEyebrow = isRaceSowingArchive ? "RACE & SOWING ARCHIVE" : "THE FROZEN ARCHIVE";
  const archiveTitle = isRaceSowingArchive ? "ROUTES & RELAYS" : "ARCTIC DOMINION";
  const archiveCountLabel = isRaceSowingArchive ? "RACE / SOWING TABLES" : "PRESERVED KINGDOMS";
  const webglAvailable = webglReady !== false;

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
    setSelectedIndex(wrapIndex(index, games.length));
  }, [games.length]);

  const selectPrevious = useCallback(() => {
    setSelectedIndex((index) => wrapIndex(index - 1, games.length));
  }, [games.length]);

  const selectNext = useCallback(() => {
    setSelectedIndex((index) => wrapIndex(index + 1, games.length));
  }, [games.length]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [isRaceSowingArchive]);

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
    <main className={`arctic-game-world theme-${selectedGame.theme} ${selectedGame.id !== "arctic-dominion" ? "heritage-library-selection" : ""} ${webglAvailable ? "arctic-game-world--webgl" : ""}`} onWheel={onWheel}>
      {!webglAvailable && <GameEnvironment theme={selectedGame.theme} />}
      {webglAvailable && (
        <ArcticWebGLArchive
          games={games}
          selectedIndex={selectedIndex}
          onSelectIndex={selectIndex}
          onReady={handleWebglReady}
          reducedMotion={reducedMotion}
        />
      )}

      {webglAvailable && (
        <ArcticFocalStickerLayer
          gameId={selectedGame.id}
          selectedIndex={selectedIndex}
          totalGames={games.length}
          reducedMotion={reducedMotion}
        />
      )}

      <header className="arctic-game-world__masthead">
        <a className="arctic-game-world__wordmark" href={isRaceSowingArchive ? "?" : "/"} aria-label={isRaceSowingArchive ? "Return to main Arctic Dominion archive" : "Arctic Dominion home"}>
          <span>{archiveEyebrow}</span>
          <strong>{archiveTitle}</strong>
        </a>
        <div className="arctic-game-world__masthead-meta">
          <span>{games.length} {archiveCountLabel}</span>
          <a
            href={archiveHref}
            style={{ color: "var(--accent)", textDecoration: "none", letterSpacing: ".11em" }}
          >
            {archiveLinkLabel}
          </a>
          <p className="arctic-game-world__instruction">DRAG · SCROLL · ARROW KEYS</p>
        </div>
      </header>

      <div className="arctic-game-world__content">
        <GameInfo
          game={selectedGame}
          index={selectedIndex}
          total={games.length}
          onEnter={() => onSelectGame(selectedGame.id)}
        />

        {!webglAvailable && (
          <GameCarousel
            games={games}
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
        games={games}
        selectedIndex={selectedIndex}
        onSelectIndex={selectIndex}
      />
    </main>
  );
}
