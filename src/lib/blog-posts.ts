import { supabase } from "@/integrations/supabase/client";

export interface BlogPostRow {
  id: string;
  slug: string;
  title: string;
  category: string;
  excerpt: string;
  body: string;
  cover_url: string | null;
  read_minutes: number;
  published: boolean;
  created_at: string;
}

const db = supabase as any;

export function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
}

export async function listBlogPosts(): Promise<BlogPostRow[]> {
  const { data, error } = await db.from("blog_posts").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getBlogPost(slug: string): Promise<BlogPostRow | null> {
  const { data, error } = await db.from("blog_posts").select("*").eq("slug", slug).maybeSingle();
  if (error) throw error;
  return data;
}

export async function createBlogPost(p: Omit<BlogPostRow, "id" | "created_at">) {
  const { data: u } = await supabase.auth.getUser();
  const { error } = await db.from("blog_posts").insert({ ...p, author_id: u.user?.id });
  if (error) throw error;
}

export async function deleteBlogPost(id: string) {
  const { error } = await db.from("blog_posts").delete().eq("id", id);
  if (error) throw error;
}

export function formatPostDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
