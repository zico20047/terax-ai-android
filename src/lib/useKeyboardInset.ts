import { useEffect, useState } from "react";

/**
 * Returns the current soft-keyboard height in pixels.
 *
 * Uses the VisualViewport API to detect the difference between
 * the layout viewport and the visual viewport — that gap is the
 * keyboard on Android.
 *
 * Returns 0 when no keyboard is visible or the API is unavailable.
 */
export function useKeyboardInset(): number {
  const [inset, setInset] = useState(0);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    const update = () => {
      const keyboard = window.innerHeight - vv.height - vv.offsetTop;
      setInset(Math.max(0, Math.round(keyboard)));
    };

    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);

    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, []);

  return inset;
}
