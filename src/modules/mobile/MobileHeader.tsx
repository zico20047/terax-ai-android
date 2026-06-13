import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { Tab } from "@/modules/tabs";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Add01Icon,
  Cancel01Icon,
  ComputerTerminal01Icon,
  EyeIcon,
  FileEditIcon,
  GitCommitIcon,
  MoreVerticalCircle01Icon,
  PinIcon,
} from "@hugeicons/core-free-icons";
import { useRef } from "react";

type Props = {
  tabs: Tab[];
  activeId: number;
  onSelect: (id: number) => void;
  onNew: () => void;
  onNewPrivate: () => void;
  onNewPreview: () => void;
  onNewEditor: () => void;
  onNewGitGraph: () => void;
  onClose: (id: number) => void;
  onPin: (id: number) => void;
  isTablet?: boolean;
};

function tabIcon(kind: Tab["kind"]) {
  switch (kind) {
    case "terminal":
      return ComputerTerminal01Icon;
    case "editor":
    case "ai-diff":
      return FileEditIcon;
    case "preview":
      return EyeIcon;
    case "markdown":
      return FileEditIcon;
    case "git-diff":
    case "git-commit-file":
    case "git-history":
      return GitCommitIcon;
    default:
      return ComputerTerminal01Icon;
  }
}

export function MobileHeader({
  tabs,
  activeId,
  onSelect,
  onNew,
  onNewPrivate,
  onNewPreview,
  onNewEditor,
  onNewGitGraph,
  onClose,
  onPin,
  isTablet,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    <div
      data-slot="mobile-header"
      className={cn(
        "flex shrink-0 items-center border-b border-border/60 bg-card px-2",
        isTablet ? "h-10" : "h-11",
      )}
    >
      <div
        ref={scrollRef}
        className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto scrollbar-none"
      >
        {tabs.map((tab) => {
          const isActive = tab.id === activeId;
          const Icon = tabIcon(tab.kind);
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onSelect(tab.id)}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
                isActive
                  ? "bg-foreground/[0.07] text-foreground dark:bg-foreground/[0.09]"
                  : "text-muted-foreground hover:bg-foreground/[0.045]",
              )}
            >
              <HugeiconsIcon
                icon={Icon}
                size={14}
                strokeWidth={isActive ? 2 : 1.75}
              />
              <span className={cn("truncate", isTablet ? "max-w-40" : "max-w-20")}>{tab.title}</span>
              {isActive && tabs.length > 1 ? (
                <span
                  role="button"
                  tabIndex={0}
                  aria-label={`Close ${tab.title}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onClose(tab.id);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.stopPropagation();
                      onClose(tab.id);
                    }
                  }}
                  className="ml-0.5 rounded p-0.5 hover:bg-foreground/10"
                >
                  <HugeiconsIcon icon={Cancel01Icon} size={12} strokeWidth={2} />
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      <Button
        variant="ghost"
        size="icon-sm"
        onClick={onNew}
        className="ml-1 shrink-0 rounded-md text-muted-foreground"
        aria-label="New tab"
      >
        <HugeiconsIcon icon={Add01Icon} size={16} strokeWidth={1.75} />
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            className="shrink-0 rounded-md text-muted-foreground"
            aria-label="More options"
          >
            <HugeiconsIcon
              icon={MoreVerticalCircle01Icon}
              size={16}
              strokeWidth={1.75}
            />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-48">
          <DropdownMenuItem onSelect={onNew}>
            <HugeiconsIcon icon={ComputerTerminal01Icon} size={14} strokeWidth={1.75} />
            <span>New Terminal</span>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={onNewPrivate}>
            <HugeiconsIcon icon={ComputerTerminal01Icon} size={14} strokeWidth={1.75} />
            <span>New Private Terminal</span>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={onNewEditor}>
            <HugeiconsIcon icon={FileEditIcon} size={14} strokeWidth={1.75} />
            <span>New Editor</span>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={onNewPreview}>
            <HugeiconsIcon icon={EyeIcon} size={14} strokeWidth={1.75} />
            <span>New Preview</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={() => {
              const active = tabs.find((t) => t.id === activeId);
              if (active) onPin(active.id);
            }}
          >
            <HugeiconsIcon icon={PinIcon} size={14} strokeWidth={1.75} />
            <span>Pin Tab</span>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={onNewGitGraph}>
            <HugeiconsIcon icon={GitCommitIcon} size={14} strokeWidth={1.75} />
            <span>Git History</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
