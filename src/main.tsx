import "@fontsource/jetbrains-mono/latin-400.css";
import "@fontsource/jetbrains-mono/latin-700.css";
import "@fontsource/jetbrains-mono/cyrillic-400.css";
import "@fontsource/jetbrains-mono/cyrillic-700.css";
import "@xterm/xterm/css/xterm.css";
import "./styles/globals.css";

import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import ReactDOM from "react-dom/client";
import App from "./app/App";
import { initLaunchDir } from "./lib/launchDir";
import { IS_MOBILE, USE_CUSTOM_WINDOW_CONTROLS } from "./lib/platform";

if (USE_CUSTOM_WINDOW_CONTROLS) {
  document.documentElement.dataset.chrome = "borderless";
}

// On Android, read the status bar height from the WebView and set it as a
// CSS custom property so .safe-area-top can use it (env(safe-area-inset-top)
// is not supported by Android WebView).
if (IS_MOBILE) {
  const statusBarHeight = (window as any).__TAURI_INTERNALS__
    ? (window as any).statusBarHeight ?? 0
    : 0;
  document.documentElement.style.setProperty(
    "--android-status-bar-height",
    `${statusBarHeight}px`,
  );
  // Fallback: if the above didn't work, use a fixed 25px padding which is
  // typical for Android status bars on tablets.
  if (!statusBarHeight) {
    document.documentElement.style.setProperty(
      "--android-status-bar-height",
      "25px",
    );
  }
}

// Reap PTY sessions orphaned by a prior webview load before any tab spawns.
await invoke("pty_close_all").catch(() => {});

// Seed before first paint so default tab mounts at target cwd (no flicker).
await initLaunchDir();

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <App />,
);

// Window starts hidden (per tauri.conf.json) so users never see a transparent
// shadow-only frame before React paints. On mobile the WebView is always
// visible — no need to call show().
if (!IS_MOBILE) {
  const showWindow = () => {
    getCurrentWindow()
      .show()
      .catch((e) => console.error("window.show failed:", e));
  };
  setTimeout(showWindow, 50);
  // Safety net: if the first show somehow fails to take effect, force again.
  setTimeout(showWindow, 500);
}
