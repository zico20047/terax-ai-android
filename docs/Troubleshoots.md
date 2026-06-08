# Troubleshooting

> Early beta — expect issues. Here are common ones and fixes.

---

## Installation

### `sdkmanager: command not found`

Install Android command-line tools:
```bash
# Download from https://developer.android.com/studio#command-line-tools-only
# Extract to: <sdk>/cmdline-tools/latest/
```

### `Failure [DELETE_FAILED_INTERNAL_ERROR]`

The app is still running. Force stop first:
```powershell
adb shell am force-stop app.crynta.terax
adb shell pm uninstall app.crynta.terax
```

### `Failure [INSTALL_FAILED_OLDER_SDK]`

Your Android version is too old. Terax requires Android 7.0 (API 24) or newer.

### `app not installed` / `package conflicts with existing package`

Uninstall the old version first:
```powershell
adb shell pm uninstall app.crynta.terax
```

If that fails, the package signature changed. Remove manually:
**Settings → Apps → Terax → Uninstall**, then reinstall.

---

## Build

### `invalid value for '--target'`

Tauri uses **short names**, not full Rust triples:

| Correct | Wrong |
|---------|-------|
| `--target aarch64` | `--target aarch64-linux-android` |
| `--target x86_64` | `--target x86_64-linux-android` |
| `--target armv7` | `--target armv7-linux-androideabi` |
| `--target i686` | `--target i686-linux-android` |

### `Cannot find module '@wterm/dom/css'`

Add CSS type declarations. Already in `src/vite-env.d.ts`:
```ts
declare module "@wterm/dom/css";
declare module "@wterm/react/css";
```

### `ERR_PNPM_OUTDATED_LOCKFILE`

The lockfile is out of date:
```bash
pnpm install --no-frozen-lockfile
```

### Build takes too long

The first build compiles Rust native code (~10-15 min). Subsequent builds
use cache (~5 min). The CI uses per-architecture caches for faster builds.

### Release build fails (disk space)

Release builds need more disk space than debug. Use `--debug` for testing:
```bash
pnpm tauri android build --debug --apk --target aarch64
```

### APK too large

Build per-architecture instead of universal:
```bash
# Good — only one architecture (~30MB bootstrap)
pnpm tauri android build --debug --apk --target aarch64

# Avoid — includes all architectures (~120MB+)
pnpm tauri android build --debug --apk --target universal
```

---

## Terminal

### `apt update` shows `NO_PUBKEY` GPG warning

Cosmetic — packages still install fine. The `[trusted=yes]` config in apt
sources bypasses GPG verification.

### dpkg errors during `apt install`

Post-install scripts from Termux packages may fail. Packages still work.
Errors are non-fatal and can be ignored.

### Touch selection not working on phone/tablet

wterm DOM renderer handles text selection natively. Hold and drag on
terminal text — it works like selecting text on a web page.

If selection doesn't work:
1. Make sure you're using a **mobile** build (not desktop xterm.js)
2. Tap on terminal text first to make sure it has focus
3. Try portrait mode (landscape on small phones may have layout bugs)

### CTRL/ALT keys don't work with soft keyboard

1. Tap the **CTRL** or **ALT** button in the extra keys bar (it turns blue)
2. Type a letter on the soft keyboard
3. The modifier is applied and auto-clears

> [!NOTE]
> Modifiers auto-clear after 5 seconds if no key is pressed.

### Terminal not scrolling

wterm has limited scrollback support on Android. If you need full scrollback,
this is a known limitation — see [Limitations](../README.md#limitations).

### Keyboard covers terminal

The app uses `adjustResize` — the terminal shrinks when the keyboard opens.
If the keyboard still covers content, make sure your Android WebView is
up to date.

---

## App

### "Built for older Android" popup

This is expected. Terax uses `targetSdk=28` to bypass Android 10+ W^X
(Write XOR Execute) SELinux policy, which blocks running binaries from
app data directories. Same approach as Termux.

### Screen turns off during long commands

Wake lock should keep the screen on while the terminal is visible. If it
doesn't work, your device manufacturer may have aggressive battery
optimization. Check:
**Settings → Apps → Terax → Battery → Unrestricted**

### "Check for Updates" fails

The in-app updater is not yet configured. Download updates manually from
[GitHub Releases](https://github.com/zico20047/terax-ai-android/releases).

### Landscape shows tablet layout on phone

On small phones, landscape mode may show the desktop/tablet layout instead
of the mobile UI. This is a known bug. Use portrait mode for now.
