import type { Tab } from "@/modules/tabs";
import { useEffect, useMemo, useRef } from "react";
import { WtermPane } from "./WtermPane";
import type { TerminalPaneHandle } from "./TerminalPane";

type Props = {
  tabs: Tab[];
  activeId: number;
  registerHandle: (leafId: number, handle: TerminalPaneHandle | null) => void;
  onExit: (leafId: number, code: number) => void;
};

/**
 * Simplified terminal stack for phone screens using wterm (DOM renderer).
 *
 * Unlike TerminalStack (xterm.js), this:
 * - Renders only one pane per tab (no split panes on phone)
 * - Uses DOM rendering for native touch text selection
 * - No search addon, no theme/font preferences (CSS-based)
 */
export function WtermTerminalStack({
  tabs,
  activeId,
  registerHandle,
  onExit,
}: Props) {
  const terminals = useMemo(
    () => tabs.filter((t) => t.kind === "terminal"),
    [tabs],
  );

  const registerRef = useRef(registerHandle);
  const exitRef = useRef(onExit);
  useEffect(() => {
    registerRef.current = registerHandle;
  }, [registerHandle]);
  useEffect(() => {
    exitRef.current = onExit;
  }, [onExit]);

  const bundles = useRef(new Map<number, { setRef: (h: TerminalPaneHandle | null) => void; onExit: (code: number) => void }>());
  const getBundle = (leafId: number) => {
    let b = bundles.current.get(leafId);
    if (!b) {
      b = {
        setRef: (h) => registerRef.current(leafId, h),
        onExit: (code) => exitRef.current(leafId, code),
      };
      bundles.current.set(leafId, b);
    }
    return b;
  };

  useEffect(() => {
    const live = new Set<number>();
    for (const t of terminals) {
      if (t.kind === "terminal") live.add(t.activeLeafId);
    }
    for (const id of bundles.current.keys()) {
      if (!live.has(id)) bundles.current.delete(id);
    }
  }, [terminals]);

  return (
    <div className="relative h-full w-full">
      {terminals.map((t) => {
        if (t.kind !== "terminal") return null;
        const tabVisible = t.id === activeId;
        const bundle = getBundle(t.activeLeafId);
        return (
          <div
            key={t.id}
            className="absolute inset-0"
            style={{
              visibility: tabVisible ? "visible" : "hidden",
              pointerEvents: tabVisible ? "auto" : "none",
            }}
            aria-hidden={!tabVisible}
          >
            <WtermPane
              ref={bundle.setRef}
              leafId={t.activeLeafId}
              visible={tabVisible}
              initialCwd={t.cwd}
              onExit={bundle.onExit}
            />
          </div>
        );
      })}
    </div>
  );
}
