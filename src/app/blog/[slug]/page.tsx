import { getAllPosts, getPostBySlug } from "@/lib/blog";
import { notFound } from "next/navigation";
import Link from "next/link";

export const dynamicParams = true;

export async function generateStaticParams() {
  return getAllPosts().map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) return { title: "Post not found" };
  return { title: post.title + " - Blog", description: post.excerpt };
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) notFound();
  return (
    <>
      <main style={{ maxWidth: "660px", margin: "0 auto", padding: "0 24px 64px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px", fontSize: "0.82rem", color: "#6b7280", flexWrap: "wrap" as const }}>
          {post.tags.slice(0, 3).map((tag) => (
            <span key={tag} style={{ padding: "2px 8px", borderRadius: "6px", background: "#2563eb18", color: "#2563eb", fontWeight: 600, fontSize: "0.72rem", textTransform: "uppercase" as const, letterSpacing: "0.04em" }}>{tag}</span>
          ))}
          <span>{post.date}</span>
          <span>{post.readTime}</span>
        </div>
        <h1 style={{ fontSize: "clamp(1.8rem, 4vw, 2.4rem)", lineHeight: 1.15, marginBottom: "28px" }}>{post.title}</h1>
        <article style={{ fontSize: "1.05rem", lineHeight: 1.8 }} dangerouslySetInnerHTML={{ __html: post.content }} />
        <p style={{ marginTop: "40px" }}>
          <Link href="/blog" style={{ color: "#2563eb", fontWeight: 600, textDecoration: "none" }}>{"← Back to blog"}</Link>
        </p>
      </main>
    </>
  );
}
