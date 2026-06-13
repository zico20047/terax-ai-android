import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { writeToSession } from "@/modules/terminal/lib/useTerminalSession";
import { getSlotForLeaf } from "@/modules/terminal/lib/rendererPool";

export const EXTRA_KEYS_HEIGHT = 40;

type Modifier = "ctrl" | "alt";

type Props = {
  activeLeafId: number | null;
  visible: boolean;
  selectionMode: boolean;
  onToggleSelectionMode: () => void;
  onOpenSettings?: () => void;
  isTablet?: boolean;
};

export function ExtraKeysBar({
  activeLeafId,
  visible,
  selectionMode,
  onToggleSelectionMode,
  onOpenSettings,
  isTablet,
}: Props) {
  const [modifiers, setModifiers] = useState<Set<Modifier>>(new Set());
  const modifiersRef = useRef(modifiers);
  modifiersRef.current = modifiers;
  const leafRef = useRef(activeLeafId);
  leafRef.current = activeLeafId;

  const toggleModifier = useCallback((mod: Modifier) => {
    setModifiers((prev) => {
      const next = new Set(prev);
      if (next.has(mod)) next.delete(mod);
      else next.add(mod);
      return next;
    });
  }, []);

  const clearModifiers = useCallback(() => {
    setModifiers(new Set());
  }, []);

  const send = useCallback(
    (data: string) => {
      if (activeLeafId !== null) writeToSession(activeLeafId, data);
    },
    [activeLeafId],
  );

  const handleDirectKey = useCallback(
    (data: string) => {
      const mods = modifiersRef.current;
      if (mods.size > 0 && data.length === 1) {
        let out = "";
        if (mods.has("alt")) out += "\x1b";
        if (mods.has("ctrl")) {
          out += String.fromCharCode(
            data.toUpperCase().charCodeAt(0) & 0x1f,
          );
        } else {
          out += data;
        }
        send(out);
        clearModifiers();
      } else {
        send(data);
      }
    },
    [send, clearModifiers],
  );

  const handleCopy = useCallback(async () => {
    const leaf = leafRef.current;
    if (leaf === null) return;
    const slot = getSlotForLeaf(leaf);
    const text = slot?.term.getSelection() ?? "";
    if (text.length > 0) {
      try {
        await navigator.clipboard.writeText(text);
      } catch {
        // Clipboard API may not be available
      }
    }
  }, []);

  const handlePaste = useCallback(async () => {
    const leaf = leafRef.current;
    if (leaf === null) return;
    try {
      const text = await navigator.clipboard.readText();
      if (text.length > 0) writeToSession(leaf, text);
    } catch {
      // Clipboard API may not be available
    }
  }, []);

  // Intercept input when a modifier is active.
  // On Android, soft keyboards use IME which fires `beforeinput` (NOT
  // `keydown`). We listen on the document and check if the target is
  // xterm's hidden textarea.
  useEffect(() => {
    if (modifiers.size === 0) return;

    const onBeforeInput = (e: InputEvent) => {
      const mods = modifiersRef.current;
      if (mods.size === 0) return;

      // Only intercept text insertion into xterm's textarea
      if (e.inputType !== "insertText") return;
      const target = e.target as HTMLElement;
      if (!target || !target.classList?.contains("xterm-helper-textarea")) {
        return;
      }

      const char = e.data;
      if (!char || char.length !== 1) return;

      e.preventDefault();
      e.stopImmediatePropagation();

      let data = "";
      if (mods.has("alt")) data += "\x1b";
      if (mods.has("ctrl")) {
        data += String.fromCharCode(
          char.toUpperCase().charCodeAt(0) & 0x1f,
        );
      } else {
        data += char;
      }

      const leaf = leafRef.current;
      if (leaf !== null) writeToSession(leaf, data);
      clearModifiers();
    };

    // Also intercept keydown for hardware keyboards
    const onKeyDown = (e: KeyboardEvent) => {
      const mods = modifiersRef.current;
      if (mods.size === 0) return;
      if (e.ctrlKey || e.altKey || e.metaKey) return;
      const target = e.target as HTMLElement;
      if (!target || !target.classList?.contains("xterm-helper-textarea")) {
        return;
      }
      const key = e.key;
      if (key.length !== 1) return;

      e.preventDefault();
      e.stopImmediatePropagation();

      let data = "";
      if (mods.has("alt")) data += "\x1b";
      if (mods.has("ctrl")) {
        data += String.fromCharCode(
          key.toUpperCase().charCodeAt(0) & 0x1f,
        );
      } else {
        data += key;
      }

      const leaf = leafRef.current;
      if (leaf !== null) writeToSession(leaf, data);
      clearModifiers();
    };

    document.addEventListener("beforeinput", onBeforeInput, true);
    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.removeEventListener("beforeinput", onBeforeInput, true);
      document.removeEventListener("keydown", onKeyDown, true);
    };
  }, [modifiers.size, clearModifiers]);

  // Auto-clear modifiers when bar becomes invisible
  useEffect(() => {
    if (!visible) clearModifiers();
  }, [visible, clearModifiers]);

  // Auto-clear after 5s of inactivity
  useEffect(() => {
    if (modifiers.size === 0) return;
    const timer = setTimeout(() => clearModifiers(), 5000);
    return () => clearTimeout(timer);
  }, [modifiers, clearModifiers]);

  if (!visible) return null;

  const ctrlActive = modifiers.has("ctrl");
  const altActive = modifiers.has("alt");

  return (
    <>
      {selectionMode && (
        <div
          className="pointer-events-auto absolute right-2 z-50 flex items-center gap-1 rounded-lg border bg-zinc-900/95 px-2 py-1.5 shadow-xl backdrop-blur"
          style={{
            top: 8,
            borderColor: "var(--terminal-ansi-bright-black, #3f3f46)",
          }}
        >
          <span className="mr-1 text-xs text-zinc-400">SEL</span>
          <ActionBtn label="Copy" onClick={handleCopy} />
          <ActionBtn label="Paste" onClick={handlePaste} />
          <ActionBtn label="Done" onClick={onToggleSelectionMode} primary />
        </div>
      )}
      <div
        className="flex items-center gap-1 overflow-x-auto border-t bg-zinc-950 px-1"
        style={{
          height: isTablet ? 44 : EXTRA_KEYS_HEIGHT,
          borderColor: "var(--terminal-ansi-bright-black, #3f3f46)",
          touchAction: "pan-x",
        }}
      >
        <KeyButton
          label="CTRL"
          active={ctrlActive}
          onClick={() => toggleModifier("ctrl")}
          tall={isTablet}
        />
        <KeyButton
          label="ALT"
          active={altActive}
          onClick={() => toggleModifier("alt")}
          tall={isTablet}
        />
        <KeyButton
          label="SEL"
          active={selectionMode}
          onClick={onToggleSelectionMode}
          tall={isTablet}
        />
        <Divider />
        <KeyButton label="ESC" onClick={() => handleDirectKey("\x1b")} tall={isTablet} />
        <KeyButton label="TAB" onClick={() => handleDirectKey("\t")} tall={isTablet} />
        <KeyButton label="HOME" onClick={() => handleDirectKey("\x1b[H")} tall={isTablet} />
        <KeyButton label="END" onClick={() => handleDirectKey("\x1b[F")} tall={isTablet} />
        <Divider />
        <KeyButton label="&#8592;" onClick={() => handleDirectKey("\x1b[D")} tall={isTablet} />
        <KeyButton label="&#8593;" onClick={() => handleDirectKey("\x1b[A")} tall={isTablet} />
        <KeyButton label="&#8595;" onClick={() => handleDirectKey("\x1b[B")} tall={isTablet} />
        <KeyButton label="&#8594;" onClick={() => handleDirectKey("\x1b[C")} tall={isTablet} />
        <Divider />
        <KeyButton label="-" onClick={() => handleDirectKey("-")} tall={isTablet} />
        <KeyButton label="/" onClick={() => handleDirectKey("/")} tall={isTablet} />
        <KeyButton label="|" onClick={() => handleDirectKey("|")} tall={isTablet} />
        <KeyButton label="~" onClick={() => handleDirectKey("~")} tall={isTablet} />
        <KeyButton label="$" onClick={() => handleDirectKey("$")} tall={isTablet} />
        <KeyButton label="&" onClick={() => handleDirectKey("&")} tall={isTablet} />
        <KeyButton label=";" onClick={() => handleDirectKey(";")} tall={isTablet} />
        <KeyButton label="." onClick={() => handleDirectKey(".")} tall={isTablet} />
        {onOpenSettings && (
          <>
            <Divider />
            <KeyButton label="&#9881;" onClick={onOpenSettings} tall={isTablet} />
          </>
        )}
      </div>
    </>
  );
}

function KeyButton({
  label,
  active = false,
  onClick,
  tall = false,
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
  tall?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex min-w-[34px] flex-shrink-0 items-center justify-center rounded px-2 text-xs font-semibold select-none transition-colors",
        tall ? "h-8" : "h-7",
        "bg-zinc-900 text-zinc-300 active:bg-zinc-800",
        active &&
          "bg-blue-600 text-white shadow-md shadow-blue-600/30 active:bg-blue-700",
      )}
    >
      {label}
    </button>
  );
}

function ActionBtn({
  label,
  onClick,
  primary = false,
}: {
  label: string;
  onClick: () => void;
  primary?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded px-2 py-1 text-xs font-medium transition-colors",
        primary
          ? "bg-blue-600 text-white active:bg-blue-700"
          : "bg-zinc-800 text-zinc-200 active:bg-zinc-700",
      )}
    >
      {label}
    </button>
  );
}

function Divider() {
  return <div className="mx-0.5 h-5 w-px flex-shrink-0 bg-zinc-800" />;
}
