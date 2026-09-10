import type { Metadata } from "next";
import Link from "next/link";
import { buildMetadata } from "@/lib/seo";
import { JsonLd } from "@/components/seo/JsonLd";
import { breadcrumbJsonLd } from "@/lib/jsonld";
import { getPublishedPosts } from "@/config/blog";

export const metadata: Metadata = buildMetadata({
  title: "Blog",
  description: "Practical, plain-language guides on downloading videos, understanding video quality and formats, and troubleshooting links that won't process.",
  path: "/blog",
});

export default function BlogIndexPage() {
  const posts = getPublishedPosts();

  return (
    <>
      <JsonLd data={breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "Blog", path: "/blog" }])} />
      <article className="mx-auto max-w-2xl px-5 py-12">
        <h1 className="font-display text-3xl">Blog</h1>
        <p className="mt-3 text-muted">Guides on downloading, video quality, and troubleshooting.</p>

        <ul className="mt-10 divide-y divide-line border-y border-line">
          {posts.map((post) => (
            <li key={post.slug} className="py-6">
              <Link href={`/blog/${post.slug}`} className="group">
                <h2 className="font-display text-xl group-hover:text-accent">{post.title}</h2>
                <p className="mt-2 text-base text-muted">{post.excerpt}</p>
                <time dateTime={post.publishedDate} className="mt-2 block text-sm text-muted">
                  {new Date(post.publishedDate).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </time>
              </Link>
            </li>
          ))}
        </ul>
      </article>
    </>
  );
}
