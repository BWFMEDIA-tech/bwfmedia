import { useState } from "react";
import { AssistantChat, AssistantRobot } from "./AssistantChat";

/** Floating robot button that opens the assistant in a panel. */
export function AssistantLauncher({ raised }: { raised: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      {open && (
        <div className="tunevio-chat-window fixed right-4 z-[95] flex h-[min(70vh,620px)] w-[min(360px,calc(100vw-2rem))] flex-col overflow-hidden rounded-3xl border border-border bg-background shadow-2xl md:right-6">
          <AssistantChat compact onNavigate={() => setOpen(false)} onClose={() => setOpen(false)} />
        </div>
      )}
      {!open && (
        <button
          type="button"
          aria-label="Open Tunevio AI Assistant"
          onClick={() => setOpen(true)}
          className={`music-assistant-launcher fixed right-4 z-40 grid h-12 w-12 place-items-center rounded-full border border-primary/60 bg-background shadow-[0_0_24px_rgba(0,230,255,0.35)] transition-transform hover:scale-105 md:right-6 ${raised ? "tunevio-floating-launcher" : "bottom-4 md:bottom-6"}`}
        >
          <AssistantRobot className="h-9 w-9" />
        </button>
      )}
    </>
  );
}
