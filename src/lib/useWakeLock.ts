import { useEffect, useState } from "react";

type WakeLockSentinel = {
  release: () => Promise<void>;
  released: boolean;
  addEventListener: (type: "release", cb: () => void) => void;
};

type WakeLockNavigator = Navigator & {
  wakeLock?: {
    request: (type: "screen") => Promise<WakeLockSentinel>;
  };
};

/**
 * Prevents the screen from dimming or sleeping while `enabled` is true.
 *
 * Uses the Screen Wake Lock API. On Android WebView (Tauri), this keeps
 * the screen on during long-running commands like `apt install` or builds.
 *
 * Automatically re-acquires the lock if the page becomes visible again
 * after being hidden (e.g. app backgrounded and resumed).
 */
export function useWakeLock(enabled: boolean): boolean {
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (!enabled) return;

    const nav = navigator as WakeLockNavigator;
    if (!nav.wakeLock) return;

    let sentinel: WakeLockSentinel | null = null;
    let cancelled = false;

    const acquire = async () => {
      if (cancelled) return;
      try {
        sentinel = await nav.wakeLock!.request("screen");
        setActive(true);
        sentinel.addEventListener("release", () => {
          setActive(false);
          sentinel = null;
        });
      } catch {
        // Auto-denied (e.g. page not visible) — will retry on visibilitychange
        setActive(false);
      }
    };

    const release = async () => {
      if (sentinel) {
        try {
          await sentinel.release();
        } catch {
          // already released
        }
        sentinel = null;
        setActive(false);
      }
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void acquire();
      }
    };

    void acquire();
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisibilityChange);
      void release();
    };
  }, [enabled]);

  return active;
}
