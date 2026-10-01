import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { BlogArticle } from "@/components/blog/BlogArticle";
import { deleteBlogPost, formatPostDate, getBlogPost, type BlogPostRow } from "@/lib/blog-posts";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/blog/$slug")({
  head: () => ({
    meta: [
      { title: "Blog Post — BWF Media TV" },
      { name: "description", content: "Read the latest story from the BWF Media TV blog." },
      { property: "og:title", content: "BWF Media TV Blog Post" },
      { property: "og:description", content: "Interviews, guides, and culture commentary from BWF Media TV." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: BlogPostPage,
});

function BlogPostPage() {
  const { slug } = Route.useParams();
  const { roles } = useAuth();
  const navigate = useNavigate();
  const [post, setPost] = useState<BlogPostRow | null | undefined>(undefined);

  useEffect(() => {
    getBlogPost(slug).then(setPost).catch(() => setPost(null));
  }, [slug]);

  useEffect(() => {
    if (post) document.title = `${post.title} — BWF Media TV`;
  }, [post]);

  if (post === undefined) return <div className="min-h-screen bg-background p-12 text-bone/60">Loading…</div>;
  if (!post)
    return (
      <div className="min-h-screen bg-background p-12 text-bone">
        Post not found. <Link to="/blog" className="underline">Back to blog</Link>
      </div>
    );

  const blocks = post.body.split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);

  return (
    <BlogArticle category={post.category} title={post.title} date={formatPostDate(post.created_at)} readTime={`${post.read_minutes} min read`} intro={post.excerpt}>
      {!post.published && <p className="text-xs uppercase tracking-widest" style={{ color: "var(--blood)" }}>Draft — only admins can see this</p>}
      {post.cover_url && <img src={post.cover_url} alt={post.title} className="w-full border-2" style={{ borderColor: "var(--border)" }} />}
      {blocks.map((b, i) =>
        b.startsWith("### ") ? <h3 key={i}>{b.slice(4)}</h3> : b.startsWith("## ") ? <h2 key={i}>{b.slice(3)}</h2> : <p key={i} className="whitespace-pre-line">{b}</p>,
      )}
      {roles.includes("admin") && (
        <button
          onClick={async () => {
            if (!confirm("Delete this post?")) return;
            try { await deleteBlogPost(post.id); toast.success("Post deleted"); navigate({ to: "/blog" }); }
            catch (e: any) { toast.error(e.message); }
          }}
          className="mt-8 px-4 py-2 border-2 text-xs uppercase tracking-widest text-bone/70"
          style={{ borderColor: "var(--border)" }}
        >
          Delete post
        </button>
      )}
    </BlogArticle>
  );
}
