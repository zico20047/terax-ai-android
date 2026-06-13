import { cn } from "@/lib/utils";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Cancel01Icon,
  ArrowDown01Icon,
  ArrowRight01Icon,
  Drag01Icon,
} from "@hugeicons/core-free-icons";

type Props = {
  active: boolean;
  leafId: number;
  onSplit: (dir: "row" | "col") => void;
  onClose: (() => void) | null;
  onSwapDrag: (fromLeafId: number, x: number, y: number) => void;
  onSwapEnd: (fromLeafId: number, x: number, y: number) => void;
  canSplit: boolean;
};

export function PaneHandleBar({
  active,
  onSplit,
  onClose,
  onSwapDrag,
  onSwapEnd,
  leafId,
  canSplit,
}: Props) {
  if (!active) return null;

  return (
    <div
      className="absolute right-1.5 top-1.5 z-20 flex items-center gap-0.5 rounded-md border border-white/20 bg-black/80 px-0.5 py-0.5 backdrop-blur-sm"
      onPointerDown={(e) => e.stopPropagation()}
    >
      {canSplit && (
        <HandleBtn
          label="Split Right"
          onClick={() => onSplit("row")}
          icon={ArrowRight01Icon}
        />
      )}
      {canSplit && (
        <HandleBtn
          label="Split Down"
          onClick={() => onSplit("col")}
          icon={ArrowDown01Icon}
        />
      )}
      <HandleBtn
        label="Drag to Swap"
        icon={Drag01Icon}
        onPointerDown={(e) => {
          e.stopPropagation();
          const move = (ev: PointerEvent) => {
            onSwapDrag(leafId, ev.clientX, ev.clientY);
          };
          const up = (ev: PointerEvent) => {
            document.removeEventListener("pointermove", move);
            document.removeEventListener("pointerup", up);
            onSwapEnd(leafId, ev.clientX, ev.clientY);
          };
          document.addEventListener("pointermove", move);
          document.addEventListener("pointerup", up);
        }}
      />
      {onClose && (
        <HandleBtn
          label="Close Pane"
          onClick={onClose}
          icon={Cancel01Icon}
          danger
        />
      )}
    </div>
  );
}

function HandleBtn({
  label,
  onClick,
  icon,
  onPointerDown,
}: {
  label: string;
  onClick?: () => void;
  icon: any;
  danger?: boolean;
  onPointerDown?: (e: React.PointerEvent) => void;
}) {
  return (
    <button
      type="button"
      title={label}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
      onPointerDown={onPointerDown}
      className={cn(
        "flex h-6 w-6 items-center justify-center rounded transition-colors touch-none",
        "text-zinc-500 hover:bg-white/10 hover:text-white",
      )}
    >
      <HugeiconsIcon icon={icon} size={14} strokeWidth={1.75} />
    </button>
  );
}
