/**
 * Android back button interceptor.
 *
 * On Android, the system back button/gesture exits the app by default.
 * This module provides a global "back handler" stack — overlays register
 * their close callback, and when back is pressed the topmost one fires
 * instead of the app exiting.
 *
 * How it works:
 * 1. JS sets a native flag via `TeraxBack.setConsumed(true)` when overlays open
 * 2. When back is pressed, Kotlin checks the flag synchronously (no async)
 * 3. If consumed → Kotlin calls `__teraxHandleBack()` to close the overlay
 * 4. If not consumed → Kotlin calls `finish()` to exit
 */

type BackHandler = () => boolean; // return true = consumed (don't exit)

const handlers: BackHandler[] = [];

/** Register a back handler. Returns an unsubscribe function. */
export function addBackHandler(fn: BackHandler): () => void {
  return () => {
    const idx = handlers.lastIndexOf(fn);
    if (idx !== -1) handlers.splice(idx, 1);
    syncToNative();
  };
}

/** Add a handler and immediately sync to native. */
export function addBackHandlerImmediate(fn: BackHandler): () => void {
  handlers.push(fn);
  syncToNative();
  return () => {
    const idx = handlers.lastIndexOf(fn);
    if (idx !== -1) handlers.splice(idx, 1);
    syncToNative();
  };
}

/** Push native flag so Kotlin knows if there's something to consume. */
function syncToNative() {
  const hasHandlers = handlers.length > 0;
  try {
    // TeraxBack is the JavascriptInterface added in MainActivity.kt
    (window as any).TeraxBack?.setConsumed(hasHandlers);
  } catch {
    // Not on Android — ignore
  }
}

/** Called from native Android. Returns "true" if consumed. */
(window as any).__teraxHandleBack = (): string => {
  for (let i = handlers.length - 1; i >= 0; i--) {
    if (handlers[i]()) {
      syncToNative();
      return "true";
    }
  }
  syncToNative();
  return "false";
};
