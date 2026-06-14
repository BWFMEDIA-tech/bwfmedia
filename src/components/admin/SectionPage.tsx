import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { ArrowUpRight } from "lucide-react";
import { PageHeader, Card, EmptyState } from "./AdminShell";

export function SectionPage({
  title, subtitle, stats, children, ctaLabel, ctaTo,
}: {
  title: string;
  subtitle?: string;
  stats?: { label: string; value: string | number; color?: string; icon?: any }[];
  children?: ReactNode;
  ctaLabel?: string;
  ctaTo?: string;
}) {
  return (
    <>
      <PageHeader
        title={title}
        subtitle={subtitle}
        actions={ctaTo && ctaLabel ? (
          <Link to={ctaTo} className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-2 text-xs font-bold hover:bg-blue-500">
            {ctaLabel} <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        ) : undefined}
      />
      {stats?.length ? (
        <section className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((s) => {
            const Icon = s.icon;
            return (
              <Card key={s.label} className="!p-4">
                <div className="flex items-center gap-3">
                  {Icon && (
                    <div className="grid h-9 w-9 place-items-center rounded-lg" style={{ background: `${s.color || "#3b82f6"}22`, color: s.color || "#3b82f6" }}>
                      <Icon className="h-4 w-4" />
                    </div>
                  )}
                  <div>
                    <div className="text-xs uppercase tracking-wider text-white/50">{s.label}</div>
                    <div className="text-xl font-bold">{s.value}</div>
                  </div>
                </div>
              </Card>
            );
          })}
        </section>
      ) : null}
      {children}
    </>
  );
}

export { Card, EmptyState };