import { useCallback, useEffect, useRef, useState } from "react";

export function useKeyboardHeight() {
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const rafRef = useRef(0);

  const update = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      if (!window.visualViewport) return;
      const vv = window.visualViewport;
      const height = window.innerHeight - vv.height - vv.offsetTop;
      setKeyboardHeight(Math.max(0, height));
    });
  }, []);

  useEffect(() => {
    if (!window.visualViewport) return;
    const vv = window.visualViewport;
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    window.addEventListener("orientationchange", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
      window.removeEventListener("orientationchange", update);
      cancelAnimationFrame(rafRef.current);
    };
  }, [update]);

  return {
    keyboardHeight,
    isKeyboardOpen: keyboardHeight > 50,
  };
}
