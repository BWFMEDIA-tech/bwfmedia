import { SiteHeader } from "./SiteHeader";
import type { ReactNode } from "react";

export function LegalPage({
  title,
  effectiveDate,
  children,
}: {
  title: string;
  effectiveDate?: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-black text-bone">
      <SiteHeader />
      <main className="max-w-3xl mx-auto px-6 md:px-12 pt-32 pb-24">
        <h1 className="font-cond text-4xl md:text-5xl uppercase tracking-tight text-white mb-3">
          {title}
        </h1>
        {effectiveDate && (
          <p className="text-xs uppercase tracking-[0.3em] text-bone/40 mb-12">
            Effective Date: {effectiveDate}
          </p>
        )}
        <article className="prose prose-invert max-w-none text-bone/75 leading-relaxed space-y-4 [&_h2]:font-cond [&_h2]:uppercase [&_h2]:tracking-wide [&_h2]:text-white [&_h2]:mt-10 [&_h2]:mb-3 [&_h2]:text-xl [&_h3]:text-white [&_h3]:font-semibold [&_h3]:mt-6 [&_h3]:mb-2 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-1 [&_a]:text-blood [&_a]:underline">
          {children}
        </article>
      </main>
    </div>
  );
}