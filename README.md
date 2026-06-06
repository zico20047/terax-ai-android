# Terax Android

<p align="center">
  <img src="https://img.shields.io/badge/status-beta-orange" alt="status" />
  <img src="https://img.shields.io/badge/platform-Android%20%7C%20HarmonyOS-green" alt="platform" />
  <img src="https://img.shields.io/badge/arch-aarch64-blue" alt="arch" />
  <br />
  <img src="https://img.shields.io/badge/license-Apache--2.0-blue" alt="license" />
  <img src="https://img.shields.io/badge/bootstrap-Termux-000000" alt="termux" />
</p>

> [!WARNING]
> **Beta software.** This project is in early development. Expect bugs,
> breaking changes, and missing features. Not recommended for production use.

> [!CAUTION]
> Tested on Huawei MatePad (HarmonyOS). Other Android/HarmonyOS devices
> may have different SELinux policies. dpkg may report errors during package
> installation — packages still work, errors are non-fatal.

A terminal app for Android tablets and phones with bash and apt package manager.

> [!NOTE]
> This is a fork of [terax-ai](https://github.com/crynta/terax-ai) by [@zico20047](https://github.com/zico20047).

## Screenshots

<p align="center">
  <em>Screenshots coming soon</em>
</p>

<!-- Add screenshots here when ready:

### Tablet

<p align="center">
  <img src="docs/screenshots/tablet-terminal.png" width="600" alt="Terminal on tablet" />
  <img src="docs/screenshots/tablet-ai-chat.png" width="600" alt="AI Chat on tablet" />
  <img src="docs/screenshots/tablet-files.png" width="600" alt="File Explorer on tablet" />
</p>

### Phone

<p align="center">
  <img src="docs/screenshots/phone-terminal.png" width="280" alt="Terminal on phone" />
  <img src="docs/screenshots/phone-ai-chat.png" width="280" alt="AI Chat on phone" />
  <img src="docs/screenshots/phone-files.png" width="280" alt="File Explorer on phone" />
</p>

-->

## Features

- **bash terminal** with coreutils
- **apt package manager** — install python, nodejs, git, vim, and more
- **AI Chat** — OpenAI-compatible endpoints
- **File Explorer** — browse shared storage
- **Responsive UI** — tablet uses desktop layout, phone uses mobile nav

## Quick Start

```bash
apt update
apt install python
python --version
```

See [Terminal Guide](docs/terminal-guide.md) for full usage.

## Requirements

- Android or HarmonyOS device with aarch64
- ~500MB free space

## Documentation

| Document | Description |
|----------|-------------|
| [How to Install](docs/how-to-install.md) | Prerequisites, build, install on device |
| [Terminal Guide](docs/terminal-guide.md) | apt, pkg, popular packages |
| [Architecture](docs/architecture.md) | LD_PRELOAD, path translation, bootstrap |
| [Troubleshooting](docs/Troubleshoots.md) | Common issues and solutions |
| [Technical Paper](docs/Paper.md) | Full technical details and history |

## Limitations

- **Beta** — expect bugs and breaking changes
- **GPG warning** — apt shows `NO_PUBKEY` — cosmetic, packages install fine
- **dpkg errors** — some postinst scripts may fail — non-fatal

## Credits

- [Termux](https://termux.dev) — bootstrap binaries and package repository
- [terax-ai](https://github.com/crynta/terax-ai) — AI development environment
- [Tauri](https://tauri.app) — app framework
- [xterm.js](https://xtermjs.org) — terminal emulator

## License

Apache License 2.0 — see [LICENSE](LICENSE)

The Termux bootstrap is licensed under GPLv3 — see [Termux licenses](https://github.com/termux/termux-app/blob/master/LICENSE.md)
