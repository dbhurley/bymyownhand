import { getAllPosts, getPostBySlug } from "@/lib/blog";
import { notFound } from "next/navigation";
import Link from "next/link";

export async function generateStaticParams() {
  return getAllPosts().map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) return { title: "Post not found" };
  return {
    title: `${post.title} - ByMyOwnHand Blog`,
    description: post.excerpt,
  };
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) notFound();

  return (
    <div style={{ maxWidth: "680px", margin: "0 auto", padding: "80px 24px 64px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px", fontSize: "0.82rem", color: "#6b7280", flexWrap: "wrap" as const }}>
        {post.tags.slice(0, 3).map((tag) => (
          <span key={tag} style={{ padding: "2px 8px", borderRadius: "6px", background: "rgba(59,130,246,0.1)", color: "#3b82f6", fontWeight: 600, fontSize: "0.72rem", textTransform: "uppercase" as const, letterSpacing: "0.04em" }}>
            {tag}
          </span>
        ))}
        <span>{new Date(post.date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</span>
        <span>{post.readTime}</span>
      </div>
      <h1 style={{ fontSize: "clamp(1.8rem, 4vw, 2.4rem)", lineHeight: 1.1, marginBottom: "24px" }}>{post.title}</h1>
      <div style={{ color: "#4b5563", fontSize: "0.95rem", lineHeight: 1.8 }} dangerouslySetInnerHTML={{ __html: post.content }} />
      <p style={{ marginTop: "40px" }}>
        <Link href="/blog" style={{ fontWeight: 600, fontSize: "0.9rem" }}>\u2190 Back to blog</Link>
      </p>
    </div>
  );
}
