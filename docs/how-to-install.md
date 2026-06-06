## 1. Install Prerequisites

#### Option A: Android Studio (recommended)

1. Download [Android Studio](https://developer.android.com/studio)
2. Open → **Tools → SDK Manager**
3. **SDK Platforms** tab → check **Android 15.0 (API 36)**
4. **SDK Tools** tab → check:
   - **Android SDK Build-Tools**
   - **Android SDK Command-line Tools**
   - **NDK (Side by side)** → select **29.0.13846066**

> [!NOTE]
> Don't see NDK **29.0.13846066** in the list?
> Check **Show Package Details** at the bottom right to see all versions.

#### Option B: Command line only

```bash
# Install cmdline-tools from:
# https://developer.android.com/studio#command-line-tools-only

sdkmanager "platforms;android-36"
sdkmanager "build-tools;36.0.0"
sdkmanager "ndk;29.0.13846066"
```

#### Verify NDK installation
The compiler should exist at:
```bash

Windows: %LOCALAPPDATA%\Android\Sdk\ndk\29.0.13846066\toolchains\llvm\prebuilt\windows-x86_64\bin\
Linux:   ~/Android/Sdk/ndk/29.0.13846066/toolchains/llvm/prebuilt/linux-x86_64/bin/
macOS:   ~/Library/Android/sdk/ndk/29.0.13846066/toolchains/llvm/prebuilt/darwin-x86_64/bin/

# Check:
ls <ndk-path>/bin/aarch64-linux-android28-clang*
```

> [!WARNING]
> NDK **29.0.13846066** is required. Other NDK versions may work but are
> not tested. The API level **28** in the compiler name must match the
> `targetSdk` in `build.gradle.kts`.

---

## 2. Clone and Build

### Clone the repository

```bash
git clone https://github.com/zico20047/terax-ai-android.git
cd terax-ai-android
pnpm install
```

### Download Termux bootstrap

> [!IMPORTANT]
> The bootstrap zip is **not included** in the repo (30MB). You must download it before building.

```bash
# Download the official Termux aarch64 bootstrap
curl -L -o src-tauri/gen/android/app/src/main/assets/bootstrap-aarch64.zip \
  https://github.com/termux/termux-packages/releases/download/bootstrap-2024.10.15/bootstrap-aarch64.zip
```

Or download manually from [Termux releases](https://github.com/termux/termux-packages/releases) and place it at:
```
src-tauri/gen/android/app/src/main/assets/bootstrap-aarch64.zip
```

### Compile the path translator (LD_PRELOAD library)

> [!TIP]
> A pre-compiled `.so` is included in the repo. **Skip this step** unless
> you modified `path-translate.c`.

#### Windows

```powershell
# Find your NDK path — check these common locations:
# C:\Users\<user>\AppData\Local\Android\Sdk\ndk\29.0.13846066\
# C:\Program Files\Android\SDK\ndk\29.0.13846066\

# Set NDK_CLANG to your compiler path:
$NDK_CLANG = "$env:LOCALAPPDATA\Android\Sdk\ndk\29.0.13846066\toolchains\llvm\prebuilt\windows-x86_64\bin\aarch64-linux-android28-clang.cmd"

& $NDK_CLANG -shared -fPIC -O2 `
  -o src-tauri/gen/android/app/src/main/jniLibs/arm64-v8a/libterax-path-translate.so `
  src-tauri/src/modules/path-translate/path-translate.c `
  -ldl
```

#### Linux / macOS

```bash
NDK_CLANG="$HOME/Android/Sdk/ndk/29.0.13846066/toolchains/llvm/prebuilt/linux-x86_64/bin/aarch64-linux-android28-clang"

$NDK_CLANG -shared -fPIC -O2 \
  -o src-tauri/gen/android/app/src/main/jniLibs/arm64-v8a/libterax-path-translate.so \
  src-tauri/src/modules/path-translate/path-translate.c \
  -ldl
```

### Build the APK
> [!WARNING]
> This aarch64 
```bash
pnpm tauri android build --debug --apk --target universal 
```

Output:
```
src-tauri/gen/android/app/build/outputs/apk/universal/debug/app-universal-debug.apk
```

---

## 3. Install on Device

### Enable USB debugging

1. **Settings → About tablet** → tap **Build number** 7 times
2. **Settings → Developer options** → enable **USB debugging**
3. Connect USB cable → allow debugging on device

> [!CAUTION]
> On HarmonyOS, the Developer options menu may be under
> **Settings → System & updates → Developer options**.

### Install APK via USB

```powershell
# Verify device is connected
adb devices

# Uninstall old version (if any)
adb shell pm uninstall app.crynta.terax

# Push APK to device
adb push '<apk-path>' /data/local/tmp/terax.apk

# Install
adb shell pm install /data/local/tmp/terax.apk
```

> [!WARNING]
> Use **PowerShell** (Windows) for adb commands. Git Bash mangles
> Linux-style paths (`/data/local/tmp/` → `C:/Program Files/Git/data/...`).

### Grant storage permission

After installation:

**Settings → Apps → Terax → Permissions → Files and media → Allow all files**

---

## 4. Verify

Launch Terax and run in the terminal:

```bash
apt update
apt install python
python --version
```

You should see `Python 3.13.x`.

## Quick Reference

| What | Path / Command |
|------|----------------|
| APK output | `src-tauri/gen/android/app/build/outputs/apk/universal/debug/app-universal-debug.apk` |
| NDK compiler (Windows) | `%LOCALAPPDATA%\Android\Sdk\ndk\29.0.13846066\toolchains\llvm\prebuilt\windows-x86_64\bin\aarch64-linux-android28-clang.cmd` |
| NDK compiler (Linux) | `~/Android/Sdk/ndk/29.0.13846066/toolchains/llvm/prebuilt/linux-x86_64/bin/aarch64-linux-android28-clang` |
| Install APK | `adb shell pm install /data/local/tmp/terax.apk` |
| Uninstall | `adb shell pm uninstall app.crynta.terax` |
