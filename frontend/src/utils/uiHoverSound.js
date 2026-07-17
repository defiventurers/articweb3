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
  ".new-game-hitbox"
].join(",");

let unlocked = false;
let audio = null;
let audioUnavailable = false;
let installed = false;
let lastHoverTarget = null;
let lastHoverAt = 0;

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

  const unlock = () => unlockUiAudio();
  const onPointerOver = (event) => {
    if (!isFineHoverPointer(event)) return;
    const target = event.target?.closest?.(HOVER_SELECTOR);
    if (!target || !document.documentElement.contains(target)) return;
    if (isDisabledHotspot(target)) return;
    if (target === lastHoverTarget && Date.now() - lastHoverAt < 500) return;

    lastHoverTarget = target;
    lastHoverAt = Date.now();
    playUiHoverSound();
  };

  window.addEventListener("pointerdown", unlock, { passive: true });
  window.addEventListener("click", unlock, { passive: true });
  window.addEventListener("keydown", unlock, { passive: true });
  document.addEventListener("pointerover", onPointerOver, { passive: true });

  return () => {
    window.removeEventListener("pointerdown", unlock);
    window.removeEventListener("click", unlock);
    window.removeEventListener("keydown", unlock);
    document.removeEventListener("pointerover", onPointerOver);
    installed = false;
    lastHoverTarget = null;
  };
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
