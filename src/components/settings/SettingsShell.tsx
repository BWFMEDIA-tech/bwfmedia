import type { ReactNode } from "react";

export function SettingsShell({ title, blurb, children, actions }: { title: string; blurb?: string; children: ReactNode; actions?: ReactNode }) {
  return (
    <div className="swara-settings-shell space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{title}</h1>
          {blurb && <p className="mt-1 text-sm text-muted-foreground">{blurb}</p>}
        </div>
        {actions}
      </div>
      {children}
    </div>
  );
}

export function Card({ children, title, icon }: { children: ReactNode; title?: string; icon?: ReactNode }) {
  return (
    <div className="swara-settings-panel border-b border-border py-6">
      {title && <div className="mb-4 flex items-center gap-2 text-sm font-semibold">{icon}{title}</div>}
      {children}
    </div>
  );
}

export function Row({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-border/50 py-3 last:border-0 sm:gap-4">
      <div className="min-w-0">
        <div className="text-sm font-medium">{label}</div>
        {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
      </div>
      <div className="min-w-0 max-w-full">{children}</div>
    </div>
  );
}