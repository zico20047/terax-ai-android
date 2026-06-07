import { useEffect, useCallback } from "react";
import { scrollVisibleTerminal } from "@/modules/terminal/lib/rendererPool";

const LONG_PRESS_DURATION = 500;
const MOVE_THRESHOLD = 10;

type TouchPosition = { x: number; y: number };

export function useTerminalTouch(
  terminalRef: React.RefObject<HTMLElement | null>,
  disabled = false,
  onLongPress?: () => void,
) {
  const handleContextMenu = useCallback((e: MouseEvent) => {
    e.preventDefault();
  }, []);

  useEffect(() => {
    const el = terminalRef.current;
    if (!el) return;

    // When disabled, let xterm.js handle touch events natively (for selection)
    if (disabled) {
      el.addEventListener("contextmenu", handleContextMenu);
      return () => {
        el.removeEventListener("contextmenu", handleContextMenu);
      };
    }

    let longPressTimer: ReturnType<typeof setTimeout> | null = null;
    let startPos: TouchPosition | null = null;
    let lastY = 0;
    let isScrolling = false;

    const onTouchStart = (e: TouchEvent) => {
      // Stop xterm.js from handling this
      e.stopPropagation();

      const touch = e.touches[0];
      startPos = { x: touch.clientX, y: touch.clientY };
      lastY = touch.clientY;
      isScrolling = false;

      longPressTimer = setTimeout(() => {
        if (!isScrolling && onLongPress) {
          onLongPress();
        }
      }, LONG_PRESS_DURATION);
    };

    const onTouchMove = (e: TouchEvent) => {
      // Stop xterm.js from handling this
      e.preventDefault();
      e.stopPropagation();

      if (!startPos) return;
      const touch = e.touches[0];
      const dx = Math.abs(touch.clientX - startPos.x);
      const dy = Math.abs(touch.clientY - startPos.y);

      // Cancel long press on movement
      if (dx > MOVE_THRESHOLD || dy > MOVE_THRESHOLD) {
        if (longPressTimer) {
          clearTimeout(longPressTimer);
          longPressTimer = null;
        }
      }

      // Vertical drag = scroll terminal
      if (dy > MOVE_THRESHOLD && dy > dx) {
        isScrolling = true;
        const deltaY = lastY - touch.clientY;
        if (Math.abs(deltaY) >= 3) {
          const lines = Math.round(deltaY / 6);
          if (lines !== 0) {
            scrollVisibleTerminal(lines);
            lastY = touch.clientY;
          }
        }
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      e.stopPropagation();
      if (longPressTimer) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
      }
      startPos = null;
      isScrolling = false;
    };

    // capture: true = intercept BEFORE xterm.js
    // passive: false = allow preventDefault
    el.addEventListener("touchstart", onTouchStart, { passive: true, capture: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false, capture: true });
    el.addEventListener("touchend", onTouchEnd, { passive: true, capture: true });
    el.addEventListener("contextmenu", handleContextMenu);

    return () => {
      el.removeEventListener("touchstart", onTouchStart, { capture: true } as AddEventListenerOptions);
      el.removeEventListener("touchmove", onTouchMove, { capture: true } as AddEventListenerOptions);
      el.removeEventListener("touchend", onTouchEnd, { capture: true } as AddEventListenerOptions);
      el.removeEventListener("contextmenu", handleContextMenu);
      if (longPressTimer) clearTimeout(longPressTimer);
    };
  }, [terminalRef, handleContextMenu, disabled, onLongPress]);
}
