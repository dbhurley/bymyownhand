import { getAllPosts } from "@/lib/blog";
import Link from "next/link";

export default function DynamicBlogPosts() {
  const posts = getAllPosts();
  if (posts.length === 0) return null;

  return (
    <>
      {posts.map((p) => (
        <Link key={p.slug} href={`/blog/${p.slug}`} style={{ display: "block", padding: "24px", border: "1px solid #e5e7eb", borderRadius: "8px", textDecoration: "none", color: "inherit", transition: "box-shadow 0.15s" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px", fontSize: "0.78rem", color: "#6b7280", flexWrap: "wrap" as const }}>
            {p.tags.slice(0, 2).map((tag) => (
              <span key={tag} style={{ padding: "2px 8px", borderRadius: "6px", background: "rgba(59,130,246,0.1)", color: "#3b82f6", fontWeight: 600, fontSize: "0.72rem", textTransform: "uppercase" as const, letterSpacing: "0.04em" }}>{tag}</span>
            ))}
            <span>{new Date(p.date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</span>
          </div>
          <h2 style={{ fontSize: "1.15rem", lineHeight: 1.25, marginBottom: "8px" }}>{p.title}</h2>
          <p style={{ margin: 0, color: "#6b7280", fontSize: "0.9rem" }}>{p.excerpt}</p>
        </Link>
      ))}
    </>
  );
}
