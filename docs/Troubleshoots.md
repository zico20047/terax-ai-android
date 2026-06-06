
# Troubleshooting
i'm sure early beta
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

### Build takes too long
i'm not sure lower-end devices can build the APK within a reasonable time. The first build downloads Gradle and builds native code (~10 min). Subsequent builds use cache (5 min).

### APK too large
>[!NOTE]
>HarmonyOS requires aarch64 only. Use `--target aarch64` to build arm64-only.
Use `--target aarch64` to build arm64-only
Without it, the universal APK includes all architectures

what you want build for (arm64, x86_64, arm32) With it, `--target [change this to your target]` 