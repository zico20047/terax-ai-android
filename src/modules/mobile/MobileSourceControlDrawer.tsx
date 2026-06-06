import { SourceControlPanel, type SourceControlSummary } from "@/modules/source-control";
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceControl: SourceControlSummary;
  onOpenDiff: (input: {
    path: string;
    repoRoot: string;
    mode: "+" | "-";
    originalPath: string | null;
    title?: string;
  }) => void;
  onOpenGitGraph?: () => void;
};

export function MobileSourceControlDrawer({
  open,
  onOpenChange,
  sourceControl,
  onOpenDiff,
  onOpenGitGraph,
}: Props) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="left"
        showCloseButton={false}
        className="w-[85vw] max-w-sm p-0"
      >
        <SheetTitle className="sr-only">Source Control</SheetTitle>
        <SourceControlPanel
          open
          sourceControl={sourceControl}
          onOpenDiff={onOpenDiff}
          onOpenGitGraph={onOpenGitGraph}
        />
      </SheetContent>
    </Sheet>
  );
}
