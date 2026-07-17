import { useEffect, useMemo, useRef, useState } from "react";
import { toWebpPath } from "./OptimizedImage.jsx";

const REMOTE_PIECE_ASSET_BASE =
  "https://raw.githubusercontent.com/defiventurers/chaturanga-game/36d8ee9ae33fa08a21ba3d644b6053b9e13273e4/public/assets/arctic/pieces";

const DESKTOP_MEDIA = "(min-width: 900px) and (orientation: landscape)";

const SCREEN_ASSETS = [
  "/assets/screens/cover.webp",
  "/assets/screens/main-menu.webp",
  "/assets/screens/profile.webp",
  "/assets/screens/playerhub.webp",
  "/assets/screens/openicehub.webp",
  "/assets/screens/team-select.webp",
  "/assets/screens/arctic-dominion-game-base.webp"
];

const DESKTOP_SCREEN_ASSETS = [
  "/assets/screens/cover-desktop.png",
  "/assets/screens/main-menu-desktop.png",
  "/assets/screens/profile-desktop.png",
  "/assets/screens/playerhub-desktop.png",
  "/assets/screens/openicehub-desktop.png",
  "/assets/screens/openice-createroom-desktop.png",
  "/assets/screens/join-room-desktop.png",
  "/assets/screens/arctic-dominion-game-base-desktop.png"
];

const PIECE_COLORS = ["red", "blue", "green", "pink"];
const PIECE_TYPES = ["snow-guard", "icebreaker", "war-mammoth", "aurora-unicorn", "frost-king"];
const PIECE_ASSETS = PIECE_COLORS.flatMap((color) => PIECE_TYPES.map((piece) => `${REMOTE_PIECE_ASSET_BASE}/${color}-${piece}.png`));

const SECONDARY_ASSETS = [
  "/assets/how-to-play/retsba-kingdom.webp",
  "/assets/how-to-play/pengu-kingdom.webp",
  "/assets/how-to-play/abster-kingdom.webp",
  "/assets/how-to-play/polly-kingdom.webp",
  "/assets/how-to-play/dominion-pieces-roster.webp"
];

const STATUS_LINES = [
  "Opening the frozen gates...",
  "Summoning penguin kingdoms...",
  "Carving the ice battlefield...",
  "Preparing Dominion Dice...",
  "Caching battle pieces...",
  "Finalizing Arctic Dominion..."
];

const MIN_VISIBLE_MS = 850;
const ASSET_TIMEOUT_MS = 12000;
const PRELOAD_CACHE = new Map();

export function FrostLoadingScreen({ onReady }) {
  const [loaded, setLoaded] = useState(0);
  const [failed, setFailed] = useState(0);
  const [phase, setPhase] = useState(STATUS_LINES[0]);
  const readyCalled = useRef(false);
  const criticalAssets = useMemo(() => getCriticalAssets(), []);

  const total = criticalAssets.length;
  const percent = Math.min(100, Math.round((loaded / total) * 100));

  useEffect(() => {
    let cancelled = false;
    const startedAt = Date.now();

    async function runPreload() {
      const results = await Promise.all(
        criticalAssets.map((src, index) => preloadImage(src).then((result) => {
          if (cancelled) return result;
          setLoaded((current) => Math.min(total, current + 1));
          if (result.status !== "loaded") setFailed((current) => current + 1);
          setPhase(STATUS_LINES[Math.min(STATUS_LINES.length - 1, Math.floor(((index + 1) / total) * STATUS_LINES.length))]);
          return result;
        }))
      );

      if (cancelled) return;

      const remainingMs = Math.max(0, MIN_VISIBLE_MS - (Date.now() - startedAt));
      window.setTimeout(() => {
        if (cancelled || readyCalled.current) return;
        readyCalled.current = true;
        window.__ARCTIC_PRELOAD_REPORT__ = results;
        warmSecondaryAssets();
        onReady?.();
      }, remainingMs);
    }

    runPreload();

    return () => {
      cancelled = true;
    };
  }, [onReady, total, criticalAssets]);

  const detailLine = useMemo(() => {
    if (percent >= 100) return failed ? "Frost Gate ready. Some fallback assets will retry when needed." : "Frost Gate ready.";
    if (percent >= 72) return "Final checks before entering the kingdom.";
    if (percent >= 44) return "Loading board art and piece icons.";
    return "First visit may take longer while assets are cached.";
  }, [failed, percent]);

  return (
    <section className="frost-loader-screen" aria-label="Loading Arctic Dominion">
      <div className="frost-loader-card">
        <div className="frost-loader-sigil" aria-hidden="true">
          <span>👑</span>
          <i />
        </div>

        <div className="frost-loader-title">
          <p>Frost Gate</p>
          <h1>Arctic Dominion</h1>
        </div>

        <div className="frost-loader-copy" aria-live="polite">
          <strong>{phase}</strong>
          <span>{detailLine}</span>
        </div>

        <div className="frost-loader-progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow={percent}>
          <span style={{ width: `${percent}%` }} />
        </div>

        <div className="frost-loader-foot">
          <strong>{percent}%</strong>
          <span>{loaded}/{total} assets</span>
        </div>
      </div>
    </section>
  );
}

export function FrostRouteLoader({ label = "Loading frost chamber..." }) {
  return (
    <section className="frost-route-loader" aria-label={label}>
      <div className="frost-route-loader-card">
        <span aria-hidden="true">❄️</span>
        <strong>{label}</strong>
      </div>
    </section>
  );
}

export function warmSecondaryAssets() {
  runWhenIdle(() => {
    SECONDARY_ASSETS.forEach((src) => preloadImage(src));
  });
}

export function warmGameAssets() {
  runWhenIdle(() => {
    getGameWarmAssets().forEach((src) => preloadImage(src));
  });
}

export function warmHowToPlayAssets() {
  runWhenIdle(() => {
    SECONDARY_ASSETS.forEach((src) => preloadImage(src));
  });
}

function getCriticalAssets() {
  const assets = [...SCREEN_ASSETS, ...PIECE_ASSETS];
  if (isDesktopLandscape()) assets.push(...DESKTOP_SCREEN_ASSETS);
  return assets;
}

function getGameWarmAssets() {
  const assets = ["/assets/screens/arctic-dominion-game-base.webp", ...PIECE_ASSETS];
  if (isDesktopLandscape()) assets.unshift("/assets/screens/arctic-dominion-game-base-desktop.png");
  return assets;
}

function isDesktopLandscape() {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia(DESKTOP_MEDIA).matches;
}

function preloadImage(src) {
  if (PRELOAD_CACHE.has(src)) return PRELOAD_CACHE.get(src);

  const task = new Promise((resolve) => {
    const image = new Image();
    let settled = false;

    const finish = (status) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      resolve({ src, status });
    };

    const timer = window.setTimeout(() => finish("timeout"), ASSET_TIMEOUT_MS);

    image.onload = () => {
      if (image.decode) {
        image.decode().then(() => finish("loaded")).catch(() => finish("loaded"));
      } else {
        finish("loaded");
      }
    };

    image.onerror = () => {
      const fallback = src.endsWith(".webp") ? src.replace(/\.webp$/i, ".png") : toWebpPath(src);
      if (fallback && fallback !== src && !PRELOAD_CACHE.has(fallback)) {
        preloadImage(fallback).then(resolve);
      } else {
        finish("failed");
      }
    };
    image.src = src;
  });

  PRELOAD_CACHE.set(src, task);
  return task;
}

function runWhenIdle(callback) {
  if (typeof window === "undefined") return;
  if ("requestIdleCallback" in window) {
    window.requestIdleCallback(callback, { timeout: 2200 });
    return;
  }
  window.setTimeout(callback, 600);
}
