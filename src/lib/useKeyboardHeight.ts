import { useEffect, useRef, useState } from "react";
import { IS_MOBILE } from "@/lib/platform";

export function useKeyboardHeight() {
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const baselineRef = useRef(window.innerHeight);

  useEffect(() => {
    if (!IS_MOBILE) return;

    const resetBaseline = () => {
      setTimeout(() => {
        baselineRef.current = window.innerHeight;
      }, 300);
    };

    const check = () => {
      requestAnimationFrame(() => {
        const diff = baselineRef.current - window.innerHeight;
        const open = diff > 100;
        setIsKeyboardOpen(open);
        if (!open) {
          baselineRef.current = window.innerHeight;
        }
      });
    };

    window.addEventListener("resize", check);
    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", check);
    }
    screen.orientation?.addEventListener("change", resetBaseline);
    return () => {
      window.removeEventListener("resize", check);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener("resize", check);
      }
      screen.orientation?.removeEventListener("change", resetBaseline);
    };
  }, []);

  return { keyboardHeight: 0, isKeyboardOpen };
}
