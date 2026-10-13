import { useState } from "react";
import { X } from "lucide-react";
import { AssistantChat, AssistantRobot } from "./AssistantChat";

/** Floating robot button that opens the assistant in a panel. */
export function AssistantLauncher({ raised }: { raised: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      {open && (
        <div className="fixed inset-x-2 bottom-2 top-20 z-50 flex flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-2xl md:inset-x-auto md:right-6 md:top-auto md:bottom-6 md:h-[640px] md:w-[400px]">
          <button type="button" aria-label="Close assistant" onClick={() => setOpen(false)} className="absolute right-3 top-3 z-10 grid h-8 w-8 place-items-center rounded-full border border-border bg-background text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
          <div className="min-h-0 flex-1 pr-0 [&>div>div:first-child]:pr-14">
            <AssistantChat compact onNavigate={() => setOpen(false)} />
          </div>
        </div>
      )}
      {!open && (
        <button
          type="button"
          aria-label="Open Tunevio AI Assistant"
          onClick={() => setOpen(true)}
          className={`fixed right-4 z-40 grid h-14 w-14 place-items-center rounded-full border border-primary/60 bg-background shadow-[0_0_24px_rgba(0,230,255,0.35)] transition-transform hover:scale-105 md:bottom-6 md:right-6 ${raised ? "bottom-[calc(env(safe-area-inset-bottom)+76px)]" : "bottom-4"}`}
        >
          <AssistantRobot className="h-11 w-11" />
        </button>
      )}
    </>
  );
}
