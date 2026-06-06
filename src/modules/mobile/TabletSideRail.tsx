import { cn } from "@/lib/utils";
import {
  FolderTreeIcon,
  FolderGitTwoIcon,
  ComputerTerminal01Icon,
  Mic01Icon,
  Settings01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

export const TABLET_RAIL_WIDTH = 52;

export type TabletRailTab =
  | "terminal"
  | "files"
  | "source-control"
  | "ai"
  | "settings";

type RailItem = {
  id: TabletRailTab;
  label: string;
  icon: Parameters<typeof HugeiconsIcon>[0]["icon"];
  badge?: number;
};

type Props = {
  activeTab: TabletRailTab;
  onSelectTab: (tab: TabletRailTab) => void;
  changedCount: number;
  hasComposer: boolean;
};

export function TabletSideRail({
  activeTab,
  onSelectTab,
  changedCount,
  hasComposer,
}: Props) {
  const items: RailItem[] = [
    { id: "terminal", label: "Terminal", icon: ComputerTerminal01Icon },
    { id: "files", label: "Files", icon: FolderTreeIcon },
    {
      id: "source-control",
      label: "Git",
      icon: FolderGitTwoIcon,
      badge: changedCount,
    },
    ...(hasComposer
      ? [{ id: "ai" as const, label: "AI", icon: Mic01Icon }]
      : []),
    { id: "settings", label: "Settings", icon: Settings01Icon },
  ];

  return (
    <div
      data-slot="tablet-side-rail"
      style={{ width: TABLET_RAIL_WIDTH }}
      className="flex shrink-0 flex-col items-center gap-1 border-r border-border/60 bg-card/95 py-2 backdrop-blur"
    >
      {items.map((item) => {
        const isActive = item.id === activeTab;
        const showBadge = !!item.badge && item.badge > 0;
        return (
          <button
            key={item.id}
            type="button"
            aria-label={item.label}
            aria-pressed={isActive}
            title={item.label}
            onClick={() => onSelectTab(item.id)}
            className={cn(
              "relative flex w-10 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-lg py-1.5 outline-none transition-colors duration-150",
              "focus-visible:ring-2 focus-visible:ring-primary/40",
              "active:scale-95",
              isActive
                ? "bg-foreground/[0.07] text-foreground dark:bg-foreground/[0.09]"
                : "text-muted-foreground hover:bg-foreground/[0.045]",
            )}
          >
            <div className="relative">
              <HugeiconsIcon
                icon={item.icon}
                size={20}
                strokeWidth={isActive ? 2 : 1.75}
                className="transition-[stroke-width] duration-150"
              />
              {showBadge ? (
                <span className="absolute -right-1.5 -top-1 inline-flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-primary px-0.5 text-[8px] font-bold leading-none text-primary-foreground tabular-nums">
                  {item.badge! > 99 ? "99+" : item.badge}
                </span>
              ) : null}
            </div>
            <span className="truncate text-[9px] font-medium leading-tight">
              {item.label}
            </span>
            {isActive ? (
              <div className="absolute left-0 top-1.5 h-6 w-0.5 rounded-r-full bg-primary" />
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
