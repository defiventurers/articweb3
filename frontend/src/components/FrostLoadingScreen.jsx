import { useEffect, useMemo, useRef, useState } from "react";

const REMOTE_PIECE_ASSET_BASE =
  "https://raw.githubusercontent.com/defiventurers/chaturanga-game/36d8ee9ae33fa08a21ba3d644b6053b9e13273e4/public/assets/arctic/pieces";

const SCREEN_ASSETS = [
  "/assets/screens/cover.png",
  "/assets/screens/main-menu.png",
  "/assets/screens/profile.png",
  "/assets/screens/playerhub.png",
  "/assets/screens/openicehub.png",
  "/assets/screens/team-select.png",
  "/assets/screens/arctic-dominion-game-base.png"
];

const PIECE_COLORS = ["red", "blue", "green", "pink"];
const PIECE_TYPES = ["snow-guard", "icebreaker", "war-mammoth", "aurora-unicorn", "frost-king"];
const PIECE_ASSETS = PIECE_COLORS.flatMap((color) => PIECE_TYPES.map((piece) => `${REMOTE_PIECE_ASSET_BASE}/${color}-${piece}.png`));

const CRITICAL_ASSETS = [...SCREEN_ASSETS, ...PIECE_ASSETS];

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

export function FrostLoadingScreen({ onReady }) {
  const [loaded, setLoaded] = useState(0);
  const [failed, setFailed] = useState(0);
  const [phase, setPhase] = useState(STATUS_LINES[0]);
  const readyCalled = useRef(false);

  const total = CRITICAL_ASSETS.length;
  const percent = Math.min(100, Math.round((loaded / total) * 100));

  useEffect(() => {
    let cancelled = false;
    const startedAt = Date.now();

    async function runPreload() {
      const results = await Promise.all(
        CRITICAL_ASSETS.map((src, index) => preloadImage(src).then((result) => {
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
        onReady?.();
      }, remainingMs);
    }

    runPreload();

    return () => {
      cancelled = true;
    };
  }, [onReady, total]);

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

function preloadImage(src) {
  return new Promise((resolve) => {
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

    image.onerror = () => finish("failed");
    image.src = src;
  });
}
