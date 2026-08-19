import { useEffect, useMemo, useRef, useState } from "react";
import PUBLIC_ASSETS from "virtual:arctic-public-assets";
import { GAME_CATALOG } from "../data/gameCatalog.js";

const DESKTOP_MEDIA = "(min-width: 900px) and (orientation: landscape)";
const LANDING_BACKGROUND_ASSET = "/assets/arctic-dominion-citadel-final-1658x949.png";
const LANDING_COVER_ASSETS = GAME_CATALOG.map(
  (game) => `/assets/games/${game.id}/front.webp?v=front-1`
);
const LANDING_STICKER_ASSETS = [
  "/assets/stickers/arctic-dominion/ruler-penguin.png",
  "/assets/stickers/aurora-vulture/aurora-vulture.png",
  "/assets/stickers/fishflow/fisher-penguin-fish.png",
  "/assets/stickers/ruma-ice-puzzle/explorer-tiles.png",
  "/assets/stickers/aurora-ganjifa-academy/scholar-cards.png"
];
const LANDING_AMBIENT_ASSETS = [
  "/assets/artic/pieces/blue-icebreaker.webp",
  "/assets/artic/pieces/red-snow-guard.webp",
  "/assets/artic/pieces/green-frost-king.webp",
  "/assets/artic/pieces/pink-aurora-unicorn.webp"
];
const LANDING_CRITICAL_ASSETS = [
  LANDING_BACKGROUND_ASSET,
  ...LANDING_COVER_ASSETS,
  ...LANDING_STICKER_ASSETS,
  ...LANDING_AMBIENT_ASSETS
];
const LANDING_CRITICAL_ASSET_PATHS = new Set(
  LANDING_CRITICAL_ASSETS.map((src) => src.split("?", 1)[0])
);

const STATUS_LINES = [
  "Opening the frozen gates...",
  "Summoning penguin kingdoms...",
  "Loading the Dominion archive...",
  "Preparing game covers and focal art...",
  "Warming the Arctic stage...",
  "Finalizing Arctic Dominion..."
];

const IMAGE_EXTENSIONS = new Set(["avif", "bmp", "gif", "jpeg", "jpg", "png", "svg", "webp"]);
const AUDIO_EXTENSIONS = new Set(["aac", "flac", "m4a", "mp3", "ogg", "wav", "webm"]);
const MIN_VISIBLE_MS = 850;
const ASSET_TIMEOUT_MS = 15000;
const PRELOAD_CONCURRENCY = 6;
const PRELOAD_CACHE = new Map();
const PRELOADED_IMAGE_CACHE = new Map();

export function getPreloadedImage(src) {
  return PRELOADED_IMAGE_CACHE.get(src) || null;
}

export function FrostLoadingScreen({ onReady }) {
  const [loaded, setLoaded] = useState(0);
  const [failed, setFailed] = useState(0);
  const [phase, setPhase] = useState(STATUS_LINES[0]);
  const readyCalled = useRef(false);
  const criticalAssets = useMemo(() => getCriticalAssets(), []);

  const total = criticalAssets.length || 1;
  const percent = Math.min(100, Math.round((loaded / total) * 100));

  useEffect(() => {
    let cancelled = false;
    const startedAt = Date.now();

    async function runPreload() {
      const results = await preloadWithConcurrency(
        criticalAssets,
        PRELOAD_CONCURRENCY,
        (result, completed) => {
          if (cancelled) return;
          setLoaded(completed);
          if (result.status !== "loaded") setFailed((current) => current + 1);
          setPhase(
            STATUS_LINES[
              Math.min(
                STATUS_LINES.length - 1,
                Math.floor((completed / Math.max(1, criticalAssets.length)) * STATUS_LINES.length)
              )
            ]
          );
        }
      );

      if (cancelled) return;

      const remainingMs = Math.max(0, MIN_VISIBLE_MS - (Date.now() - startedAt));
      window.setTimeout(() => {
        if (cancelled || readyCalled.current) return;
        readyCalled.current = true;
        window.__ARCTIC_PRELOAD_REPORT__ = results;
        window.__ARCTIC_PUBLIC_ASSET_COUNT__ = PUBLIC_ASSETS.length;
        window.__ARCTIC_CRITICAL_ASSET_COUNT__ = criticalAssets.length;
        window.__ARCTIC_PRELOAD_MANIFEST__ = "landing-critical-v1";
        onReady?.();
      }, remainingMs);
    }

    runPreload();

    return () => {
      cancelled = true;
    };
  }, [onReady, criticalAssets]);

  const detailLine = useMemo(() => {
    if (percent >= 100) {
      return failed
        ? "Frost Gate ready. Failed assets will retry when requested."
        : "Frost Gate ready. All local assets are cached.";
    }
    if (percent >= 72) return "Final checks before entering the kingdom.";
    if (percent >= 44) return "Loading artwork, battle pieces, music, and effects.";
    return "First visit may take longer while the complete game is cached.";
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

        <div
          className="frost-loader-progress"
          role="progressbar"
          aria-valuemin="0"
          aria-valuemax="100"
          aria-valuenow={percent}
        >
          <span style={{ width: `${percent}%` }} />
        </div>

        <div className="frost-loader-foot">
          <strong>{percent}%</strong>
          <span>{loaded}/{criticalAssets.length} assets</span>
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
    const assets = PUBLIC_ASSETS.filter(
      (src) => !LANDING_CRITICAL_ASSET_PATHS.has(src.split("?", 1)[0])
    );
    preloadWithConcurrency(assets, PRELOAD_CONCURRENCY);
  });
}

export function warmGameAssets() {
  runWhenIdle(() => {
    const assets = PUBLIC_ASSETS.filter((src) =>
      /(?:game|board|dice|piece|arctic\/pieces|sounds)/i.test(src)
    );
    preloadWithConcurrency(assets, PRELOAD_CONCURRENCY);
  });
}

export function warmHowToPlayAssets() {
  runWhenIdle(() => {
    const assets = PUBLIC_ASSETS.filter((src) => /how-to-play/i.test(src));
    preloadWithConcurrency(assets, PRELOAD_CONCURRENCY);
  });
}

function getCriticalAssets() {
  // The first screen needs only the background, current front-facing game covers,
  // focal artwork, and the small ambient piece set. Everything else is warmed later.
  if (isDesktopLandscape()) {
    window.__ARCTIC_PRELOAD_DEVICE__ = "desktop";
  } else if (typeof window !== "undefined") {
    window.__ARCTIC_PRELOAD_DEVICE__ = "mobile";
  }

  return [...new Set(LANDING_CRITICAL_ASSETS)];
}

async function preloadWithConcurrency(assets, concurrency, onProgress) {
  const queue = [...new Set(assets)].filter(Boolean);
  const results = new Array(queue.length);
  let cursor = 0;
  let completed = 0;

  async function worker() {
    while (cursor < queue.length) {
      const index = cursor;
      cursor += 1;
      const result = await preloadAsset(queue[index]);
      results[index] = result;
      completed += 1;
      onProgress?.(result, completed, queue.length);
    }
  }

  const workerCount = Math.min(Math.max(1, concurrency), Math.max(1, queue.length));
  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  return results.filter(Boolean);
}

function preloadAsset(src) {
  if (PRELOAD_CACHE.has(src)) return PRELOAD_CACHE.get(src);

  const extension = getExtension(src);
  const task = IMAGE_EXTENSIONS.has(extension)
    ? preloadImage(src)
    : preloadFetchAsset(src, AUDIO_EXTENSIONS.has(extension) ? "audio" : "asset");

  PRELOAD_CACHE.set(src, task);
  return task;
}

function preloadImage(src) {
  return new Promise((resolve) => {
    const image = new Image();
    let settled = false;

    const finish = (status) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      if (status === "loaded") PRELOADED_IMAGE_CACHE.set(src, image);
      resolve({ src, type: "image", status });
    };

    const timer = window.setTimeout(() => finish("timeout"), ASSET_TIMEOUT_MS);

    image.onload = () => {
      if (image.decode) {
        image.decode().then(() => finish("loaded")).catch(() => finish("loaded"));
      } else {
        finish("loaded");
      }
    };
    image.onerror = () => finish("failed");
    image.decoding = "async";
    image.src = src;
  });
}

function preloadFetchAsset(src, type) {
  return new Promise((resolve) => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), ASSET_TIMEOUT_MS);

    fetch(src, {
      method: "GET",
      cache: "force-cache",
      credentials: "same-origin",
      signal: controller.signal
    })
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.arrayBuffer();
      })
      .then(() => resolve({ src, type, status: "loaded" }))
      .catch((error) => resolve({ src, type, status: error?.name === "AbortError" ? "timeout" : "failed" }))
      .finally(() => window.clearTimeout(timer));
  });
}

function getExtension(src) {
  const cleanPath = String(src || "").split(/[?#]/, 1)[0];
  const match = cleanPath.match(/\.([a-z0-9]+)$/i);
  return match ? match[1].toLowerCase() : "";
}

function isDesktopLandscape() {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia(DESKTOP_MEDIA).matches;
}

function runWhenIdle(callback) {
  if (typeof window === "undefined") return;
  if ("requestIdleCallback" in window) {
    window.requestIdleCallback(callback, { timeout: 2200 });
    return;
  }
  window.setTimeout(callback, 600);
}
