import type { ReactNode } from "react";

export function SettingsShell({ title, blurb, children, actions }: { title: string; blurb?: string; children: ReactNode; actions?: ReactNode }) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black tracking-tight">{title}</h1>
          {blurb && <p className="mt-1 text-sm text-white/60">{blurb}</p>}
        </div>
        {actions}
      </div>
      {children}
    </div>
  );
}

export function Card({ children, title, icon }: { children: ReactNode; title?: string; icon?: ReactNode }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
      {title && <div className="mb-4 flex items-center gap-2 text-sm font-semibold">{icon}{title}</div>}
      {children}
    </div>
  );
}

export function Row({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-white/5 py-3 last:border-0">
      <div>
        <div className="text-sm font-medium">{label}</div>
        {hint && <div className="text-xs text-white/50">{hint}</div>}
      </div>
      <div>{children}</div>
    </div>
  );
}