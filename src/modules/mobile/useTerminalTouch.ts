import { useEffect, useCallback } from "react";

const LONG_PRESS_DURATION = 500;
const MOVE_THRESHOLD = 10;

type TouchPosition = { x: number; y: number };

export function useTerminalTouch(terminalRef: React.RefObject<HTMLElement | null>) {
  const handleContextMenu = useCallback((e: MouseEvent) => {
    e.preventDefault();
  }, []);

  useEffect(() => {
    const el = terminalRef.current;
    if (!el) return;

    let longPressTimer: ReturnType<typeof setTimeout> | null = null;
    let startPos: TouchPosition | null = null;

    const onTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      startPos = { x: touch.clientX, y: touch.clientY };

      longPressTimer = setTimeout(() => {
        const target = el.querySelector("canvas");
        if (target) {
          const ctxEvent = new MouseEvent("contextmenu", {
            bubbles: true,
            cancelable: true,
            clientX: touch.clientX,
            clientY: touch.clientY,
          });
          target.dispatchEvent(ctxEvent);
        }
      }, LONG_PRESS_DURATION);
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!startPos || !longPressTimer) return;
      const touch = e.touches[0];
      const dx = Math.abs(touch.clientX - startPos.x);
      const dy = Math.abs(touch.clientY - startPos.y);
      if (dx > MOVE_THRESHOLD || dy > MOVE_THRESHOLD) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
      }
    };

    const onTouchEnd = () => {
      if (longPressTimer) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
      }
      startPos = null;
    };

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: true });
    el.addEventListener("touchend", onTouchEnd, { passive: true });
    el.addEventListener("contextmenu", handleContextMenu);

    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
      el.removeEventListener("contextmenu", handleContextMenu);
      if (longPressTimer) clearTimeout(longPressTimer);
    };
  }, [terminalRef, handleContextMenu]);
}
