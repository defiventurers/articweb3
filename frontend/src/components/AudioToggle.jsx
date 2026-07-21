import { useEffect, useState } from "react";
import { soundManager } from "../utils/soundManager.js";

const buttonStyle = {
  position: "fixed",
  top: "max(12px, env(safe-area-inset-top))",
  right: "max(12px, env(safe-area-inset-right))",
  zIndex: 10000,
  width: 42,
  height: 42,
  borderRadius: "999px",
  border: "1px solid rgba(190, 245, 255, 0.46)",
  background: "rgba(3, 19, 39, 0.68)",
  color: "rgba(235, 250, 255, 0.96)",
  boxShadow: "0 10px 28px rgba(0, 0, 0, 0.28), inset 0 1px 0 rgba(255, 255, 255, 0.14)",
  backdropFilter: "blur(10px)",
  WebkitBackdropFilter: "blur(10px)",
  cursor: "pointer",
  display: "grid",
  placeItems: "center",
  fontSize: 18,
  lineHeight: 1,
  WebkitTapHighlightColor: "transparent"
};

export function AudioToggle() {
  const [enabled, setEnabled] = useState(() => soundManager.isEnabled());

  useEffect(() => {
    soundManager.load();
    const unsubscribe = soundManager.subscribe(({ enabled: nextEnabled }) => setEnabled(nextEnabled));

    const unlock = () => soundManager.unlock();
    window.addEventListener("pointerdown", unlock, { passive: true });
    window.addEventListener("keydown", unlock);

    return () => {
      unsubscribe();
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  function handleToggle() {
    soundManager.unlock();
    soundManager.toggleMuted();
  }

  return (
    <button
      className="audio-toggle"
      type="button"
      aria-label={enabled ? "Mute sound" : "Unmute sound"}
      title={enabled ? "Mute sound" : "Unmute sound"}
      onClick={handleToggle}
      style={{ ...buttonStyle, opacity: enabled ? 1 : 0.58 }}
    >
      {enabled ? "🔊" : "🔇"}
    </button>
  );
}
