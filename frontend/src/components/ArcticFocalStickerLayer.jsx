import { useEffect, useRef, useState } from "react";

const focalStickerSets = {
  "arctic-dominion": {
    label: "Arctic Dominion focal character",
    items: [
      {
        src: "/assets/stickers/arctic-dominion/ruler-penguin.png",
        alt: "Arctic Dominion penguin ruler holding an ice-crystal scepter",
        className: "arctic-focal-sticker__art--ruler",
        layout: {
          x: "72%",
          y: "24%",
          size: "clamp(10rem, 17vw, 17rem)",
          rotate: "-4deg",
          mobileX: "81%",
          mobileY: "34%",
          mobileSize: "8.4rem",
        },
      },
    ],
  },
  "aurora-vulture": {
    label: "Aurora Vulture focal character",
    items: [
      {
        src: "/assets/stickers/aurora-vulture/aurora-vulture.png",
        alt: "Aurora vulture with wings spread and a star-shaped hunt marker",
        className: "arctic-focal-sticker__art--vulture",
        layout: {
          x: "28%",
          y: "22%",
          size: "clamp(16rem, 29vw, 28rem)",
          rotate: "-3deg",
          mobileX: "33%",
          mobileY: "23%",
          mobileSize: "12rem",
        },
      },
    ],
  },
  fishflow: {
    label: "Fishflow focal character and pieces",
    items: [
      {
        src: "/assets/stickers/fishflow/fisher-penguin-fish.png",
        alt: "Fishflow fisher penguin with silver, turquoise, and orange fish pieces",
        className: "arctic-focal-sticker__art--fishflow",
        layout: {
          x: "73%",
          y: "23%",
          size: "clamp(10rem, 17vw, 17rem)",
          rotate: "3deg",
          mobileX: "80%",
          mobileY: "35%",
          mobileSize: "8.4rem",
        },
      },
    ],
  },
  "ruma-ice-puzzle": {
    label: "Ruma Ice Puzzle focal character and pieces",
    items: [
      {
        src: "/assets/stickers/ruma-ice-puzzle/explorer-tiles.png",
        alt: "Ruma Ice Puzzle explorer penguin studying three crystalline puzzle tiles",
        className: "arctic-focal-sticker__art--ruma",
        layout: {
          x: "73%",
          y: "23%",
          size: "clamp(10rem, 17vw, 17rem)",
          rotate: "4deg",
          mobileX: "79%",
          mobileY: "34%",
          mobileSize: "8.5rem",
        },
      },
    ],
  },
  "aurora-ganjifa-academy": {
    label: "Aurora Ganjifa Academy focal character and cards",
    items: [
      {
        src: "/assets/stickers/aurora-ganjifa-academy/scholar-cards.png",
        alt: "Aurora Ganjifa Academy scholar penguin with three ornate circular cards",
        className: "arctic-focal-sticker__art--ganjifa",
        layout: {
          x: "28%",
          y: "22%",
          size: "clamp(10rem, 17vw, 17rem)",
          rotate: "-3deg",
          mobileX: "23%",
          mobileY: "34%",
          mobileSize: "8.5rem",
        },
      },
    ],
  },
};

function layoutStyle(layout, index) {
  return {
    "--sticker-x": layout.x,
    "--sticker-y": layout.y,
    "--sticker-size": layout.size,
    "--sticker-rotate": layout.rotate,
    "--sticker-mobile-x": layout.mobileX,
    "--sticker-mobile-y": layout.mobileY,
    "--sticker-mobile-size": layout.mobileSize,
    "--sticker-delay": `${index * 48}ms`,
  };
}

function StickerSet({ gameId, phase, direction, reducedMotion }) {
  const set = focalStickerSets[gameId];
  if (!set) return null;

  return (
    <div
      className={`arctic-focal-sticker-set arctic-focal-sticker-set--${phase}`}
      data-game={gameId}
      data-direction={direction > 0 ? "forward" : "backward"}
      aria-label={set.label}
    >
      {set.items.map((item, index) => (
        <div
          className={`arctic-focal-sticker__art ${item.className || ""}`}
          key={item.src}
          style={layoutStyle(item.layout, index)}
          data-reduced-motion={reducedMotion ? "true" : "false"}
        >
          <img src={item.src} alt={item.alt} draggable="false" />
        </div>
      ))}
    </div>
  );
}

export function ArcticFocalStickerLayer({ gameId, selectedIndex, totalGames, reducedMotion = false }) {
  const [activeId, setActiveId] = useState(gameId);
  const [outgoingId, setOutgoingId] = useState(null);
  const [settled, setSettled] = useState(reducedMotion);
  const directionRef = useRef(1);
  const previousIndexRef = useRef(selectedIndex);
  const timeoutRef = useRef(null);

  useEffect(() => {
    const rawDelta = selectedIndex - previousIndexRef.current;
    if (rawDelta !== 0) {
      const wrappedDelta = Math.abs(rawDelta) > totalGames / 2 ? -rawDelta : rawDelta;
      directionRef.current = wrappedDelta >= 0 ? 1 : -1;
    }
    previousIndexRef.current = selectedIndex;
  }, [selectedIndex, totalGames]);

  useEffect(() => {
    if (gameId === activeId) return undefined;

    setOutgoingId(activeId);
    setActiveId(gameId);
    setSettled(false);
    window.cancelAnimationFrame?.(timeoutRef.current);
    window.clearTimeout(timeoutRef.current);

    const settleFrame = window.requestAnimationFrame(() => setSettled(true));
    timeoutRef.current = window.setTimeout(() => setOutgoingId(null), reducedMotion ? 120 : 620);

    return () => {
      window.cancelAnimationFrame?.(settleFrame);
      window.clearTimeout(timeoutRef.current);
    };
  }, [activeId, gameId, reducedMotion]);

  useEffect(() => () => window.clearTimeout(timeoutRef.current), []);

  useEffect(() => {
    if (activeId !== gameId || settled) return undefined;
    const frame = window.requestAnimationFrame(() => setSettled(true));
    return () => window.cancelAnimationFrame(frame);
  }, [activeId, gameId, settled]);

  if (!focalStickerSets[activeId] && !focalStickerSets[outgoingId]) return null;

  return (
    <div className="arctic-focal-sticker-layer" aria-hidden="false">
      {outgoingId && (
        <StickerSet
          gameId={outgoingId}
          phase="exiting"
          direction={directionRef.current}
          reducedMotion={reducedMotion}
        />
      )}
      <StickerSet
        gameId={activeId}
        phase={settled ? "settled" : "entering"}
        direction={directionRef.current}
        reducedMotion={reducedMotion}
      />
    </div>
  );
}

export default ArcticFocalStickerLayer;
