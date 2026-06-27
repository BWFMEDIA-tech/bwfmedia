import { Link } from "@tanstack/react-router";
import { ArrowUpRight, Calendar, Clock } from "lucide-react";
import type { ReactNode } from "react";

interface BlogArticleProps {
  category: string;
  title: string;
  date: string;
  readTime: string;
  intro: string;
  children: ReactNode;
}

export function BlogArticle({ category, title, date, readTime, intro, children }: BlogArticleProps) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="max-w-7xl mx-auto px-6 md:px-12 h-16 flex items-center justify-between">
          <Link to="/" className="font-display text-xl tracking-tight text-bone hover:opacity-80">
            BWF<span style={{ color: "var(--blood)" }}>™</span>
          </Link>
          <nav className="flex items-center gap-6 font-cond font-bold tracking-[0.25em] text-[11px] uppercase">
            <Link to="/" className="text-bone/70 hover:text-bone transition-colors">Home</Link>
            <Link to="/blog" className="text-bone/70 hover:text-bone transition-colors">Blog</Link>
            <Link to="/tunevio" className="text-bone hover:opacity-80" style={{ color: "var(--blood)" }}>Tunevio</Link>
          </nav>
        </div>
      </header>

      <article className="max-w-3xl mx-auto px-6 md:px-12 py-16 md:py-24">
        <div className="font-cond font-bold tracking-[0.3em] text-xs uppercase mb-4" style={{ color: "var(--blood)" }}>
          {category}
        </div>
        <h1 className="font-display text-4xl md:text-6xl leading-[0.95] text-bone heavy-shadow mb-6">
          {title}
        </h1>
        <div className="flex items-center gap-5 text-bone/50 font-cond tracking-[0.2em] text-[11px] uppercase mb-10 pb-10 border-b border-border">
          <span className="flex items-center gap-2"><Calendar className="w-3.5 h-3.5" />{date}</span>
          <span className="flex items-center gap-2"><Clock className="w-3.5 h-3.5" />{readTime}</span>
        </div>
        <p className="text-bone/80 text-lg md:text-xl leading-relaxed mb-10">{intro}</p>
        <div className="prose-blog space-y-6 text-bone/75 text-base md:text-lg leading-relaxed [&>h2]:font-display [&>h2]:text-2xl [&>h2]:md:text-3xl [&>h2]:text-bone [&>h2]:mt-12 [&>h2]:mb-4 [&>h2]:tracking-tight [&>h3]:font-display [&>h3]:text-xl [&>h3]:text-bone [&>h3]:mt-8 [&>h3]:mb-3 [&>ul]:list-disc [&>ul]:pl-6 [&>ul]:space-y-2 [&>ol]:list-decimal [&>ol]:pl-6 [&>ol]:space-y-2 [&_a]:underline [&_a]:underline-offset-4 [&_a:hover]:opacity-80">
          {children}
        </div>

        <div
          className="mt-16 p-8 border-2 flex flex-col sm:flex-row items-start sm:items-center gap-6 justify-between"
          style={{ borderColor: "var(--border)", backgroundColor: "rgba(0,0,0,0.55)" }}
        >
          <div>
            <div className="font-cond font-bold tracking-[0.3em] text-[10px] uppercase mb-2" style={{ color: "var(--blood)" }}>
              Built for artists
            </div>
            <h3 className="font-display text-2xl text-bone leading-tight">Stream, battle, and grow on Tunevio.</h3>
          </div>
          <Link
            to="/tunevio"
            className="inline-flex items-center gap-2 px-5 py-3 font-cond font-bold tracking-[0.3em] text-[11px] uppercase text-bone hover:opacity-90 transition-opacity whitespace-nowrap"
            style={{ backgroundColor: "var(--blood)", boxShadow: "var(--shadow-blood)" }}
          >
            Join Tunevio <ArrowUpRight className="w-4 h-4" />
          </Link>
        </div>
      </article>
    </div>
  );
}