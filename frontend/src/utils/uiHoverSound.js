const HOVER_SOUND_SRC = "/assets/audio/ui-hover.mp3";

const HOVER_SELECTOR = [
  ".ui-hotspot",
  ".menu-hitbox:not(.full-hitbox)",
  ".menu-play-hitbox",
  ".menu-how-hitbox",
  ".menu-spectate-hitbox",
  ".profile-connect-hitbox",
  ".profile-wallet-copy-hitbox",
  ".profile-name-input",
  ".profile-complete-hitbox",
  ".profile-back-hitbox",
  ".profile-disconnect-hitbox",
  ".open-ice-hitbox",
  ".high-stakes-hitbox",
  ".match-history-hitbox",
  ".leaderboard-hitbox",
  ".account-activity-hitbox",
  ".my-rooms-hitbox",
  ".refresh-hitbox",
  ".deposit-hitbox",
  ".withdraw-hitbox",
  ".playerhub-back-hitbox",
  ".hs-create-room-hitbox",
  ".hs-refresh-rooms-hitbox",
  ".hs-prev-page-hitbox",
  ".hs-next-page-hitbox",
  ".hs-deposit-hitbox",
  ".hs-back-hitbox",
  ".hs-room-join-hitbox",
  ".hs-join-private-hitbox",
  ".highstakes-private-input",
  ".highstakes-tier-btn",
  ".highstakes-modal-primary",
  ".highstakes-modal-cancel",
  ".openicehub-create-hit",
  ".openicehub-refresh-hit",
  ".openicehub-next-page-hit",
  ".openicehub-private-code-hit",
  ".openicehub-private-input",
  ".openicehub-join-private-hit",
  ".openicehub-back-hit",
  ".openicehub-room-join-hit",
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

const HITBOX_CLASS_HINTS = [
  "menu-play-hitbox",
  "menu-how-hitbox",
  "menu-spectate-hitbox",
  "profile-connect-hitbox",
  "profile-wallet-copy-hitbox",
  "profile-complete-hitbox",
  "profile-back-hitbox",
  "profile-disconnect-hitbox",
  "open-ice-hitbox",
  "high-stakes-hitbox",
  "match-history-hitbox",
  "leaderboard-hitbox",
  "account-activity-hitbox",
  "my-rooms-hitbox",
  "refresh-hitbox",
  "deposit-hitbox",
  "withdraw-hitbox",
  "playerhub-back-hitbox",
  "hs-create-room-hitbox",
  "hs-refresh-rooms-hitbox",
  "hs-prev-page-hitbox",
  "hs-next-page-hitbox",
  "hs-deposit-hitbox",
  "hs-back-hitbox",
  "hs-room-join-hitbox",
  "hs-join-private-hitbox",
  "openicehub-create-hit",
  "openicehub-refresh-hit",
  "openicehub-next-page-hit",
  "openicehub-private-code-hit",
  "openicehub-join-private-hit",
  "openicehub-back-hit",
  "openicehub-room-join-hit",
  "join-code-hit",
  "digit-",
  "join-continue-hit",
  "join-back-hit",
  "create-public-hit",
  "create-private-hit",
  "create-back-hit",
  "roll-hitbox",
  "end-turn-hitbox",
  "new-game-hitbox"
];

const COLOR_RULES = [
  { selector: ".profile-connect-hitbox,.profile-complete-hitbox,.hs-create-room-hitbox,.hs-deposit-hitbox,.deposit-hitbox,.openicehub-create-hit,.join-continue-hit,.highstakes-modal-primary,.entry-low,.entry-mid,.entry-high", color: "#39ff88", rgb: "57,255,136" },
  { selector: ".profile-disconnect-hitbox,.end-turn-hitbox,.withdraw-hitbox,.highstakes-modal-cancel", color: "#ff4b6e", rgb: "255,75,110" },
  { selector: ".high-stakes-hitbox,.match-history-hitbox,.account-activity-hitbox,.my-rooms-hitbox,.create-private-hit", color: "#b26cff", rgb: "178,108,255" },
  { selector: ".leaderboard-hitbox", color: "#ffd76a", rgb: "255,215,106" },
  { selector: ".profile-wallet-status,.connected,.ui-hotspot-disabled", color: "#8a95a8", rgb: "138,149,168" },
  { selector: ".menu-play-hitbox,.menu-how-hitbox,.menu-spectate-hitbox,.open-ice-hitbox,.refresh-hitbox,.playerhub-back-hitbox,.hs-refresh-rooms-hitbox,.hs-room-join-hitbox,.hs-join-private-hitbox,.hs-back-hitbox,.hs-prev-page-hitbox,.hs-next-page-hitbox,.openicehub-refresh-hit,.openicehub-next-page-hit,.openicehub-private-code-hit,.openicehub-join-private-hit,.openicehub-back-hit,.openicehub-room-join-hit,.create-public-hit,.create-back-hit,.join-code-hit,.digit-0,.digit-1,.digit-2,.digit-3,.join-back-hit,.roll-hitbox,.new-game-hitbox,.profile-back-hitbox,.profile-wallet-copy-hitbox,.highstakes-private-input,.openicehub-private-input", color: "#6eeaff", rgb: "110,234,255" }
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
  const onPointerActivity = (event) => {
    if (!isMouseLikePointer(event)) return;
    const target = findHoverTarget(event);
    if (!target) {
      lastHoverTarget = null;
      hideHoverOverlaySoon();
      return;
    }
    if (isDisabledHotspot(target)) {
      lastHoverTarget = null;
      hideHoverOverlay();
      return;
    }

    showHoverOverlay(target);

    if (target === lastHoverTarget && Date.now() - lastHoverAt < 500) return;
    lastHoverTarget = target;
    lastHoverAt = Date.now();
    playUiHoverSound();
  };

  const onPointerLeave = () => {
    lastHoverTarget = null;
    hideHoverOverlaySoon();
  };

  const onScrollOrResize = () => {
    if (!lastHoverTarget || !document.documentElement.contains(lastHoverTarget)) return hideHoverOverlay();
    showHoverOverlay(lastHoverTarget);
  };

  window.addEventListener("pointerdown", unlock, { passive: true, capture: true });
  window.addEventListener("click", unlock, { passive: true, capture: true });
  window.addEventListener("keydown", unlock, { passive: true, capture: true });
  window.addEventListener("resize", onScrollOrResize, { passive: true });
  window.addEventListener("scroll", onScrollOrResize, { passive: true, capture: true });
  window.addEventListener("pointermove", onPointerActivity, { passive: true, capture: true });
  window.addEventListener("pointerover", onPointerActivity, { passive: true, capture: true });
  window.addEventListener("mousemove", onPointerActivity, { passive: true, capture: true });
  window.addEventListener("pointerleave", onPointerLeave, { passive: true });
  document.addEventListener("mouseleave", onPointerLeave, { passive: true });

  return () => {
    window.removeEventListener("pointerdown", unlock, true);
    window.removeEventListener("click", unlock, true);
    window.removeEventListener("keydown", unlock, true);
    window.removeEventListener("resize", onScrollOrResize);
    window.removeEventListener("scroll", onScrollOrResize, true);
    window.removeEventListener("pointermove", onPointerActivity, true);
    window.removeEventListener("pointerover", onPointerActivity, true);
    window.removeEventListener("mousemove", onPointerActivity, true);
    window.removeEventListener("pointerleave", onPointerLeave);
    document.removeEventListener("mouseleave", onPointerLeave);
    installed = false;
    lastHoverTarget = null;
    hideHoverOverlay();
  };
}

function findHoverTarget(event) {
  const direct = event.target?.closest?.(HOVER_SELECTOR);
  if (isUsableHoverTarget(direct)) return direct;

  const stack = typeof document.elementsFromPoint === "function"
    ? document.elementsFromPoint(event.clientX, event.clientY)
    : [];

  for (const element of stack) {
    if (!element || element === overlay || element.classList?.contains("ui-hover-frame")) continue;
    const candidate = element.closest?.(HOVER_SELECTOR) || element;
    if (isUsableHoverTarget(candidate)) return candidate;
  }

  const hitbox = findHitboxByGeometry(event.clientX, event.clientY);
  if (hitbox) return hitbox;

  return null;
}

function isUsableHoverTarget(element) {
  if (!element || element === document.body || element === document.documentElement) return false;
  if (!document.documentElement.contains(element)) return false;
  if (element.matches?.(".full-hitbox,.screen-hitbox:not(" + HOVER_SELECTOR + ")")) return false;
  if (isViewportSizedTarget(element)) return false;

  const tag = element.tagName?.toLowerCase();
  if (["select", "textarea"].includes(tag)) return false;
  if (tag === "input") return isExplicitInputHotspot(element);
  if (["button", "a"].includes(tag)) return hasExplicitHotspotIdentity(element);
  if (element.getAttribute?.("role") === "button") return hasExplicitHotspotIdentity(element);
  if (element.matches?.(HOVER_SELECTOR)) return true;
  return classNameHasHitboxHint(element.className);
}

function hasExplicitHotspotIdentity(element) {
  if (!element || element.matches?.(".full-hitbox")) return false;
  if (element.matches?.(HOVER_SELECTOR)) return true;
  return classNameHasHitboxHint(element.className);
}

function isExplicitInputHotspot(element) {
  return Boolean(element?.matches?.(".profile-name-input,.highstakes-private-input,.openicehub-private-input"));
}

function isViewportSizedTarget(element) {
  const rect = element.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return true;
  const viewportWidth = window.innerWidth || document.documentElement.clientWidth || 0;
  const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;
  if (!viewportWidth || !viewportHeight) return false;
  return rect.width >= viewportWidth * 0.72 && rect.height >= viewportHeight * 0.72;
}

function findHitboxByGeometry(clientX, clientY) {
  const candidates = document.querySelectorAll(HOVER_SELECTOR);
  for (let index = candidates.length - 1; index >= 0; index -= 1) {
    const element = candidates[index];
    if (!isUsableHoverTarget(element) || isDisabledHotspot(element)) continue;
    const rect = element.getBoundingClientRect();
    if (rect.width < 4 || rect.height < 4) continue;
    if (clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom) return element;
  }
  return null;
}

function classNameHasHitboxHint(className) {
  const text = typeof className === "string" ? className : String(className?.baseVal || "");
  if (!text) return false;
  if (text.includes("full-hitbox") || text.includes("screen-hitbox")) return false;
  return HITBOX_CLASS_HINTS.some((hint) => text.includes(hint));
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
    if (rect.width <= 0 || rect.height <= 0 || isViewportSizedTarget(target)) return hideHoverOverlay();
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

function hideHoverOverlaySoon() {
  window.clearTimeout(overlayHideTimer);
  overlayHideTimer = window.setTimeout(hideHoverOverlay, 70);
}

function hideHoverOverlay() {
  if (!overlay) return;
  overlay.classList.remove("is-visible");
}

function hoverColorsFor(element) {
  const computed = getComputedStyle(element);
  const inlineColor = computed.getPropertyValue("--hover-color").trim();
  const inlineRgb = computed.getPropertyValue("--hover-rgb").trim();
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

function isMouseLikePointer(event) {
  if (!event) return false;
  if (event.type === "mousemove") return true;
  if (event.pointerType === "mouse") return true;
  if (!event.pointerType && event.clientX != null && event.clientY != null) return true;
  return false;
}

function isDisabledHotspot(element) {
  return Boolean(
    element?.disabled ||
    element?.getAttribute?.("aria-disabled") === "true" ||
    element?.classList?.contains("ui-hotspot-disabled") ||
    element?.classList?.contains("connected") ||
    element?.closest?.("[disabled], .ui-hotspot-disabled")
  );
}
