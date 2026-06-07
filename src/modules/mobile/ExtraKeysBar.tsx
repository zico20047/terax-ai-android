import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { writeToSession } from "@/modules/terminal/lib/useTerminalSession";

export const EXTRA_KEYS_HEIGHT = 40;

type Modifier = "ctrl" | "alt";

type Props = {
  activeLeafId: number | null;
  visible: boolean;
};

export function ExtraKeysBar({ activeLeafId, visible }: Props) {
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
      // If a modifier is active, apply it to this key too
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

  // Intercept keydown when a modifier is active — applies CTRL/ALT to the
  // next key typed on the soft keyboard, then auto-deactivates.
  useEffect(() => {
    if (modifiers.size === 0) return;

    const handler = (e: KeyboardEvent) => {
      const mods = modifiersRef.current;
      if (mods.size === 0) return;

      // Let native modifier keys through
      if (e.ctrlKey || e.altKey || e.metaKey) return;

      const key = e.key;
      // Only intercept printable single chars
      if (key.length !== 1) return;

      e.preventDefault();
      e.stopPropagation();

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

    // Capture phase = intercept BEFORE xterm.js hidden textarea
    window.addEventListener("keydown", handler, true);
    return () => window.removeEventListener("keydown", handler, true);
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
    <div
      className="flex items-center gap-1 overflow-x-auto border-t bg-zinc-950 px-1"
      style={{
        height: EXTRA_KEYS_HEIGHT,
        borderColor: "var(--terminal-ansi-bright-black, #3f3f46)",
        touchAction: "pan-x",
      }}
    >
      <KeyButton
        label="CTRL"
        active={ctrlActive}
        onClick={() => toggleModifier("ctrl")}
      />
      <KeyButton
        label="ALT"
        active={altActive}
        onClick={() => toggleModifier("alt")}
      />
      <Divider />
      <KeyButton label="ESC" onClick={() => handleDirectKey("\x1b")} />
      <KeyButton label="TAB" onClick={() => handleDirectKey("\t")} />
      <Divider />
      <KeyButton label="&#8593;" onClick={() => handleDirectKey("\x1b[A")} />
      <KeyButton label="&#8595;" onClick={() => handleDirectKey("\x1b[B")} />
      <KeyButton label="&#8594;" onClick={() => handleDirectKey("\x1b[C")} />
      <KeyButton label="&#8592;" onClick={() => handleDirectKey("\x1b[D")} />
      <Divider />
      <KeyButton label="-" onClick={() => handleDirectKey("-")} />
      <KeyButton label="/" onClick={() => handleDirectKey("/")} />
      <KeyButton label="|" onClick={() => handleDirectKey("|")} />
      <KeyButton label="~" onClick={() => handleDirectKey("~")} />
      <KeyButton label="&amp;" onClick={() => handleDirectKey("&")} />
    </div>
  );
}

function KeyButton({
  label,
  active = false,
  onClick,
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex h-7 min-w-[34px] flex-shrink-0 items-center justify-center rounded px-2 text-xs font-semibold select-none transition-colors",
        "bg-zinc-900 text-zinc-300 active:bg-zinc-800",
        active &&
          "bg-blue-600 text-white shadow-md shadow-blue-600/30 active:bg-blue-700",
      )}
    >
      {label}
    </button>
  );
}

function Divider() {
  return <div className="mx-0.5 h-5 w-px flex-shrink-0 bg-zinc-800" />;
}
