import type { ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { HugeiconsIcon } from "@hugeicons/react";
import { Cancel01Icon } from "@hugeicons/core-free-icons";

type Props = {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
};

export function MobileAiPanel({ open, onClose, children }: Props) {
  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          data-slot="mobile-ai-panel"
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 30, stiffness: 300 }}
          className="fixed inset-0 z-50 flex flex-col bg-background"
        >
          <div className="flex shrink-0 items-center justify-between border-b border-border/60 px-4 py-3">
            <h2 className="text-sm font-semibold">AI Assistant</h2>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onClose}
              aria-label="Close AI panel"
            >
              <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} />
            </Button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {children}
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
