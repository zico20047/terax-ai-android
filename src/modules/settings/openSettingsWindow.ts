import { invoke } from "@tauri-apps/api/core";
import { IS_MOBILE } from "@/lib/platform";

export type SettingsTab =
  | "general"
  | "themes"
  | "shortcuts"
  | "models"
  | "agents"
  | "about";

/**
 * Global callback set by App.tsx on mobile to show the inline settings panel.
 * On desktop this calls the Rust `open_settings_window` command which creates
 * a real OS window. On mobile (Android) multi-window isn't available, so we
 * dispatch a custom event that App.tsx listens for to show MobileSettingsPanel.
 */
let _mobileSettingsHandler: ((tab?: SettingsTab) => void) | null = null;

export function setMobileSettingsHandler(
  handler: ((tab?: SettingsTab) => void) | null,
) {
  _mobileSettingsHandler = handler;
}

export async function openSettingsWindow(tab?: SettingsTab): Promise<void> {
  if (IS_MOBILE) {
    if (_mobileSettingsHandler) {
      _mobileSettingsHandler(tab);
    }
    return;
  }
  await invoke("open_settings_window", { tab: tab ?? null });
}
