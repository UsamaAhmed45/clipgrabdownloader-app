import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-2xl px-5 py-24 text-center">
      <h1 className="font-display text-3xl">Page Not Found</h1>
      <p className="mt-3 text-muted">
        This page doesn&apos;t exist, or the link is out of date.
      </p>
      <Link
        href="/"
        className="mt-8 inline-block rounded-md bg-accent px-6 py-3 font-medium text-white hover:opacity-90"
      >
        Back to homepage
      </Link>
    </div>
  );
}
