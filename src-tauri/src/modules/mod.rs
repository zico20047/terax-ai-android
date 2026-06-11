pub mod agent;
pub mod fs;
pub mod git;
pub mod net;
pub mod proc;
#[cfg(not(target_os = "android"))]
pub mod pty;
#[cfg(target_os = "android")]
pub mod bootstrap;
#[cfg(target_os = "android")]
pub mod pty {
    use std::collections::HashMap;
    use std::fs;
    use std::io::{Read, Write};
    use std::os::fd::{FromRawFd, IntoRawFd, RawFd};
    use std::sync::atomic::{AtomicBool, AtomicU32, Ordering};
    use std::sync::{Arc, Condvar, Mutex, RwLock};
    use std::thread;
    use std::time::Duration;

    use nix::pty::{openpty, OpenptyResult, Winsize};
    use nix::sys::signal::{self, Signal};
    use nix::sys::wait::waitpid;
    use nix::unistd::{self, ForkResult, Pid, setsid};
    use tauri::ipc::{Channel, Response};

    // ── Session ──────────────────────────────────────────────────────

    struct InnerSession {
        master_fd: RawFd,
        child_pid: Pid,
        writer: Arc<Mutex<fs::File>>,
        done: Arc<AtomicBool>,
    }

    impl Drop for InnerSession {
        fn drop(&mut self) {
            // Signal reader/writer threads to stop
            self.done.store(true, Ordering::Release);
            // Kill child process
            let _ = signal::kill(self.child_pid, Signal::SIGKILL);
            // Do NOT close self.master_fd here — it's owned by the reader
            // thread's std::fs::File. Closing it here causes a double-close
            // which triggers Rust's IO Safety violation abort.
            // The reader thread will close it when it drops the File on exit.
        }
    }

    pub struct PtyState {
        sessions: RwLock<HashMap<u32, Arc<InnerSession>>>,
        next_id: AtomicU32,
    }

    impl Default for PtyState {
        fn default() -> Self {
            Self {
                sessions: RwLock::new(HashMap::new()),
                next_id: AtomicU32::new(1),
            }
        }
    }

    // Constants matching desktop session.rs
    const FLUSH_COALESCE: Duration = Duration::from_millis(4);
    const FLUSH_MAX_IDLE: Duration = Duration::from_millis(50);
    const READ_BUF: usize = 16 * 1024;
    const MAX_PENDING: usize = 4 * 1024 * 1024;
    const OVERFLOW_NOTICE: &[u8] =
        b"\x1bc\x1b[2m[terax: dropped output due to backpressure]\x1b[0m\r\n";

    /// Find the shell to exec. Returns (binary_to_exec, argv).
    /// With targetSdk=28, W^X is not enforced, so we can exec bash directly.
    fn find_shell() -> (String, Vec<String>) {
        let bash = crate::modules::bootstrap::bash_path();

        if bash.exists() {
            log::info!("pty: using bash: {}", bash.display());
            return (
                bash.to_string_lossy().to_string(),
                vec!["bash".to_string(), "-l".to_string()], // -l = login shell (sources .profile)
            );
        }

        // Fallback: system shell
        log::warn!("pty: bash not found at {}, falling back to /system/bin/sh", bash.display());
        (
            "/system/bin/sh".to_string(),
            vec!["sh".to_string()],
        )
    }

    // ── pty_open ─────────────────────────────────────────────────────

    #[tauri::command]
    #[allow(clippy::too_many_arguments)]
    pub async fn pty_open(
        app: tauri::AppHandle,
        state: tauri::State<'_, PtyState>,
        _registry: tauri::State<'_, crate::modules::workspace::WorkspaceRegistry>,
        cols: u16,
        rows: u16,
        cwd: Option<String>,
        _workspace: Option<crate::modules::workspace::WorkspaceEnv>,
        on_data: Channel<Response>,
        on_exit: Channel<i32>,
    ) -> Result<u32, String> {
        let id = state.next_id.fetch_add(1, Ordering::Relaxed);

        let session = tauri::async_runtime::spawn_blocking(move || {
            spawn_pty(id, &app, cols, rows, cwd, on_data, on_exit)
        })
        .await
        .map_err(|e| format!("pty_open join: {e}"))?
        .map_err(|e| format!("pty_open: {e}"))?;

        state.sessions.write().unwrap().insert(id, session);
        log::info!("pty opened id={id} cols={cols} rows={rows}");
        Ok(id)
    }

    #[allow(clippy::too_many_arguments)]
    fn spawn_pty(
        id: u32,
        _app: &tauri::AppHandle,
        cols: u16,
        rows: u16,
        cwd: Option<String>,
        on_data: Channel<Response>,
        on_exit: Channel<i32>,
    ) -> Result<Arc<InnerSession>, String> {
        let win = Winsize {
            ws_row: rows,
            ws_col: cols,
            ws_xpixel: 0,
            ws_ypixel: 0,
        };

        let OpenptyResult { master, slave } =
            openpty(Some(&win), None).map_err(|e| format!("openpty: {e}"))?;

        // Convert to raw fds BEFORE fork to avoid OwnedFd drop issues in child.
        // Rust's IO Safety abort fires when OwnedFd::drop closes an already-closed fd,
        // which can happen after fork() in multi-threaded apps.
        let master_raw = master.into_raw_fd();
        let slave_raw = slave.into_raw_fd();

        match unsafe { unistd::fork() }.map_err(|e| format!("fork: {e}"))? {
            ForkResult::Child => {
                // ── Child process ─────────────────────────────────
                // Close master in child
                unsafe { libc::close(master_raw); }

                // Create new session and set slave as controlling terminal
                let _ = setsid();

                // Set slave as controlling TTY (TIOCSCTTY)
                unsafe {
                    libc::ioctl(slave_raw, libc::TIOCSCTTY as _, 0);
                }

                // Dup slave fd to stdin/stdout/stderr
                unsafe {
                    libc::dup2(slave_raw, 0);
                    libc::dup2(slave_raw, 1);
                    libc::dup2(slave_raw, 2);
                }
                if slave_raw > 2 {
                    unsafe { libc::close(slave_raw); }
                }

                if let Some(ref dir) = cwd {
                    // Try the requested cwd, fall back to HOME on failure
                    if std::env::set_current_dir(dir).is_err() {
                        let _ = std::env::set_current_dir(&crate::modules::bootstrap::home_dir());
                    }
                } else {
                    let _ = std::env::set_current_dir(&crate::modules::bootstrap::home_dir());
                }

                // Set up Termux-style environment using our bootstrap
                let home = crate::modules::bootstrap::home_dir();
                let prefix = crate::modules::bootstrap::prefix_dir();
                let terax_path = crate::modules::bootstrap::shell_path();
                let lib_dir = crate::modules::bootstrap::lib_dir();
                let bash = crate::modules::bootstrap::bash_path();

                std::env::set_var("TERM", "xterm-256color");
                std::env::set_var("COLORTERM", "truecolor");
                std::env::set_var("HOME", &home);
                std::env::set_var("PREFIX", &prefix);
                std::env::set_var("TMPDIR", crate::modules::bootstrap::tmp_dir());
                std::env::set_var("PATH", &terax_path);
                std::env::set_var("SHELL", &bash);
                std::env::set_var("EDITOR", "vi");
                // LD_LIBRARY_PATH so dynamically linked binaries find their .so files
                std::env::set_var("LD_LIBRARY_PATH", &lib_dir);
                // LD_PRELOAD: path translator — intercepts open/stat/access and
                // translates /data/data/com.termux/files → /data/data/app.crynta.terax/files
                let path_translate = lib_dir.join("libterax-path-translate.so");
                if path_translate.exists() {
                    std::env::set_var("LD_PRELOAD", &path_translate);
                    log::info!("pty: LD_PRELOAD = {}", path_translate.display());
                }
                // Tell linker to use our prefix as well
                std::env::set_var("LANG", "en_US.UTF-8");
                std::env::set_var("LC_ALL", "en_US.UTF-8");

                // Ensure we start in HOME if no cwd was specified
                if cwd.is_none() {
                    let _ = std::env::set_current_dir(&home);
                }

                let (shell, shell_args) = find_shell();
                let shell_c = std::ffi::CString::new(shell).unwrap();
                let argv: Vec<std::ffi::CString> = shell_args
                    .iter()
                    .map(|s| std::ffi::CString::new(s.as_str()).unwrap())
                    .collect();
                let argv_refs: Vec<&std::ffi::CString> = argv.iter().collect();
                let _ = unistd::execvp(&shell_c, &argv_refs);
                // exec failed
                unsafe { libc::_exit(1); }
            }
            ForkResult::Parent { child } => {
                // Close slave in parent (raw fd — no OwnedFd drop)
                unsafe { libc::close(slave_raw); }

                // Dup master fd for writer (separate file handle)
                let writer_fd = unsafe { libc::dup(master_raw) };
                if writer_fd < 0 {
                    let _ = signal::kill(child, Signal::SIGKILL);
                    return Err("dup master fd failed".to_string());
                }
                let writer = Arc::new(Mutex::new(unsafe { fs::File::from_raw_fd(writer_fd) }));

                let done = Arc::new(AtomicBool::new(false));
                let pending: Arc<(Mutex<Vec<u8>>, Condvar)> = Arc::new((
                    Mutex::new(Vec::with_capacity(READ_BUF)),
                    Condvar::new(),
                ));

                // ── Reader thread ─────────────────────────────────
                // Save master fd for resize ioctl before giving ownership to File
                let session_master_fd = master_raw;
                // Convert raw fd to File for reading (takes ownership)
                let mut reader = unsafe { fs::File::from_raw_fd(master_raw) };

                let pending_r = pending.clone();
                let _done_r = done.clone();
                let child_pid = child;

                thread::Builder::new()
                    .name(format!("terax-pty-reader-{id}"))
                    .spawn(move || {
                        let mut buf = [0u8; READ_BUF];
                        let mut dropped_bytes: u64 = 0;
                        loop {
                            match reader.read(&mut buf) {
                                Ok(0) => break,
                                Ok(n) => {
                                    let (lock, cv) = &*pending_r;
                                    let mut g = lock.lock().unwrap();
                                    if g.len() + n > MAX_PENDING {
                                        dropped_bytes += g.len() as u64;
                                        g.clear();
                                        g.extend_from_slice(OVERFLOW_NOTICE);
                                    }
                                    g.extend_from_slice(&buf[..n]);
                                    cv.notify_one();
                                }
                                Err(e) => {
                                    log::debug!("pty reader id={id}: read error: {e}");
                                    break;
                                }
                            }
                        }
                        pending_r.1.notify_one();
                        if dropped_bytes > 0 {
                            log::warn!("pty backpressure: dropped {dropped_bytes} bytes");
                        }
                    })
                    .expect("spawn pty reader thread");

                // ── Flusher thread ────────────────────────────────
                let on_data_flush = on_data.clone();
                let pending_f = pending.clone();
                let done_f = done.clone();

                thread::Builder::new()
                    .name(format!("terax-pty-flusher-{id}"))
                    .spawn(move || {
                        let (lock, cv) = &*pending_f;
                        loop {
                            {
                                let mut g = lock.lock().unwrap();
                                while g.is_empty() {
                                    if done_f.load(Ordering::Acquire) {
                                        return;
                                    }
                                    let (next, _) = cv.wait_timeout(g, FLUSH_MAX_IDLE).unwrap();
                                    g = next;
                                }
                            }
                            thread::sleep(FLUSH_COALESCE);
                            let chunk = std::mem::take(&mut *lock.lock().unwrap());
                            if chunk.is_empty() {
                                continue;
                            }
                            if let Err(e) = on_data_flush.send(Response::new(chunk)) {
                                log::debug!("pty flusher exiting, channel closed: {e}");
                                break;
                            }
                        }
                    })
                    .expect("spawn pty flusher thread");

                // ── Waiter thread ─────────────────────────────────
                let pending_e = pending;
                let done_e = done.clone();

                thread::Builder::new()
                    .name(format!("terax-pty-waiter-{id}"))
                    .spawn(move || {
                        // Wait for child to exit
                        let code = match waitpid(child_pid, None) {
                            Ok(nix::sys::wait::WaitStatus::Exited(_, code)) => code,
                            Ok(nix::sys::wait::WaitStatus::Signaled(_, sig, _)) => sig as i32,
                            Ok(_) => 0,
                            Err(_) => -1,
                        };
                        // Final flush
                        let (lock, cv) = &*pending_e;
                        let tail = std::mem::take(&mut *lock.lock().unwrap());
                        if !tail.is_empty() {
                            let _ = on_data.send(Response::new(tail));
                        }
                        done_e.store(true, Ordering::Release);
                        cv.notify_all();
                        let _ = on_exit.send(code);
                    })
                    .expect("spawn pty waiter thread");

                let session = Arc::new(InnerSession {
                    master_fd: session_master_fd,
                    child_pid: child,
                    writer,
                    done,
                });

                Ok(session)
            }
        }
    }

    // ── pty_write ────────────────────────────────────────────────────

    #[tauri::command]
    pub fn pty_write(
        state: tauri::State<PtyState>,
        id: u32,
        data: String,
    ) -> Result<(), String> {
        let session = state
            .sessions
            .read()
            .unwrap()
            .get(&id)
            .cloned()
            .ok_or_else(|| format!("no session id={id}"))?;
        session
            .writer
            .lock()
            .unwrap()
            .write_all(data.as_bytes())
            .map_err(|e| format!("pty_write id={id}: {e}"))?;
        Ok(())
    }

    // ── pty_resize ───────────────────────────────────────────────────

    #[tauri::command]
    pub fn pty_resize(
        state: tauri::State<PtyState>,
        id: u32,
        cols: u16,
        rows: u16,
    ) -> Result<(), String> {
        let session = state
            .sessions
            .read()
            .unwrap()
            .get(&id)
            .cloned()
            .ok_or_else(|| format!("no session id={id}"))?;
        let win = Winsize {
            ws_row: rows,
            ws_col: cols,
            ws_xpixel: 0,
            ws_ypixel: 0,
        };
        unsafe {
            let rc = libc::ioctl(session.master_fd, libc::TIOCSWINSZ, &win);
            if rc < 0 {
                log::debug!("pty_resize id={id}: TIOCSWINSZ returned {rc} (non-fatal on Android)");
            }
        }
        Ok(())
    }

    // ── pty_close ────────────────────────────────────────────────────

    #[tauri::command]
    pub fn pty_close(state: tauri::State<PtyState>, id: u32) -> Result<(), String> {
        if let Some(session) = state.sessions.write().unwrap().remove(&id) {
            session.done.store(true, Ordering::Release);
            let _ = signal::kill(session.child_pid, Signal::SIGTERM);
            thread::spawn(move || drop(session));
            log::info!("pty closed id={id}");
        }
        Ok(())
    }

    // ── pty_close_all ────────────────────────────────────────────────

    #[tauri::command]
    pub fn pty_close_all(state: tauri::State<PtyState>) -> Result<usize, String> {
        let drained: Vec<(u32, Arc<InnerSession>)> =
            state.sessions.write().unwrap().drain().collect();
        let count = drained.len();
        for (id, s) in drained {
            s.done.store(true, Ordering::Release);
            let _ = signal::kill(s.child_pid, Signal::SIGTERM);
            thread::spawn(move || drop(s));
        }
        if count > 0 {
            log::info!("pty_close_all: reaped {count} session(s)");
        }
        Ok(count)
    }
}
pub mod secrets;
pub mod shell;
pub mod workspace;
