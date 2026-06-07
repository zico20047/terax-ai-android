import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { getSlotForLeaf } from "@/modules/terminal/lib/rendererPool";

type Props = {
  leafId: number | null;
  onClose: () => void;
};

/**
 * Full-screen overlay showing terminal buffer text in a natively-selectable
 * DOM element. This works around xterm.js canvas/WebGL not supporting
 * touch-based text selection on mobile.
 */
export function TerminalTextOverlay({ leafId, onClose }: Props) {
  const [text, setText] = useState("");
  const preRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    if (leafId === null) return;
    const slot = getSlotForLeaf(leafId);
    if (!slot) return;
    const buf = slot.term.buffer.active;
    const total = buf.length;
    const lines: string[] = [];
    for (let i = 0; i < total; i++) {
      lines.push(buf.getLine(i)?.translateToString(true) ?? "");
    }
    // Trim trailing empty lines
    while (lines.length && lines[lines.length - 1] === "") lines.pop();
    setText(lines.join("\n"));
  }, [leafId]);

  const handleCopyAll = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Clipboard API may not be available
    }
  }, [text]);

  const handleCopySelection = useCallback(async () => {
    const selection = window.getSelection()?.toString() ?? "";
    if (selection.length > 0) {
      try {
        await navigator.clipboard.writeText(selection);
      } catch {
        // Clipboard API may not be available
      }
    }
  }, []);

  if (leafId === null) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col bg-zinc-950/95 backdrop-blur"
      onClick={onClose}
    >
      {/* Header bar */}
      <div
        className="flex items-center gap-2 border-b border-zinc-800 px-3 py-2 safe-area-top"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="text-sm font-medium text-zinc-300">
          Terminal Output
        </span>
        <span className="text-xs text-zinc-500">
          ({text.split("\n").length} lines)
        </span>
        <div className="ml-auto flex gap-2">
          <button
            type="button"
            onClick={handleCopySelection}
            className="rounded bg-zinc-800 px-3 py-1 text-xs font-medium text-zinc-200 active:bg-zinc-700"
          >
            Copy Selection
          </button>
          <button
            type="button"
            onClick={handleCopyAll}
            className="rounded bg-blue-600 px-3 py-1 text-xs font-medium text-white active:bg-blue-700"
          >
            Copy All
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded bg-zinc-800 px-3 py-1 text-xs font-medium text-zinc-200 active:bg-zinc-700"
          >
            Done
          </button>
        </div>
      </div>
      {/* Selectable text */}
      <pre
        ref={preRef}
        className={cn(
          "min-h-0 flex-1 overflow-auto px-3 py-2 text-xs leading-tight",
          "font-mono text-zinc-200 selection:bg-blue-600 selection:text-white",
        )}
        style={{ userSelect: "text", WebkitUserSelect: "text" }}
        onClick={(e) => e.stopPropagation()}
      >
        {text || "(empty)"}
      </pre>
    </div>
  );
}
