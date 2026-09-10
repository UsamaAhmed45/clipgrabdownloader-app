import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { buildMetadata } from "@/lib/seo";
import { JsonLd } from "@/components/seo/JsonLd";
import { articleJsonLd, breadcrumbJsonLd } from "@/lib/jsonld";
import { getPostBySlug, getPublishedPosts } from "@/config/blog";
import { getPlatformBySlug } from "@/config/platforms";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return getPublishedPosts().map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) return {};
  return buildMetadata({
    title: post.title,
    description: post.metaDescription,
    path: `/blog/${post.slug}`,
    type: "article",
  });
}

function renderBody(body: string[]) {
  return body.map((block, i) => {
    if (block.startsWith("## ")) {
      return (
        <h2 key={i} className="font-display mt-8 text-xl">
          {block.replace("## ", "")}
        </h2>
      );
    }
    return (
      <p key={i} className="mt-4 text-base leading-relaxed text-ink/90">
        {block}
      </p>
    );
  });
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) notFound();

  const relatedPlatforms = post.relatedPlatformSlugs
    .map((s) => getPlatformBySlug(s))
    .filter((p) => p && p.published);

  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Blog", path: "/blog" },
          { name: post.title, path: `/blog/${post.slug}` },
        ])}
      />
      <JsonLd
        data={articleJsonLd({
          title: post.title,
          description: post.metaDescription,
          path: `/blog/${post.slug}`,
          author: post.author,
          publishedDate: post.publishedDate,
          updatedDate: post.updatedDate,
        })}
      />

      <article className="mx-auto max-w-2xl px-5 py-12">
        <h1 className="font-display text-3xl">{post.title}</h1>
        <p className="mt-3 text-base text-muted">
          By {post.author} · Published{" "}
          <time dateTime={post.publishedDate}>
            {new Date(post.publishedDate).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
          </time>
          {post.updatedDate && (
            <>
              {" "}· Updated{" "}
              <time dateTime={post.updatedDate}>
                {new Date(post.updatedDate).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
              </time>
            </>
          )}
        </p>

        <div className="mt-8">{renderBody(post.body)}</div>

        {relatedPlatforms.length > 0 && (
          <div className="mt-12 border-t border-line pt-8">
            <h2 className="font-display text-xl">Related</h2>
            <div className="mt-4 flex flex-wrap gap-3">
              {relatedPlatforms.map((p) => (
                <Link
                  key={p!.slug}
                  href={`/${p!.slug}`}
                  className="rounded-md border border-line px-4 py-2 text-base hover:border-accent hover:text-accent"
                >
                  {p!.name} downloader
                </Link>
              ))}
            </div>
          </div>
        )}
      </article>
    </>
  );
}
