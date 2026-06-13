import { Fragment } from "react";
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
  maxPanes,
  paneCount,
}: Props) {
  if (node.kind === "leaf") {
    const focused = node.id === activeLeafId;
    const b = getBundle(node.id);
    const canSplit = paneCount < maxPanes;
    const canClose = paneCount > 1;

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
          "relative h-full w-full",
          focused && tabVisible
            ? "ring-1 ring-inset ring-white/30"
            : "ring-1 ring-inset ring-transparent",
        )}
      >
        <PaneHandleBar
          active={focused && tabVisible}
          onSplit={(dir) => onSplit?.(node.id, dir)}
          onClose={canClose ? () => onCloseLeaf?.(node.id) : null}
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
              maxPanes={maxPanes}
              paneCount={paneCount}
            />
          </ResizablePanel>
        </Fragment>
      ))}
    </ResizablePanelGroup>
  );
}
