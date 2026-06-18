import { useCallback, useEffect, useRef, useState } from "react";

const EDGE_MARGIN = 8;

export function useDraggablePanel(storageKey) {
  const panelRef = useRef(null);
  const [position, setPosition] = useState(null);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const saved = JSON.parse(window.localStorage.getItem(storageKey) || "null");
      if (saved && Number.isFinite(saved.x) && Number.isFinite(saved.y)) {
        setPosition(saved);
      }
    } catch {
      // Ignore bad local panel state.
    }
  }, [storageKey]);

  useEffect(() => {
    if (typeof window === "undefined" || !position) return;
    window.localStorage.setItem(storageKey, JSON.stringify(position));
  }, [position, storageKey]);

  const resetPosition = useCallback(() => {
    setPosition(null);
    if (typeof window !== "undefined") window.localStorage.removeItem(storageKey);
  }, [storageKey]);

  const onPointerDown = useCallback((event) => {
    if (event.button !== undefined && event.button !== 0) return;
    const node = panelRef.current;
    if (!node || typeof window === "undefined") return;

    const rect = node.getBoundingClientRect();
    const pointerOffset = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    };

    setDragging(true);
    setPosition(clampPosition(rect.left, rect.top, rect.width, rect.height));
    event.preventDefault();

    function handlePointerMove(moveEvent) {
      const width = node.offsetWidth || rect.width;
      const height = node.offsetHeight || rect.height;
      setPosition(clampPosition(moveEvent.clientX - pointerOffset.x, moveEvent.clientY - pointerOffset.y, width, height));
    }

    function handlePointerUp() {
      setDragging(false);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);
  }, []);

  const panelStyle = position ? {
    position: "fixed",
    left: `${position.x}px`,
    top: `${position.y}px`,
    right: "auto",
    bottom: "auto",
    transform: "none",
    zIndex: 80
  } : undefined;

  return {
    panelRef,
    panelStyle,
    dragging,
    resetPosition,
    dragHandleProps: {
      onPointerDown,
      title: "Drag panel",
      "aria-label": "Drag panel"
    }
  };
}

function clampPosition(x, y, width, height) {
  if (typeof window === "undefined") return { x, y };
  const maxX = Math.max(EDGE_MARGIN, window.innerWidth - width - EDGE_MARGIN);
  const maxY = Math.max(EDGE_MARGIN, window.innerHeight - height - EDGE_MARGIN);
  return {
    x: Math.min(Math.max(EDGE_MARGIN, Math.round(x)), maxX),
    y: Math.min(Math.max(EDGE_MARGIN, Math.round(y)), maxY)
  };
}
