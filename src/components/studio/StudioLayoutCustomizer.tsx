/**
 * ADMIN-ONLY layout customization for /stream-studio.
 *
 * Purely presentational: it wraps existing blocks and controls their
 * visibility / collapsed state / order. It never touches LiveKit, streaming,
 * audio, chat, voting, queue, membership or payment logic. Hidden blocks are
 * still mounted (kept alive) and only visually hidden, so no live connection
 * is ever torn down by toggling the layout.
 */
import { Children, createContext, isValidElement, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, ChevronUp, Eye, EyeOff, LayoutPanelTop, RotateCcw, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type StudioBlockDef = { id: string; label: string };

type BlockState = { hidden: boolean; collapsed: boolean };

type LayoutState = {
  order: string[];
  blocks: Record<string, BlockState>;
};

const STORAGE_KEY = "bwf.studio.layout.v1";

type Ctx = {
  isAdmin: boolean;
  state: LayoutState;
  defs: StudioBlockDef[];
  toggleHidden: (id: string) => void;
  toggleCollapsed: (id: string) => void;
  move: (id: string, dir: -1 | 1) => void;
  reset: () => void;
};

const LayoutCtx = createContext<Ctx | null>(null);

function defaultState(defs: StudioBlockDef[]): LayoutState {
  return {
    order: defs.map((d) => d.id),
    blocks: Object.fromEntries(defs.map((d) => [d.id, { hidden: false, collapsed: false }])),
  };
}

export function StudioLayoutProvider({
  isAdmin,
  defs,
  children,
}: {
  isAdmin: boolean;
  defs: StudioBlockDef[];
  children: ReactNode;
}) {
  const [state, setState] = useState<LayoutState>(() => defaultState(defs));

  // Load persisted layout after mount (avoids SSR hydration mismatch).
  useEffect(() => {
    if (!isAdmin || typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<LayoutState>;
      const base = defaultState(defs);
      const order = [
        ...(parsed.order ?? []).filter((id) => base.blocks[id]),
        ...base.order.filter((id) => !(parsed.order ?? []).includes(id)),
      ];
      const blocks = { ...base.blocks };
      for (const [id, v] of Object.entries(parsed.blocks ?? {})) {
        if (blocks[id] && v) blocks[id] = { hidden: !!v.hidden, collapsed: !!v.collapsed };
      }
      setState({ order, blocks });
    } catch {
      /* ignore corrupt layout */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  const persist = useCallback((next: LayoutState) => {
    setState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* storage unavailable */
    }
  }, []);

  const toggleHidden = useCallback(
    (id: string) =>
      setState((s) => {
        const cur = s.blocks[id] ?? { hidden: false, collapsed: false };
        const next = { ...s, blocks: { ...s.blocks, [id]: { ...cur, hidden: !cur.hidden } } };
        try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
        return next;
      }),
    [],
  );

  const toggleCollapsed = useCallback(
    (id: string) =>
      setState((s) => {
        const cur = s.blocks[id] ?? { hidden: false, collapsed: false };
        const next = { ...s, blocks: { ...s.blocks, [id]: { ...cur, collapsed: !cur.collapsed } } };
        try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
        return next;
      }),
    [],
  );

  const move = useCallback(
    (id: string, dir: -1 | 1) =>
      setState((s) => {
        const order = [...s.order];
        const i = order.indexOf(id);
        const j = i + dir;
        if (i < 0 || j < 0 || j >= order.length) return s;
        [order[i], order[j]] = [order[j], order[i]];
        const next = { ...s, order };
        try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
        return next;
      }),
    [],
  );

  const reset = useCallback(() => {
    const next = defaultState(defs);
    persist(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defs, persist]);

  const value = useMemo<Ctx>(
    () => ({ isAdmin, state, defs, toggleHidden, toggleCollapsed, move, reset }),
    [isAdmin, state, defs, toggleHidden, toggleCollapsed, move, reset],
  );

  return <LayoutCtx.Provider value={value}>{children}</LayoutCtx.Provider>;
}

export function useStudioLayout() {
  return useContext(LayoutCtx);
}

/**
 * Column wrapper: reorders its direct <StudioBlock> children for admins.
 * For everyone else it renders children in the original order.
 */
export function StudioColumn({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  const ctx = useStudioLayout();
  const arr = Children.toArray(children);
  let ordered = arr;
  if (ctx?.isAdmin) {
    const rank = new Map(ctx.state.order.map((id, i) => [id, i]));
    ordered = [...arr].sort((a, b) => {
      const ai = isValidElement(a) ? rank.get((a.props as any)?.id) : undefined;
      const bi = isValidElement(b) ? rank.get((b.props as any)?.id) : undefined;
      return (ai ?? 999) - (bi ?? 999);
    });
  }
  return <div className={className}>{ordered}</div>;
}


/**
 * Wraps an existing UI block. For non-admins it renders children untouched.
 */
export function StudioBlock({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: ReactNode;
}) {
  const ctx = useStudioLayout();
  if (!ctx || !ctx.isAdmin) return <>{children}</>;

  const st = ctx.state.blocks[id] ?? { hidden: false, collapsed: false };

  return (
    <div className={cn("relative", st.hidden && "hidden")}>
      <button
        type="button"
        onClick={() => ctx.toggleCollapsed(id)}
        title={st.collapsed ? `Expand ${label}` : `Collapse ${label}`}
        aria-label={st.collapsed ? `Expand ${label}` : `Collapse ${label}`}
        className="absolute right-1 top-1 z-50 rounded-md border border-zinc-700 bg-black/80 p-1 text-zinc-400 backdrop-blur transition-colors hover:text-white"
      >
        {st.collapsed ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
      </button>
      {st.collapsed && (
        <div className="rounded-xl border border-dashed border-zinc-800 bg-zinc-950/60 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
          {label} — collapsed
        </div>
      )}
      {/* Kept mounted so live connections never drop. */}
      <div className={cn(st.collapsed && "hidden")}>{children}</div>
    </div>
  );
}

/** Admin "Customize Layout" button + panel. Renders nothing for non-admins. */
export function CustomizeLayoutButton() {
  const ctx = useStudioLayout();
  const [open, setOpen] = useState(false);
  if (!ctx || !ctx.isAdmin) return null;

  const ordered = [...ctx.defs].sort(
    (a, b) => ctx.state.order.indexOf(a.id) - ctx.state.order.indexOf(b.id),
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-md border border-[#C53DFF]/40 bg-[#C53DFF]/10 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-widest text-[#C53DFF] hover:bg-[#C53DFF]/20"
      >
        <LayoutPanelTop className="h-3.5 w-3.5" /> Customize Layout
      </button>

      {open && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[2000] flex items-start justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm" onClick={() => setOpen(false)}>
          <div
            className="mt-16 w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-950 p-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-widest text-white">Customize Layout</h3>
              <button onClick={() => setOpen(false)} className="text-zinc-500 hover:text-white" aria-label="Close">
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mb-3 text-[11px] text-zinc-500">Admin only. Changes are saved to this device.</p>

            <div className="flex flex-col gap-1.5">
              {ordered.map((d, i) => {
                const st = ctx.state.blocks[d.id] ?? { hidden: false, collapsed: false };
                return (
                  <div key={d.id} className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-black/50 px-2.5 py-2">
                    <span className="flex-1 truncate text-xs text-white/80">{d.label}</span>
                    <button
                      onClick={() => ctx.move(d.id, -1)}
                      disabled={i === 0}
                      title="Move up"
                      aria-label={`Move ${d.label} up`}
                      className="rounded border border-zinc-800 p-1 text-zinc-400 hover:text-white disabled:opacity-30"
                    >
                      <ChevronUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => ctx.move(d.id, 1)}
                      disabled={i === ordered.length - 1}
                      title="Move down"
                      aria-label={`Move ${d.label} down`}
                      className="rounded border border-zinc-800 p-1 text-zinc-400 hover:text-white disabled:opacity-30"
                    >
                      <ChevronDown className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => ctx.toggleCollapsed(d.id)}
                      title={st.collapsed ? "Expand" : "Collapse"}
                      className={cn(
                        "rounded border px-1.5 py-1 text-[9px] font-bold uppercase tracking-widest",
                        st.collapsed
                          ? "border-[#00E6FF]/40 bg-[#00E6FF]/10 text-[#00E6FF]"
                          : "border-zinc-800 text-zinc-400 hover:text-white",
                      )}
                    >
                      {st.collapsed ? "Exp" : "Col"}
                    </button>
                    <button
                      onClick={() => ctx.toggleHidden(d.id)}
                      title={st.hidden ? "Show" : "Hide"}
                      aria-label={st.hidden ? `Show ${d.label}` : `Hide ${d.label}`}
                      className={cn(
                        "rounded border p-1",
                        st.hidden
                          ? "border-[#FF00A6]/40 bg-[#FF00A6]/10 text-[#FF00A6]"
                          : "border-zinc-800 text-zinc-400 hover:text-white",
                      )}
                    >
                      {st.hidden ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                );
              })}
            </div>

            <button
              onClick={ctx.reset}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-zinc-800 bg-black/60 py-2 text-[11px] font-bold uppercase tracking-widest text-zinc-400 hover:text-white"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Reset to default layout
            </button>
          </div>
        </div>
      )}
    </>
  );
}
