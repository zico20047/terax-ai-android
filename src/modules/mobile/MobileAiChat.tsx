import { Button } from "@/components/ui/button";
import { HugeiconsIcon } from "@hugeicons/react";
import { Cancel01Icon } from "@hugeicons/core-free-icons";
import { useChatStore, getOrCreateChat } from "@/modules/ai/store/chatStore";
import { AiChatView } from "@/modules/ai/components/AiChat";
import { AiInputBar } from "@/modules/ai/components/AiInputBar";
import { useChat } from "@ai-sdk/react";
import { useMemo } from "react";
import type { UIMessage } from "ai";

type Props = {
  onClose: () => void;
};

export function MobileAiChat({ onClose }: Props) {
  const sessionId = useChatStore((s) => s.activeSessionId);
  const focusInput = useChatStore((s) => s.focusInput);

  const chat = useMemo(
    () => (sessionId ? getOrCreateChat(sessionId) : null),
    [sessionId],
  );
  const helpers = useChat<UIMessage>({ chat: chat! });

  return (
    <div className="flex h-full flex-col bg-background">
      <div className="flex shrink-0 items-center justify-between border-b border-border/60 px-4 py-3">
        <h2 className="text-sm font-semibold">AI Assistant</h2>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onClose}
          aria-label="Close AI chat"
        >
          <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} />
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {chat && helpers.messages.length > 0 ? (
          <div className="[&_.text-sm]:text-[12px] [&_p]:leading-relaxed">
            <AiChatView
              messages={helpers.messages}
              status={helpers.status}
              error={helpers.error}
              clearError={helpers.clearError}
              addToolApprovalResponse={helpers.addToolApprovalResponse}
              stop={helpers.stop}
            />
          </div>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-6">
            <p className="text-center text-sm text-muted-foreground">
              Start a conversation with the AI assistant.
            </p>
            <Button variant="outline" size="sm" onClick={() => focusInput()}>
              New message
            </Button>
          </div>
        )}
      </div>

      <div className="shrink-0 border-t border-border/60">
        <AiInputBar />
      </div>
    </div>
  );
}
