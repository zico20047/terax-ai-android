# Terax Android — Technical Paper

## What We Built

Terax Android is a mobile port of terax-ai that gives you a **real terminal**
with bash, apt, dpkg, python, pip — running entirely inside an Android app.

Tested on: Huawei MatePad 11.5" (HarmonyOS), aarch64.

---

## The Problem

Termux has a complete package ecosystem (~1000+ packages compiled for Android).
We embed the official Termux bootstrap (~3650 files) and redirect all paths.

The challenge: Termux binaries have `/data/data/com.termux/files/...` hardcoded.
Our app is `app.crynta.terax`. Binary patching is impossible —
`com.termux` (10 chars) is shorter than `app.crynta.terax` (17 chars),
and strings in ELF `.rodata` are tightly packed with no room to expand.

---

## Solution: LD_PRELOAD Path Translator

A C shared library (`libterax-path-translate.so`) loaded via `LD_PRELOAD` that
intercepts **30+ filesystem syscalls** and translates paths at runtime.

### How It Works

```
User runs: apt update
  ↓
bash calls execve("/data/data/com.termux/files/usr/bin/apt")
  ↓
Our LD_PRELOAD intercepts execve()
  translates → /data/data/app.crynta.terax/files/usr/bin/apt
  ↓
apt runs, calls open("/data/data/com.termux/files/usr/etc/apt/sources.list")
  ↓
Our LD_PRELOAD intercepts open()
  translates → /data/data/app.crynta.terax/files/usr/etc/apt/sources.list
  ↓
File opened successfully from our data directory
```

### Intercepted Functions (30+)

| Category    | Functions                                                      |
|-------------|----------------------------------------------------------------|
| File open   | `open`, `open64`, `openat`, `openat64`                         |
| File stat   | `stat`, `stat64`, `lstat`, `lstat64`, `fstatat`                |
| Filesystem  | `statvfs`, `statfs`                                            |
| File access | `access`, `faccessat`                                          |
| Directory   | `opendir`, `opendir64`, `mkdir`, `mkdirat`, `rmdir`            |
| File ops    | `unlink`, `unlinkat`, `rename`, `renameat`                     |
| Symlink     | `symlink`, `symlinkat`, `readlink`, `readlinkat`               |
| Permissions | `chmod`, `fchmodat`                                            |
| Timestamps  | `utimes`, `utimensat`, `futimesat`                             |
| Resolve     | `realpath`                                                     |
| Process     | `execve` (script-aware), `chdir`                               |

### Dual-Buffer translate()

`rename(old, new)` calls translate() twice. With one buffer, the second call
overwrites the first → `rename(new, new)` → ENOENT.

Fix: two thread-local buffers, alternating per call.

### Script-Aware execve()

**Problem:** dpkg's postinst scripts have shebangs like
`#!/data/data/com.termux/files/usr/bin/sh`. The kernel reads shebangs internally
(after our intercept) and tries to exec the interpreter. SELinux blocks access
to `/data/data/com.termux/` → EACCES.

**Fix:** Our `execve()` detects scripts (`#!`), reads the interpreter from the
shebang, translates it, and executes the interpreter directly — bypassing the
kernel's shebang resolution.

```
execve("/data/data/com.termux/.../postinst") intercepted
  ↓
Detect: file starts with #!/data/data/com.termux/files/usr/bin/sh
  ↓
Translate interpreter → /data/data/app.crynta.terax/files/usr/bin/sh
  ↓
Execute: /data/data/app.crynta.terax/.../sh /data/data/app.crynta.terax/.../postinst
  ↓
Script runs correctly ✓
```

---

## Bootstrap Process

```
1. Check marker version (v15) — if mismatch, full re-extract
2. Extract bootstrap-aarch64.zip → $PREFIX/ (~3650 files)
3. Process SYMLINKS.txt (patch paths, create symlinks)
4. Patch text scripts (replace com.termux → app.crynta.terax)
5. Patch ELF binaries (clear DT_RUNPATH to empty)
6. Write apt config (AllowInsecureRepositories, methods override)
7. Write sources.list with [trusted=yes]
8. Patch pkg script to always add [trusted=yes]
9. Remove old-format GPG keyrings (suppress warnings)
10. Write shell profile (.profile with LD_PRELOAD, LD_LIBRARY_PATH, etc.)
11. Install path translator (.so → $PREFIX/lib/)
12. Fix permissions (dirs 0o755, ALL ELF files 0o755)
13. Create missing dirs (apt lists/partial, dpkg/triggers, etc.)
14. Write marker file
```

---

## Key Technical Fixes (In Order of Discovery)

### 1. W^X Bypass (targetSdk = 28)

Android 10+ blocks `execve()` from app data dirs for targetSdk >= 29.
Fix: `targetSdk = 28` in build.gradle.kts (same as Termux).

### 2. DT_RUNPATH Clearing

ELF binaries have `DT_RUNPATH=/data/data/com.termux/files/usr/lib`.
The dynamic linker uses direct syscalls (not libc), so LD_PRELOAD can't
intercept library loading. Clearing RUNPATH forces use of LD_LIBRARY_PATH.

### 3. chdir() Intercept (Exit Code 100)

apt's `fileutl.cc` calls `chdir("/data/data/com.termux/files/usr/tmp/")`
before exec-ing method binaries. Without intercept, SELinux blocks it
and the child calls `_exit(100)`.

### 4. Dual-Buffer translate()

Single buffer made `rename(old, new)` → `rename(new, new)` → ENOENT.
apt couldn't rename InRelease files in partial/.

### 5. apt Config (DO NOT override Dir)

> [!WARNING]
> Setting `Dir "/"` was a mistake. It changes where apt looks for config files
> (`/etc/apt/` instead of our prefix), so our `99terax` config was never read.
> `AllowInsecureRepositories` had no effect. 

Correct approach: **do not override `Dir`**. The compiled-in default
(`/data/data/com.termux/files/usr/`) works correctly — LD_PRELOAD translates
all paths at runtime. Compiled-in paths already start with the compiled-in
Dir, so `FindFile()` doesn't double them.

Config (`99terax`) contains:
- `Dir::Bin::methods` — explicit path to apt method binaries (safety)
- `AllowInsecureRepositories "true"` — backup in case `[trusted=yes]` is missing
- `AllowDowngradeToInsecureRepositories "true"`

### 6. [trusted=yes] in sources.list

gpgv 2.5.17 has a known regression ("unsupported filetype" on all
bootstrap keyring files). Also key 5A897D96E57CF20C is missing from
termux-keyring 3.13 (the latest version). `[trusted=yes]` bypasses GPG entirely.

### 7. pkg Script Patched

`pkg` overwrites sources.list when picking a mirror, removing `[trusted=yes]`.
Fix: patch the pkg script at bootstrap to always add `[trusted=yes]`.

### 8. Old GPG Keyrings Removed

Bootstrap deletes `*.gpg` files from `trusted.gpg.d/` to suppress
"unsupported filetype" warnings. termux-keyring 3.13 doesn't have key
5A897D96E57CF20C, so GPG verification can't work until a newer keyring is released.

### 9. ELF Permissions (ALL ELF files)

Not just `bin/` — apt methods live in `lib/apt/methods/`, dpkg helpers
in `lib/dpkg/`. ALL files with ELF magic bytes get chmod 0o755.

### 10. utimes/utimensat/futimesat Intercepts

apt sets modification time on downloaded files. Without intercept,
`utimes("/data/data/com.termux/...")` → EACCES → Packages file truncated.

### 11. Script-Aware execve()

Kernel reads shebangs internally, can't translate interpreter paths.
Our execve() detects `#!`, translates the interpreter, executes directly.
Fixes dpkg postinst scripts, pip, and all script-based binaries.

### 12. Marker Version Check

Old code: `if !marker.exists()` — skipped bootstrap on any existing marker.
Fix: `if marker_content != MARKER_VERSION` — forces re-bootstrap on version change.

### 13. statvfs / statfs Intercepts

apt calls `statvfs("/data/data/com.termux/cache/apt/archives/")` to check
free space before downloading packages. Without intercept → EACCES →
`apt install` fails with "Couldn't determine free space".

---

## What Works (v15)

- bash login shell with .profile
- coreutils (ls, cd, cat, cp, mv, rm, it's basic but works)
- **apt update** — downloads InRelease + Packages, builds dependency tree
- **apt search** — searches all 1000+ Termux packages
- **apt install** — downloads, unpacks, configures packages
- **dpkg postinst scripts** — run correctly (shebang-aware execve)
- **Python 3.13** — interactive mode, scripts, pip
- **pip** — installs Python packages
- **statvfs** — apt can check free space (no more "Permission denied")
- pkg — mirror testing and selection works
- AI chat works (OpenAI-compatible endpoints)
- File explorer (required storage. workspace: /storage/emulated/0/)

---

## Remaining Work

### GPG Warning (Cosmetic)

```
W: GPG error: ... NO_PUBKEY 5A897D96E57CF20C
```

termux-keyring 3.13 (latest) doesn't include key 5A897D96E57CF20C.
This is a **warning only** — apt update and apt install work fine with
`[trusted=yes]`. Will be fixed when Termux releases a newer keyring.

### dpkg Database Writes

dpkg has some issues with trigger file renames. Packages install and work,
but dpkg reports some configuration errors that are non-fatal.

### "Built for Older Android" Warning

Setting targetSdk=28 causes Android to show a warning popup on each launch.
This is cosmetic (Termux does the same).

---

## File Reference

| File | Purpose |
|------|---------|
| `src-tauri/src/modules/bootstrap.rs` | Bootstrap extraction, patching, apt config, sources.list, pkg patching, keyring cleanup |
| `src-tauri/src/modules/path-translate/path-translate.c` | LD_PRELOAD C source (30+ intercepts, dual-buffer, script-aware execve) |
| `src-tauri/src/modules/mod.rs` | PTY setup, shell exec with env vars |
| `src-tauri/src/lib.rs` | App .setup() calls ensure_bootstrapped() |
| `src-tauri/gen/android/app/build.gradle.kts` | targetSdk=28, compileSdk=36 |
| `src-tauri/gen/android/app/src/main/assets/bootstrap-aarch64.zip` | Termux bootstrap (30MB) |
| `src-tauri/gen/android/app/src/main/jniLibs/arm64-v8a/libterax-path-translate.so` | Compiled translator |

---

## Environment Variables (Shell Profile but tested research)

```bash
export HOME=/data/data/app.crynta.terax/files/home
export PREFIX=/data/data/app.crynta.terax/files/usr
export PATH=$PREFIX/bin:$PREFIX/bin/applets:/system/bin:/system/xbin
export TMPDIR=$PREFIX/tmp
export LD_LIBRARY_PATH=$PREFIX/lib
export LD_PRELOAD=$PREFIX/lib/libterax-path-translate.so
export TERM=xterm-256color
export LANG=en_US.UTF-8
```

---

## Path Translation Reference (com.termux paths are translated to app.crynta.terax)

| Termux Path | Terax Path |
|---|---|
| `/data/data/com.termux/files/usr/bin/bash` | `/data/data/app.crynta.terax/files/usr/bin/bash` |
| `/data/data/com.termux/files/usr/lib/libc.so` | `/data/data/app.crynta.terax/files/usr/lib/libc.so` |
| `/data/data/com.termux/files/home/.bashrc` | `/data/data/app.crynta.terax/files/home/.bashrc` |
| `/data/data/com.termux/cache/apt/archives/` | `/data/data/app.crynta.terax/cache/apt/archives/` |

Prefix: `/data/data/com.termux` (21 chars) → `/data/data/app.crynta.terax` (25 chars)

---

## Timeline

| Version | Fix |
|---|---|
| v1-v5 | Bootstrap extraction, symlink processing, text patching |
| v6 | DT_RUNPATH clearing, W^X bypass (targetSdk=28) |
| v7 | chdir() intercept (exit code 100), broadened prefix |
| v8 | Dual-buffer translate(), utimes intercept |
| v9 | apt config (Dir, methods, cache), ELF permissions |
| v10 | AllowInsecureRepositories, utimes/utimensat/futimesat |
| v11 | [trusted=yes] in sources.list, pkg script patched, marker version check |
| v12 | Script-aware execve() (shebang translation) |
| v13 | GPG keyring cleanup (suppress warnings) |
| v14 | Removed Dir "/" (was breaking config loading) |
| v15 | statvfs/statfs intercepts (fixes apt install free space check) |
