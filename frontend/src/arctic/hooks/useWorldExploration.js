import { useEffect, useMemo, useState } from "react";

export function useWorldExploration({ disabled = false } = {}) {
  const [pointer, setPointer] = useState({ x: 0, y: 0 });
  const [isTouch, setIsTouch] = useState(false);

  useEffect(() => {
    const touchQuery = window.matchMedia("(pointer: coarse)");
    const updateInputMode = () => setIsTouch(touchQuery.matches);
    updateInputMode();
    touchQuery.addEventListener?.("change", updateInputMode);

    function handlePointerMove(event) {
      if (disabled || touchQuery.matches) return;
      const x = (event.clientX / window.innerWidth - 0.5) * 2;
      const y = (event.clientY / window.innerHeight - 0.5) * 2;
      setPointer({ x: Math.max(-1, Math.min(1, x)), y: Math.max(-1, Math.min(1, y)) });
    }

    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    return () => {
      touchQuery.removeEventListener?.("change", updateInputMode);
      window.removeEventListener("pointermove", handlePointerMove);
    };
  }, [disabled]);

  return useMemo(() => ({
    isTouch,
    style: {
      "--world-shift-x": `${disabled || isTouch ? 0 : pointer.x * -13}px`,
      "--world-shift-y": `${disabled || isTouch ? 0 : pointer.y * -8}px`,
      "--world-tilt": `${disabled || isTouch ? 0 : pointer.x * 0.35}deg`
    }
  }), [disabled, isTouch, pointer]);
}
