import { useEffect, useState } from "react";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";

interface Progress {
  message: string;
  current: number;
  total: number;
}

export function BootstrapLoader({ onComplete }: { onComplete: () => void }) {
  const [progress, setProgress] = useState<Progress>({
    message: "Starting...",
    current: 0,
    total: 0,
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unlisteners: Promise<UnlistenFn>[] = [];

    unlisteners.push(
      listen<Progress>("bootstrap-progress", (e) => {
        setProgress(e.payload);
      }),
    );

    unlisteners.push(
      listen("bootstrap-complete", () => {
        onComplete();
      }),
    );

    unlisteners.push(
      listen<string>("bootstrap-error", (e) => {
        setError(e.payload);
      }),
    );

    return () => {
      Promise.all(unlisteners).then((fns) => fns.forEach((fn) => fn()));
    };
  }, [onComplete]);

  const pct =
    progress.total > 0
      ? Math.min(100, Math.round((progress.current / progress.total) * 100))
      : 0;

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black text-white">
      {/* Logo / Title */}
      <div className="mb-12 text-center">
        <h1 className="mb-2 text-3xl font-bold tracking-tight text-white">
          Terax
        </h1>
        <p className="text-sm text-white/50">Terminal for Android</p>
      </div>

      {error ? (
        <div className="max-w-xs text-center">
          <p className="mb-2 text-sm font-medium text-red-400">
            Setup failed
          </p>
          <p className="text-xs text-white/40 break-all">{error}</p>
        </div>
      ) : (
        <>
          {/* Spinner */}
          <div className="mb-6 h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-white" />

          {/* Progress message */}
          <p className="mb-3 text-sm font-medium text-white/90">
            {progress.message}
          </p>

          {/* Progress bar */}
          {progress.total > 0 && (
            <>
              <div className="h-1.5 w-64 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-white transition-all duration-300"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <p className="mt-2 text-xs tabular-nums text-white/40">
                {progress.current.toLocaleString()} /{" "}
                {progress.total.toLocaleString()} ({pct}%)
              </p>
            </>
          )}

          {/* Info text */}
          <p className="mt-8 max-w-xs text-center text-xs text-white/30">
            First launch installs the full Linux environment (bash, apt, coreutils).
            This only happens once — next launch will be instant.
          </p>
        </>
      )}
    </div>
  );
}
