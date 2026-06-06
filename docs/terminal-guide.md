## Terminal Basics

Terax includes a full terminal powered by the official Termux bootstrap.
You get **bash**, **coreutils**, **apt**, **dpkg**, and access to 1000+ packages.

### Shell

- Default shell: **bash** (login mode, sources `~/.profile`)
- Prompt shows current directory
- Tab completion works
- Ctrl+C to cancel, Ctrl+D to exit

### Key Paths

| Variable   | Path                                          |
|------------|-----------------------------------------------|
| `$HOME`    | `/data/data/app.crynta.terax/files/home`      |
| `$PREFIX`  | `/data/data/app.crynta.terax/files/usr`       |
| `$TMPDIR`  | `$PREFIX/tmp`                                 |
| Storage    | `/storage/emulated/0/`                        |

### Navigation

```bash
cd /storage/emulated/0    # Go to shared storage
cd ~                      # Go home
cd $PREFIX                # Go to prefix (/usr)
ls -la                    # List files with details
pwd                       # Show current directory
```

---

## Package Management — apt

### Update package lists

```bash
apt update
```

Downloads the latest package index from the Termux repository.
You should run this before installing or searching for packages.

> **Note:** You may see a GPG warning (`NO_PUBKEY`). This is cosmetic —
> apt update still succeeds. Ignore it.

### Search for packages

```bash
apt search package-name      
apt show package-name          
apt list --installed    
apt list --upgradable   
```
 

---

## Package Management — pkg

`pkg` is a Termux wrapper around apt with extra features like mirror selection.

```bash
pkg update
pkg install [package-name]
pkg search [package-name]
``` 


> **Note:** When `pkg` picks a mirror, it rewrites `sources.list`. The Terax
> bootstrap patches `pkg` to always include `[trusted=yes]` so GPG warnings
> don't block package installation.



## File Access

### Shared storage

```bash
cd /storage/emulated/0     # Internal storage
ls                         # List files
```

Grant storage permission: Settings → Apps → Terax → Permissions →
Files and media → Allow all files.

### Copy between home and storage

```bash
cp ~/myfile.txt /storage/emulated/0/Documents/
cp /storage/emulated/0/Download/script.sh ~/
```

---

## Troubleshooting

### GPG warnings

```
W: GPG error: ... NO_PUBKEY 5A897D96E57CF20C
```

This is a **warning**, not an error. apt update and apt install work fine.
To suppress: the Termux project needs to release an updated keyring.

### "Permission denied" on scripts

If a script lacks execute permission:

```bash
chmod +x script.sh
./script.sh
```

### dpkg postinst errors

If dpkg reports errors during package configuration:

```bash
dpkg --configure -a        # Try to finish pending configurations
apt install -f             # Fix broken dependencies
```

### "No space left on device"

```bash
apt clean                  # Clear downloaded .deb cache
df -h $PREFIX              # Check disk space
```
