/* Arctic Dominion experience note: individual heritage games receive their own material, colour, motion, and optional feedback sounds; the main Arctic Dominion shell is intentionally excluded. */
import { soundManager } from "../utils/soundManager.js";

export function HeritageExperienceFrame({ gameId, children }) {
  function handleFeedback(event) {
    const target = event.target?.closest?.("button,[role='button'],[role='gridcell']");
    if (!target || target.disabled || target.getAttribute("aria-disabled") === "true") return;

    const words = `${target.getAttribute("aria-label") || ""} ${target.textContent || ""}`.toLowerCase();
    const classes = String(target.className || "");
    if (target.getAttribute("role") === "gridcell") {
      soundManager.play(classes.includes("target") || classes.includes("legal") ? "pieceMove" : "pieceSelect", { cooldownMs: 90, volume: 0.48 });
    } else if (/roll|cast|cowrie|throw/.test(words)) {
      soundManager.play("diceRoll", { cooldownMs: 160, volume: 0.46 });
    } else if (/enter|play|start|try again|restart|continue|rematch/.test(words)) {
      soundManager.play("uiConfirm", { cooldownMs: 110, volume: 0.48 });
    } else if (/hint|undo|rules|how to play|field guide/.test(words)) {
      soundManager.play("pieceSelect", { cooldownMs: 100, volume: 0.38 });
    } else {
      soundManager.play("uiTap", { cooldownMs: 85, volume: 0.34 });
    }
  }

  return (
    <div className="heritage-experience-frame" data-heritage-game={gameId} onClickCapture={handleFeedback}>
      <div className="heritage-atmosphere" aria-hidden="true" />
      <div className="heritage-sparkle heritage-sparkle-a" aria-hidden="true" />
      <div className="heritage-sparkle heritage-sparkle-b" aria-hidden="true" />
      {children}
    </div>
  );
}
