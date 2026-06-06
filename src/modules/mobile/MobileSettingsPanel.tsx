import { Button } from "@/components/ui/button";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Cancel01Icon,
  Settings01Icon,
  PaintBoardIcon,
  AiScanIcon,
  InformationCircleIcon,
} from "@hugeicons/core-free-icons";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { usePreferencesStore } from "@/modules/settings/preferences";
import { GeneralSection } from "@/settings/sections/GeneralSection";
import { ModelsSection } from "@/settings/sections/ModelsSection";
import { ThemesSection } from "@/settings/sections/ThemesSection";
import { AboutSection } from "@/settings/sections/AboutSection";

type SettingsTab = "general" | "models" | "themes" | "about";

const TABS: { id: SettingsTab; label: string; icon: typeof Settings01Icon }[] = [
  { id: "general", label: "General", icon: Settings01Icon },
  { id: "models", label: "Models", icon: AiScanIcon },
  { id: "themes", label: "Themes", icon: PaintBoardIcon },
  { id: "about", label: "About", icon: InformationCircleIcon },
];

type Props = {
  onClose: () => void;
  initialTab?: SettingsTab;
};

export function MobileSettingsPanel({ onClose, initialTab = "general" }: Props) {
  const [active, setActive] = useState<SettingsTab>(initialTab);
  const init = usePreferencesStore((s) => s.init);

  useEffect(() => {
    void init();
  }, [init]);

  return (
    <div className="flex h-full flex-col bg-background">
      <div className="flex shrink-0 items-center justify-between border-b border-border/60 px-4 py-3">
        <h2 className="text-sm font-semibold">Settings</h2>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onClose}
          aria-label="Close settings"
        >
          <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} />
        </Button>
      </div>

      <div className="flex shrink-0 gap-0.5 border-b border-border/60 px-2 py-1.5">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActive(tab.id)}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium transition-colors",
              active === tab.id
                ? "bg-foreground/[0.07] text-foreground dark:bg-foreground/[0.09]"
                : "text-muted-foreground",
            )}
          >
            <HugeiconsIcon icon={tab.icon} size={14} strokeWidth={active === tab.id ? 2 : 1.75} />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {active === "general" && <GeneralSection />}
        {active === "models" && <ModelsSection />}
        {active === "themes" && <ThemesSection />}
        {active === "about" && <AboutSection />}
      </div>
    </div>
  );
}
