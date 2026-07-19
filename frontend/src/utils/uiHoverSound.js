const HOVER_SOUND_SRC = "/assets/audio/ui-hover.mp3";
const HOVER_SELECTOR = [
  ".ui-hotspot",
  ".full-hitbox",
  ".menu-hitbox",
  ".screen-hitbox",
  ".profile-hit",
  ".profile-name-input",
  ".highstakes-private-input",
  ".highstakes-tier-btn",
  ".highstakes-modal-primary",
  ".highstakes-modal-cancel",
  ".openicehub-private-input",
  ".join-code-hit",
  ".digit-0",
  ".digit-1",
  ".digit-2",
  ".digit-3",
  ".join-continue-hit",
  ".join-back-hit",
  ".create-public-hit",
  ".create-private-hit",
  ".create-back-hit",
  ".roll-hitbox",
  ".end-turn-hitbox",
  ".new-game-hitbox",
  ".data-screen button",
  ".ph-dev-rail button"
].join(",");

const COLOR_RULES = [
  { selector: ".profile-connect-hitbox,.profile-complete-hitbox,.hs-create-room-hitbox,.hs-deposit-hitbox,.deposit-hitbox,.openicehub-create-hit,.join-continue-hit,.highstakes-modal-primary,.entry-low,.entry-mid,.entry-high", color: "#39ff88", rgb: "57,255,136" },
  { selector: ".profile-disconnect-hitbox,.end-turn-hitbox,.withdraw-hitbox,.highstakes-modal-cancel", color: "#ff4b6e", rgb: "255,75,110" },
  { selector: ".high-stakes-hitbox,.match-history-hitbox,.account-activity-hitbox,.my-rooms-hitbox,.create-private-hit", color: "#b26cff", rgb: "178,108,255" },
  { selector: ".leaderboard-hitbox", color: "#ffd76a", rgb: "255,215,106" },
  { selector: ".profile-wallet-status,.connected,.ui-hotspot-disabled", color: "#8a95a8", rgb: "138,149,168" },
  { selector: ".full-hitbox,.menu-play-hitbox,.menu-how-hitbox,.menu-spectate-hitbox,.open-ice-hitbox,.refresh-hitbox,.playerhub-back-hitbox,.hs-refresh-rooms-hitbox,.hs-room-join-hitbox,.hs-join-private-hitbox,.hs-back-hitbox,.hs-prev-page-hitbox,.hs-next-page-hitbox,.openicehub-refresh-hit,.openicehub-next-page-hit,.openicehub-join-private-hit,.openicehub-back-hit,.openicehub-room-join-hit,.create-public-hit,.create-back-hit,.join-code-hit,.digit-0,.digit-1,.digit-2,.digit-3,.join-back-hit,.roll-hitbox,.new-game-hitbox,.profile-back-hitbox,.profile-wallet-copy-hitbox,.highstakes-private-input,.openicehub-private-input", color: "#6eeaff", rgb: "110,234,255" }
];

let unlocked = false;
let audio = null;
let audioUnavailable = false;
let installed = false;
let lastHoverTarget = null;
let lastHoverAt = 0;
let overlay = null;
let overlayHideTimer = null;
let rafId = 0;

export function unlockUiAudio() {
  unlocked = true;
  getHoverAudio();
}

export function playUiHoverSound() {
  if (!unlocked || audioUnavailable) return;
  const hoverAudio = getHoverAudio();
  if (!hoverAudio) return;

  try {
    hoverAudio.currentTime = 0;
    const playResult = hoverAudio.play();
    if (playResult?.catch) playResult.catch(() => {});
  } catch {}
}

export function initUiHoverFeedback() {
  if (installed || typeof window === "undefined" || typeof document === "undefined") return () => {};
  installed = true;
  ensureOverlay();

  const unlock = () => unlockUiAudio();
  const onPointerOver = (event) => {
    if (!isFineHoverPointer(event)) return;
    const target = event.target?.closest?.(HOVER_SELECTOR);
    if (!target || !document.documentElement.contains(target)) return;
    if (isDisabledHotspot(target)) {
      hideHoverOverlay();
      return;
    }

    showHoverOverlay(target);

    if (target === lastHoverTarget && Date.now() - lastHoverAt < 500) return;
    lastHoverTarget = target;
    lastHoverAt = Date.now();
    playUiHoverSound();
  };

  const onPointerMove = (event) => {
    if (!isFineHoverPointer(event)) return;
    const target = event.target?.closest?.(HOVER_SELECTOR);
    if (!target || isDisabledHotspot(target)) return;
    showHoverOverlay(target);
  };

  const onPointerOut = (event) => {
    const target = event.target?.closest?.(HOVER_SELECTOR);
    if (!target) return;
    const related = event.relatedTarget;
    if (related && target.contains(related)) return;
    window.clearTimeout(overlayHideTimer);
    overlayHideTimer = window.setTimeout(hideHoverOverlay, 40);
  };

  const onScrollOrResize = () => {
    if (!lastHoverTarget || !document.documentElement.contains(lastHoverTarget)) return hideHoverOverlay();
    showHoverOverlay(lastHoverTarget);
  };

  window.addEventListener("pointerdown", unlock, { passive: true });
  window.addEventListener("click", unlock, { passive: true });
  window.addEventListener("keydown", unlock, { passive: true });
  window.addEventListener("resize", onScrollOrResize, { passive: true });
  window.addEventListener("scroll", onScrollOrResize, { passive: true, capture: true });
  document.addEventListener("pointerover", onPointerOver, { passive: true });
  document.addEventListener("pointermove", onPointerMove, { passive: true });
  document.addEventListener("pointerout", onPointerOut, { passive: true });

  return () => {
    window.removeEventListener("pointerdown", unlock);
    window.removeEventListener("click", unlock);
    window.removeEventListener("keydown", unlock);
    window.removeEventListener("resize", onScrollOrResize);
    window.removeEventListener("scroll", onScrollOrResize, true);
    document.removeEventListener("pointerover", onPointerOver);
    document.removeEventListener("pointermove", onPointerMove);
    document.removeEventListener("pointerout", onPointerOut);
    installed = false;
    lastHoverTarget = null;
    hideHoverOverlay();
  };
}

function ensureOverlay() {
  if (overlay || typeof document === "undefined") return overlay;
  overlay = document.createElement("div");
  overlay.className = "ui-hover-frame";
  overlay.setAttribute("aria-hidden", "true");
  document.body.appendChild(overlay);
  return overlay;
}

function showHoverOverlay(target) {
  const frame = ensureOverlay();
  if (!frame || !target) return;

  window.clearTimeout(overlayHideTimer);
  window.cancelAnimationFrame(rafId);
  rafId = window.requestAnimationFrame(() => {
    const rect = target.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return hideHoverOverlay();
    const colors = hoverColorsFor(target);
    const pad = Math.max(4, Math.min(14, Math.round(Math.min(rect.width, rect.height) * 0.08)));

    frame.style.setProperty("--hover-color", colors.color);
    frame.style.setProperty("--hover-rgb", colors.rgb);
    frame.style.left = `${rect.left - pad}px`;
    frame.style.top = `${rect.top - pad}px`;
    frame.style.width = `${rect.width + pad * 2}px`;
    frame.style.height = `${rect.height + pad * 2}px`;
    frame.style.borderRadius = `${Math.max(10, Math.min(28, Math.round(Math.min(rect.width, rect.height) * 0.18)))}px`;
    frame.classList.add("is-visible");
  });
}

function hideHoverOverlay() {
  if (!overlay) return;
  overlay.classList.remove("is-visible");
}

function hoverColorsFor(element) {
  const inlineColor = getComputedStyle(element).getPropertyValue("--hover-color").trim();
  const inlineRgb = getComputedStyle(element).getPropertyValue("--hover-rgb").trim();
  if (inlineColor && inlineRgb) return { color: inlineColor, rgb: inlineRgb };

  for (const rule of COLOR_RULES) {
    if (safeMatches(element, rule.selector)) return { color: rule.color, rgb: rule.rgb };
  }
  return { color: "#8eefff", rgb: "142,239,255" };
}

function safeMatches(element, selector) {
  try {
    return element.matches(selector);
  } catch {
    return false;
  }
}

function getHoverAudio() {
  if (audio || audioUnavailable || typeof Audio === "undefined") return audio;

  try {
    audio = new Audio(HOVER_SOUND_SRC);
    audio.preload = "auto";
    audio.volume = 0.2;
    audio.addEventListener("error", () => {
      audioUnavailable = true;
      audio = null;
    }, { once: true });
  } catch {
    audioUnavailable = true;
    audio = null;
  }

  return audio;
}

function isFineHoverPointer(event) {
  if (event.pointerType && event.pointerType !== "mouse") return false;
  if (!window.matchMedia) return true;
  return window.matchMedia("(hover: hover) and (pointer: fine)").matches;
}

function isDisabledHotspot(element) {
  return Boolean(
    element.disabled ||
    element.getAttribute("aria-disabled") === "true" ||
    element.classList.contains("ui-hotspot-disabled") ||
    element.classList.contains("connected") ||
    element.closest("[disabled], .ui-hotspot-disabled")
  );
}
