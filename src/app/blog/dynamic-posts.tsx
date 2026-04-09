import { getAllPosts } from "@/lib/blog";
import Link from "next/link";

export default function DynamicBlogPosts() {
  const posts = getAllPosts();
  if (posts.length === 0) return null;
  return (
    <>
      {posts.map((p) => (
        <Link key={p.slug} href={"/blog/" + p.slug} style={{ display: "block", padding: "24px", border: "1px solid var(--border, #e5e7eb)", borderRadius: "8px", textDecoration: "none", color: "inherit", marginBottom: "12px", transition: "border-color 0.2s" }}>
          <div style={{ display: "flex", gap: "8px", marginBottom: "8px", fontSize: "0.78rem", color: "#6b7280", flexWrap: "wrap" as const }}>
            {p.tags.slice(0, 2).map((tag) => (
              <span key={tag} style={{ padding: "2px 8px", borderRadius: "6px", background: "#2563eb18", color: "#2563eb", fontWeight: 600, fontSize: "0.72rem", textTransform: "uppercase" as const, letterSpacing: "0.04em" }}>{tag}</span>
            ))}
            <span>{p.date}</span>
          </div>
          <h2 style={{ fontSize: "1.15rem", marginBottom: "6px" }}>{p.title}</h2>
          {p.excerpt && <p style={{ margin: 0, color: "#6b7280", fontSize: "0.9rem" }}>{p.excerpt}</p>}
        </Link>
      ))}
    </>
  );
}
