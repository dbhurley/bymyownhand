import DynamicBlogPosts from "./dynamic-posts";

export const metadata = { title: "Blog", description: "Latest posts and insights." };

export default function BlogPage() {
  return (
    <>
      <main style={{ maxWidth: "720px", margin: "0 auto", padding: "0 24px 64px" }}>
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <h1 style={{ fontSize: "clamp(2rem, 5vw, 2.8rem)", lineHeight: 0.95, marginBottom: "10px" }}>Blog</h1>
          <p style={{ color: "#6b7280", maxWidth: "440px", margin: "0 auto" }}>Latest posts and insights.</p>
        </div>
        <div style={{ display: "grid", gap: "16px" }}><DynamicBlogPosts /></div>
      </main>
    </>
  );
}
