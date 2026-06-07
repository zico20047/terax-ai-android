import { useEffect, useRef, useCallback } from "react";
import { openPty, type PtySession } from "./pty-bridge";

type Options = {
  leafId: number;
  container: React.RefObject<HTMLDivElement | null>;
  visible: boolean;
  initialCwd?: string;
  onExit?: (code: number) => void;
};

/**
 * Manages a wterm terminal connected to a PTY session.
 *
 * Unlike useTerminalSession (xterm.js), this is simpler:
 * - No renderer pool / dormant ring (wterm handles its own DOM)
 * - No theme/font/scrollback preferences (wterm CSS-based)
 * - PTY data → wterm.write()
 * - wterm onData → PTY.write()
 */
export function useWtermSession({
  leafId,
  container,
  initialCwd,
  onExit,
}: Omit<Options, "visible">) {
  const wtermRef = useRef<import("@wterm/dom").WTerm | null>(null);
  const ptyRef = useRef<PtySession | null>(null);
  const cbRef = useRef({ onExit });
  cbRef.current = { onExit };

  useEffect(() => {
    let cancelled = false;
    let pty: PtySession | null = null;

    const init = async () => {
      const { WTerm } = await import("@wterm/dom");
      await import("@wterm/dom/css");

      const el = container.current;
      if (!el || cancelled) return;

      const term = new WTerm(el, {
        cols: 80,
        rows: 24,
        autoResize: true,
        onData: (data) => {
          pty?.write(data);
        },
      });
      await term.init();
      if (cancelled) {
        term.destroy();
        return;
      }
      wtermRef.current = term;

      pty = await openPty(term.cols, term.rows, {
        onData: (bytes) => {
          term.write(bytes);
        },
        onExit: (code) => {
          cbRef.current.onExit?.(code);
        },
      }, initialCwd);
      if (cancelled) {
        await pty.close();
        return;
      }
      ptyRef.current = pty;
    };

    init().catch((e) => console.error("[wterm] init failed:", e));

    return () => {
      cancelled = true;
      if (ptyRef.current) {
        ptyRef.current.close().catch(() => {});
        ptyRef.current = null;
      }
      if (wtermRef.current) {
        wtermRef.current.destroy();
        wtermRef.current = null;
      }
    };
  }, [leafId, container, initialCwd]);

  const write = useCallback((data: string) => {
    wtermRef.current?.write(data);
  }, []);

  const focus = useCallback(() => {
    wtermRef.current?.focus();
  }, []);

  return { write, focus };
}
