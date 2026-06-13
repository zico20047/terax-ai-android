import { Fragment, useState } from "react";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import type { SearchAddon } from "@xterm/addon-search";
import { cn } from "@/lib/utils";
import { TerminalPane, type TerminalPaneHandle } from "./TerminalPane";
import { PaneHandleBar } from "./PaneHandleBar";
import type { PaneNode, SplitDir } from "./lib/panes";

type LeafBundle = {
  setRef: (h: TerminalPaneHandle | null) => void;
  onSearch: (addon: SearchAddon) => void;
  onCwd: (cwd: string) => void;
  onExit: (code: number) => void;
};

type Props = {
  node: PaneNode;
  tabVisible: boolean;
  activeLeafId: number;
  onFocusLeaf: (leafId: number) => void;
  getBundle: (leafId: number) => LeafBundle;
  onSplit?: (leafId: number, dir: SplitDir) => void;
  onCloseLeaf?: (leafId: number) => void;
  onSwap?: (idA: number, idB: number) => void;
  maxPanes: number;
  paneCount: number;
};

export function PaneTreeView({
  node,
  tabVisible,
  activeLeafId,
  onFocusLeaf,
  getBundle,
  onSplit,
  onCloseLeaf,
  onSwap,
  maxPanes,
  paneCount,
}: Props) {
  const [dragLeafId, setDragLeafId] = useState<number | null>(null);
  const [hoverLeafId, setHoverLeafId] = useState<number | null>(null);

  const handleSwapDrag = (fromId: number, x: number, y: number) => {
    setDragLeafId(fromId);
    const target = document.elementFromPoint(x, y);
    const paneEl = target?.closest("[data-pane-leaf]") as HTMLElement | null;
    const hoverId = paneEl ? Number(paneEl.dataset.paneLeaf) : null;
    setHoverLeafId(hoverId !== fromId ? hoverId : null);
  };

  const handleSwapEnd = (fromId: number, x: number, y: number) => {
    const target = document.elementFromPoint(x, y);
    const paneEl = target?.closest("[data-pane-leaf]") as HTMLElement | null;
    const targetId = paneEl ? Number(paneEl.dataset.paneLeaf) : null;
    if (targetId !== null && targetId !== fromId && onSwap) {
      onSwap(fromId, targetId);
    }
    setDragLeafId(null);
    setHoverLeafId(null);
  };

  if (node.kind === "leaf") {
    const focused = node.id === activeLeafId;
    const b = getBundle(node.id);
    const canSplit = paneCount < maxPanes;
    const canClose = paneCount > 1;
    const isDragTarget = hoverLeafId === node.id && dragLeafId !== null;

    return (
      <div
        onMouseDownCapture={() => {
          if (!focused) onFocusLeaf(node.id);
        }}
        onFocus={() => {
          if (!focused) onFocusLeaf(node.id);
        }}
        data-pane-leaf={node.id}
        className={cn(
          "relative h-full w-full transition-[box-shadow] duration-150",
          isDragTarget
            ? "ring-2 ring-inset ring-white/60"
            : focused && tabVisible
              ? "ring-1 ring-inset ring-white/30"
              : "ring-1 ring-inset ring-transparent",
        )}
      >
        <PaneHandleBar
          active={focused && tabVisible}
          leafId={node.id}
          onSplit={(dir) => onSplit?.(node.id, dir)}
          onClose={canClose ? () => onCloseLeaf?.(node.id) : null}
          onSwapDrag={handleSwapDrag}
          onSwapEnd={handleSwapEnd}
          canSplit={canSplit}
        />
        <TerminalPane
          leafId={node.id}
          visible={tabVisible}
          focused={focused}
          initialCwd={node.cwd}
          ref={b.setRef}
          onSearchReady={(_id, addon) => b.onSearch(addon)}
          onCwd={(_id, cwd) => b.onCwd(cwd)}
          onExit={(_id, code) => b.onExit(code)}
        />
      </div>
    );
  }

  return (
    <ResizablePanelGroup
      orientation={node.dir === "row" ? "horizontal" : "vertical"}
    >
      {node.children.map((child, i) => (
        <Fragment key={child.id}>
          {i > 0 && <ResizableHandle />}
          <ResizablePanel id={`pane-${child.id}`} minSize="10%">
            <PaneTreeView
              node={child}
              tabVisible={tabVisible}
              activeLeafId={activeLeafId}
              onFocusLeaf={onFocusLeaf}
              getBundle={getBundle}
              onSplit={onSplit}
              onCloseLeaf={onCloseLeaf}
              onSwap={onSwap}
              maxPanes={maxPanes}
              paneCount={paneCount}
            />
          </ResizablePanel>
        </Fragment>
      ))}
    </ResizablePanelGroup>
  );
}
