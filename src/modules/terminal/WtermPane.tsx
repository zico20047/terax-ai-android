import { forwardRef, useImperativeHandle, useRef } from "react";
import { useWtermSession } from "./lib/useWtermSession";
import type { TerminalPaneHandle } from "./TerminalPane";

export type WtermPaneHandle = TerminalPaneHandle;

type Props = {
  leafId: number;
  visible: boolean;
  focused?: boolean;
  initialCwd?: string;
  onExit?: (leafId: number, code: number) => void;
};

/**
 * Phone-optimized terminal pane using wterm (DOM renderer).
 *
 * Renders terminal text as real DOM elements → native touch text selection
 * works out of the box (like selecting text on any website).
 *
 * Used instead of TerminalPane (xterm.js) on phone screens.
 */
export const WtermPane = forwardRef<WtermPaneHandle, Props>(
  function WtermPane(
    { leafId, visible, initialCwd, onExit },
    ref,
  ) {
    const containerRef = useRef<HTMLDivElement>(null);

    const session = useWtermSession({
      leafId,
      container: containerRef,
      initialCwd,
      onExit: (code) => onExit?.(leafId, code),
    });

    useImperativeHandle(
      ref,
      () => ({
        write: (data) => session.write(data),
        focus: () => session.focus(),
        getBuffer: () => {
          const el = containerRef.current;
          if (!el) return null;
          return el.innerText ?? null;
        },
        getSelection: () => {
          const el = containerRef.current;
          if (!el) return null;
          const sel = window.getSelection();
          if (!sel || sel.rangeCount === 0) return null;
          const text = sel.toString();
          return text || null;
        },
      }),
      [session],
    );

    return (
      <div
        ref={containerRef}
        className="h-full w-full"
        style={{
          visibility: visible ? "visible" : "hidden",
          pointerEvents: visible ? "auto" : "none",
        }}
      />
    );
  },
);
