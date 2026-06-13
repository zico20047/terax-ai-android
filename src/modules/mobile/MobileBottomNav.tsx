import { cn } from "@/lib/utils";
import {
  FolderTreeIcon,
  FolderGitTwoIcon,
  ComputerTerminal01Icon,
  Mic01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

export const MOBILE_NAV_HEIGHT = 56;

export type MobileNavTab =
  | "terminal"
  | "files"
  | "source-control"
  | "ai"
  | "settings";

type NavItem = {
  id: MobileNavTab;
  label: string;
  icon: Parameters<typeof HugeiconsIcon>[0]["icon"];
  badge?: number;
};

type Props = {
  activeTab: MobileNavTab;
  onSelectTab: (tab: MobileNavTab) => void;
  changedCount: number;
  hasComposer: boolean;
};

export function MobileBottomNav({
  activeTab,
  onSelectTab,
  changedCount,
  hasComposer,
}: Props) {
  const items: NavItem[] = [
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
  ];

  return (
    <nav
      data-slot="mobile-bottom-nav"
      style={{ height: MOBILE_NAV_HEIGHT }}
      className="flex shrink-0 items-stretch gap-0.5 border-t border-border/60 bg-card/95 px-1 pb-[env(safe-area-inset-bottom)] backdrop-blur supports-backdrop-filter:bg-card/85"
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
            onClick={() => onSelectTab(item.id)}
            className={cn(
              "relative flex flex-1 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-lg text-[10px] font-medium outline-none transition-colors duration-150",
              "focus-visible:ring-2 focus-visible:ring-primary/40",
              "active:scale-95",
              isActive
                ? "text-foreground"
                : "text-muted-foreground",
            )}
          >
            <div className="relative">
              <HugeiconsIcon
                icon={item.icon}
                size={22}
                strokeWidth={isActive ? 2 : 1.75}
                className="transition-[stroke-width] duration-150"
              />
              {showBadge ? (
                <span className="absolute -right-1.5 -top-1 inline-flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-primary px-0.5 text-[8px] font-bold leading-none text-primary-foreground tabular-nums">
                  {item.badge! > 99 ? "99+" : item.badge}
                </span>
              ) : null}
            </div>
            <span className="truncate">{item.label}</span>
            {isActive ? (
              <div className="absolute right-3 bottom-0.5 left-3 h-0.5 rounded-full bg-primary" />
            ) : null}
          </button>
        );
      })}
    </nav>
  );
}
