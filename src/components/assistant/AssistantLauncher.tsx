import { useState } from "react";
import { AssistantChat, AssistantRobot } from "./AssistantChat";

/** Floating robot button that opens the assistant in a panel. */
export function AssistantLauncher({ raised }: { raised: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      {open && (
        <div className="fixed inset-x-0 bottom-0 top-0 z-[95] flex flex-col overflow-hidden border-0 bg-background pt-[env(safe-area-inset-top)] shadow-2xl md:inset-x-auto md:bottom-6 md:left-auto md:right-6 md:top-auto md:h-[min(70vh,620px)] md:w-[400px] md:rounded-3xl md:border md:border-border md:pt-0">
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
