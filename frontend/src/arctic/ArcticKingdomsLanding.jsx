import { useEffect, useRef, useState } from "react";
import { soundManager } from "../utils/soundManager.js";
import { ARCTIC_GAME_REGISTRY, getArcticWorldGame } from "./arcticGameRegistry.js";
import { CollectionMode } from "./components/CollectionMode.jsx";
import { GameBoxOpening } from "./components/GameBoxOpening.jsx";
import { GameWorld } from "./components/GameWorld.jsx";
import { useReducedMotion } from "./hooks/useReducedMotion.js";
import { useWorldExploration } from "./hooks/useWorldExploration.js";

const OPENING_STEPS = [
  { phase: "focus", duration: 500 },
  { phase: "open", duration: 900 },
  { phase: "reveal", duration: 950 },
  { phase: "handoff", duration: 520 }
];

export function ArcticKingdomsLanding({ onSelectGame }) {
  const [focusedGameId, setFocusedGameId] = useState("arctic-dominion");
  const [opening, setOpening] = useState(null);
  const [collectionOpen, setCollectionOpen] = useState(false);
  const openingTimer = useRef(null);
  const reducedMotion = useReducedMotion();
  const exploration = useWorldExploration({ disabled: Boolean(opening) || reducedMotion });
  const focusedGame = getArcticWorldGame(focusedGameId) || ARCTIC_GAME_REGISTRY[0];
  const openingGame = opening ? getArcticWorldGame(opening.gameId) : null;

  useEffect(() => () => window.clearTimeout(openingTimer.current), []);

  useEffect(() => {
    if (!opening) return undefined;
    const currentIndex = OPENING_STEPS.findIndex((step) => step.phase === opening.phase);
    const currentStep = OPENING_STEPS[currentIndex];
    const nextStep = OPENING_STEPS[currentIndex + 1];

    openingTimer.current = window.setTimeout(() => {
      if (nextStep) {
        if (nextStep.phase === "open") soundManager.play("uiConfirm", { cooldownMs: 0, volume: 0.55 });
        if (nextStep.phase === "reveal") soundManager.play("pieceSelect", { cooldownMs: 0, volume: 0.68 });
        setOpening((value) => value ? { ...value, phase: nextStep.phase } : value);
        return;
      }
      const selectedId = opening.gameId;
      setOpening(null);
      onSelectGame(selectedId);
    }, reducedMotion ? Math.min(280, currentStep.duration) : currentStep.duration);

    return () => window.clearTimeout(openingTimer.current);
  }, [opening, onSelectGame, reducedMotion]);

  function focusGame(gameId) {
    if (opening) return;
    setFocusedGameId(gameId);
  }

  function openGame(gameId) {
    if (opening) return;
    const game = getArcticWorldGame(gameId);
    if (!game) return;
    soundManager.unlock();
    soundManager.play("uiTap", { cooldownMs: 0, volume: 0.5 });
    setFocusedGameId(gameId);
    setCollectionOpen(false);
    setOpening({ gameId, phase: "focus" });
  }

  function cancelOpening() {
    window.clearTimeout(openingTimer.current);
    setOpening(null);
  }

  return (
    <main className={`arctic-kingdoms ${reducedMotion ? "reduce-motion" : ""} ${opening ? "is-opening" : ""}`}>
      <GameWorld
        games={ARCTIC_GAME_REGISTRY}
        focusedGameId={focusedGameId}
        openingGameId={opening?.gameId || null}
        onFocusGame={focusGame}
        onOpenGame={openGame}
        explorationStyle={exploration.style}
        reducedMotion={reducedMotion}
      />

      {!opening && (
        <>
          <header className="kingdoms-brand">
            <p>ARCTIC GAME KINGDOMS</p>
            <span>A living frozen collection of heritage board games</span>
          </header>
          <div className="kingdoms-world-guide" aria-live="polite">
            <span>{exploration.isTouch ? "Tap a game box to explore" : "Move through the kingdom. Choose a game box to open it."}</span>
          </div>
          <section className={`kingdoms-game-focus theme-${focusedGame.theme}`} aria-label={`Selected game: ${focusedGame.title}`}>
            <span className="focus-status">{focusedGame.available ? "PLAYABLE" : "COMING SOON"}</span>
            <h1>{focusedGame.title}</h1>
            <p>{focusedGame.summary}</p>
            <div className="focus-meta"><span>{focusedGame.players}</span><span>{focusedGame.engine}</span></div>
            <button type="button" className="focus-enter" onClick={() => openGame(focusedGame.gameId)}>
              {focusedGame.available ? "Open game box" : "Discover game box"}
            </button>
          </section>
          <div className="kingdoms-actions">
            <button type="button" onClick={() => setCollectionOpen(true)}>Collection <span>21</span></button>
            <span className="kingdoms-network">World online</span>
          </div>
        </>
      )}

      {collectionOpen && !opening && (
        <CollectionMode
          games={ARCTIC_GAME_REGISTRY}
          focusedGameId={focusedGameId}
          onFocusGame={focusGame}
          onOpenGame={openGame}
          onClose={() => setCollectionOpen(false)}
        />
      )}

      {openingGame && <GameBoxOpening game={openingGame} phase={opening.phase} onCancel={cancelOpening} />}
    </main>
  );
}
