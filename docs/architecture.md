## Overview

Terax Android runs a full terminal environment inside an Android app by embedding
the official Termux bootstrap and translating paths at runtime.

## The Path Problem

Termux binaries have `/data/data/com.termux/files/usr/...` hardcoded.
Our app is `app.crynta.terax`. Binary patching is impossible because
`com.termux` (10 chars) is shorter than `app.crynta.terax` (17 chars).

## Solution: LD_PRELOAD

A C shared library intercepts 30+ syscalls and translates paths:

```
/data/data/com.termux/files/usr/bin/bash
        ↓ translate()
/data/data/app.crynta.terax/files/usr/bin/bash
```

### Intercepted Functions

| Category    | Functions                                                      |
|-------------|----------------------------------------------------------------|
| File I/O    | open, openat, stat, lstat, fstatat, statvfs, statfs           |
| Access      | access, faccessat                                              |
| Directory   | opendir, mkdir, rmdir                                          |
| File ops    | unlink, rename, symlink, readlink                              |
| Permissions | chmod, fchmodat                                                |
| Timestamps  | utimes, utimensat, futimesat                                   |
| Process     | execve (script-aware shebang handling), chdir                  |
| Resolve     | realpath                                                       |

### Key Design Decisions

**Dual-buffer translate():** `rename(old, new)` calls translate twice.
Single buffer → both point to same result → ENOENT. Two buffers fix this.

**Script-aware execve():** The kernel reads `#!shebang` internally.
If shebang points to `/data/data/com.termux/...`, kernel gets EACCES.
Fix: detect scripts, translate interpreter, exec directly.

**DT_RUNPATH clearing:** Dynamic linker uses direct syscalls (bypasses
LD_PRELOAD). Clear RUNPATH → linker falls back to LD_LIBRARY_PATH.

## Bootstrap (v15)

Marker file tracks version. On mismatch → full re-extract:

1. Extract ~3650 files from bootstrap zip
2. Process symlinks (patch paths)
3. Patch text scripts (replace com.termux paths)
4. Clear DT_RUNPATH in all ELF binaries
5. Write apt config + sources.list with [trusted=yes]
6. Patch pkg script to maintain [trusted=yes]
7. Remove old GPG keyrings (suppress warnings)
8. Write shell profile (LD_PRELOAD, LD_LIBRARY_PATH, etc.)
9. Fix permissions (ELF → 0o755, dirs → 0o755)
10. Write marker

## Android Config

- `targetSdk = 28` — bypasses W^X (execve from app data dir) HarmonyOS issues
- `compileSdk = 36` — latest API features
- APK: arm64-v8a only (~127MB debug)