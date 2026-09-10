"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { isInsideAndroidApp } from "@/lib/androidBridge";

interface DownloadFormProps {
  placeholder?: string;
}

interface ResultFormat {
  label: string;
  token: string;
}

type Status = "idle" | "loading" | "error" | "unconfigured" | "ready" | "extraction_failed";

const LOADING_MESSAGES = [
  "Reading the link…",
  "Talking to the source…",
  "Finding available formats…",
  "Almost there…",
];

export function DownloadForm({ placeholder = "Paste a video link" }: DownloadFormProps) {
  const [value, setValue] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [title, setTitle] = useState<string | null>(null);
  const [formats, setFormats] = useState<ResultFormat[]>([]);
  const [focused, setFocused] = useState(false);
  const [downloadingToken, setDownloadingToken] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [completedToken, setCompletedToken] = useState<string | null>(null);
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);
  const [canShareFiles, setCanShareFiles] = useState(false);
  const submittingRef = useRef(false);
  const lastBlobRef = useRef<{ blob: Blob; filename: string } | null>(null);

  useEffect(() => {
    setCanShareFiles(
      typeof navigator !== "undefined" &&
        "canShare" in navigator &&
        navigator.canShare({ files: [new File([""], "test.mp4", { type: "video/mp4" })] })
    );
  }, []);

  useEffect(() => {
    if (status !== "loading") {
      setLoadingMessageIndex(0);
      return;
    }
    const interval = setInterval(() => {
      setLoadingMessageIndex((i) => Math.min(i + 1, LOADING_MESSAGES.length - 1));
    }, 2200);
    return () => clearInterval(interval);
  }, [status]);

  async function handlePaste() {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setValue(text.trim());
        // Clear any results/errors from a previous search — otherwise old
        // format buttons or an old error message stay on screen under the
        // freshly pasted link, looking like leftover/duplicate UI.
        setStatus("idle");
        setMessage(null);
        setFormats([]);
        setTitle(null);
        setDownloadError(null);
        setCompletedToken(null);
      }
    } catch {
      // Clipboard permission denied or unavailable — input stays manual, no error shown.
    }
  }

  async function runSubmit(url: string) {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setStatus("loading");
    setMessage(null);
    setFormats([]);
    setTitle(null);
    setDownloadError(null);
    setCompletedToken(null);

    try {
      const res = await fetch("/api/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
        signal: AbortSignal.timeout(25_000),
      });
      const data = await res.json();

      if (!res.ok) {
        setStatus("error");
        setMessage(data.error ?? "Something went wrong. Try again.");
        return;
      }

      if (data.status === "provider_not_configured") {
        setStatus("unconfigured");
        setMessage(data.message);
        return;
      }

      if (data.status === "extraction_failed") {
        setStatus("extraction_failed");
        setMessage(data.message);
        return;
      }

      if (data.status === "ready") {
        setStatus("ready");
        setTitle(data.title ?? null);
        setFormats(data.formats ?? []);
        return;
      }

      setStatus("idle");
    } catch (err) {
      setStatus("error");
      setMessage(
        err instanceof DOMException && err.name === "TimeoutError"
          ? "That took too long. The source may be slow right now — try again."
          : "Couldn't reach the server. Check your connection and try again."
      );
    } finally {
      submittingRef.current = false;
    }
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = value.trim();
    if (!trimmed || status === "loading") return;
    void runSubmit(trimmed);
  }

  // Supports a ?url= query param so a shared link (e.g. from the Android
  // app's share-sheet handler, or anyone linking directly with a URL
  // param) pre-fills and auto-starts the download — without this, a
  // "share to ClipGrab" flow would just open the homepage with an empty
  // box, defeating the point of sharing directly to the app.
  const sharedUrlParam = useSearchParams().get("url");
  const autoSubmittedRef = useRef(false);
  useEffect(() => {
    if (!sharedUrlParam || autoSubmittedRef.current) return;
    autoSubmittedRef.current = true;
    const decoded = decodeURIComponent(sharedUrlParam);
    setValue(decoded);
    void runSubmit(decoded);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sharedUrlParam]);

  async function handleDownloadClick(format: ResultFormat) {
    if (downloadingToken) return;

    // Inside the Android app, hand off to a real navigation so the
    // native app's own DownloadListener + DownloadManager can take over
    // and save straight into Downloads/Gallery — see
    // src/lib/androidBridge.ts for why a JS blob download can't do this.
    if (isInsideAndroidApp()) {
      window.location.href = `/api/download/file?token=${format.token}`;
      setCompletedToken(format.token);
      return;
    }

    setDownloadingToken(format.token);
    setDownloadProgress(0);
    setDownloadError(null);
    setCompletedToken(null);

    try {
      const res = await fetch(`/api/download/file?token=${format.token}`, {
        signal: AbortSignal.timeout(90_000),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setDownloadError(
          data?.error ?? "This link stopped working. Go back and submit the video link again."
        );
        return;
      }

      const disposition = res.headers.get("content-disposition") ?? "";
      const filenameMatch = disposition.match(/filename="([^"]+)"/);
      const filename = filenameMatch?.[1] ?? "download";
      const contentType = res.headers.get("content-type") ?? "application/octet-stream";
      const totalStr = res.headers.get("content-length");
      const total = totalStr ? parseInt(totalStr, 10) : 0;

      let blob: Blob;
      if (res.body && total > 0) {
        const reader = res.body.getReader();
        const chunks: BlobPart[] = [];
        let received = 0;
        for (;;) {
          const { done, value: chunk } = await reader.read();
          if (done) break;
          chunks.push(chunk);
          received += chunk.length;
          setDownloadProgress(Math.min(99, Math.round((received / total) * 100)));
        }
        blob = new Blob(chunks, { type: contentType });
      } else {
        // No content-length header to track progress against — fall back
        // to a plain read; the button still shows an indeterminate spinner.
        blob = await res.blob();
      }

      setDownloadProgress(100);
      lastBlobRef.current = { blob, filename };

      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);

      setCompletedToken(format.token);
    } catch (err) {
      setDownloadError(
        err instanceof DOMException && err.name === "TimeoutError"
          ? "The download is taking too long. Try again, or pick a smaller format."
          : "Couldn't download that file. Try again."
      );
    } finally {
      setDownloadingToken(null);
      setDownloadProgress(null);
    }
  }

  async function handleSaveToGallery() {
    if (!lastBlobRef.current) return;
    const { blob, filename } = lastBlobRef.current;
    try {
      const file = new File([blob], filename, { type: blob.type });
      await navigator.share({ files: [file] });
    } catch {
      // Share sheet cancelled or unsupported mid-flow — the file is
      // already saved via the direct download, so this is a soft failure.
    }
  }

  const canRetry = status === "error" || status === "extraction_failed";

  return (
    <div className="w-full">
      <form onSubmit={handleSubmit} className="w-full">
        <div
          className={`flex flex-col gap-2 rounded-2xl p-2 transition-shadow duration-200 sm:flex-row sm:items-center ${
            focused
              ? "shadow-[0_0_0_4px_rgba(30,99,238,0.16),0_12px_32px_rgba(18,20,26,0.10)]"
              : "shadow-[0_1px_2px_rgba(18,20,26,0.05),0_10px_28px_rgba(18,20,26,0.08)]"
          } ${status === "loading" ? "loading-pattern" : "bg-paper-raised"} border border-line`}
        >
          <label htmlFor="video-link" className="sr-only">
            Video link
          </label>
          <div className="relative min-w-0 flex-1">
            <input
              id="video-link"
              name="video-link"
              type="url"
              inputMode="url"
              autoComplete="off"
              required
              disabled={status === "loading"}
              placeholder={placeholder}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              className="w-full rounded-xl border-0 bg-transparent py-3.5 pl-4 pr-14 text-[15px] text-ink outline-none placeholder:text-muted disabled:opacity-60"
            />
            <button
              type="button"
              onClick={handlePaste}
              disabled={status === "loading"}
              aria-label="Paste from clipboard"
              title="Paste from clipboard"
              className="absolute right-1.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-muted hover:bg-paper hover:text-accent disabled:opacity-50"
            >
              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                <path d="M8 3a1 1 0 00-1 1v1H5.5A1.5 1.5 0 004 6.5v10A1.5 1.5 0 005.5 18h9a1.5 1.5 0 001.5-1.5v-10A1.5 1.5 0 0014.5 5H13V4a1 1 0 00-1-1H8zm0 2h4v1H8V5zM6 8h8v1.5H6V8zm0 3h8v1.5H6V11zm0 3h5v1.5H6V14z" />
              </svg>
            </button>
          </div>
          <button
            type="submit"
            disabled={status === "loading"}
            className={`brand-gradient-bg shrink-0 rounded-xl px-7 py-3.5 font-semibold text-white shadow-[0_8px_20px_rgba(30,99,238,0.35)] disabled:cursor-wait disabled:opacity-70 ${
              status === "loading" ? "button-shimmer" : ""
            }`}
          >
            <span className="inline-flex items-center gap-2">
              {status === "loading" && (
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
              )}
              {status === "loading" ? "Working…" : "Download"}
            </span>
          </button>
        </div>

        <div role="status" aria-live="polite" className="mt-3 min-h-[1.5rem] text-base">
          {status === "loading" && (
            <p className="text-muted transition-opacity duration-300">
              {LOADING_MESSAGES[loadingMessageIndex]}
            </p>
          )}
          {status === "error" && (
            <p className="inline-flex flex-wrap items-center gap-x-1.5 gap-y-1 text-red-600">
              <svg className="h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm-1-9a1 1 0 112 0v3a1 1 0 11-2 0V9zm1-4a1.25 1.25 0 100 2.5A1.25 1.25 0 0010 5z" clipRule="evenodd" />
              </svg>
              {message}
            </p>
          )}
          {status === "extraction_failed" && (
            <p className="inline-flex flex-wrap items-center gap-x-1.5 gap-y-1 text-red-600">
              <svg className="h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm-1-9a1 1 0 112 0v3a1 1 0 11-2 0V9zm1-4a1.25 1.25 0 100 2.5A1.25 1.25 0 0010 5z" clipRule="evenodd" />
              </svg>
              {message}
            </p>
          )}
          {status === "unconfigured" && (
            <p className="inline-flex items-start gap-1.5 rounded-lg bg-paper-raised px-3 py-2 text-muted ring-1 ring-line">
              <svg className="mt-0.5 h-4 w-4 shrink-0 text-accent" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              {message}
            </p>
          )}
          {canRetry && (
            <button
              type="button"
              onClick={() => void runSubmit(value.trim())}
              className="mt-2 inline-block rounded-lg border border-line px-4 py-1.5 text-sm font-medium hover:border-accent hover:text-accent"
            >
              Try again
            </button>
          )}
        </div>
      </form>

      {status === "ready" && formats.length > 0 && (
        <div className="surface-card animate-rise-in mt-3 rounded-xl p-4">
          {title && <p className="mb-3 truncate text-base font-medium text-ink">{title}</p>}
          <div className="flex flex-wrap gap-2">
            {formats.map((f) => {
              const isDownloading = downloadingToken === f.token;
              const isDone = completedToken === f.token;
              return (
                <button
                  key={f.token}
                  type="button"
                  onClick={() => handleDownloadClick(f)}
                  disabled={isDownloading}
                  className={`relative inline-flex items-center gap-2 overflow-hidden rounded-lg border px-4 py-2.5 text-base font-medium disabled:cursor-wait ${
                    isDone
                      ? "download-complete-pop border-green-600/40 text-green-700"
                      : "border-line hover:border-accent hover:text-accent"
                  } ${isDownloading ? "border-accent/50 shadow-[0_0_0_3px_rgba(30,99,238,0.12)]" : ""}`}
                >
                  {isDownloading && downloadProgress !== null && (
                    <span
                      className="download-progress-fill absolute inset-y-0 left-0 transition-[width] duration-150"
                      style={{ width: `${downloadProgress}%` }}
                      aria-hidden
                    />
                  )}
                  <span className="relative inline-flex items-center gap-2">
                    {isDownloading && (
                      <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                      </svg>
                    )}
                    {isDone && !isDownloading && (
                      <svg className="h-4 w-4 text-green-600" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.7 5.3a1 1 0 010 1.4l-8 8a1 1 0 01-1.4 0l-4-4a1 1 0 111.4-1.4L8 12.6l7.3-7.3a1 1 0 011.4 0z" clipRule="evenodd" />
                      </svg>
                    )}
                    {isDownloading && downloadProgress !== null
                      ? `${f.label} · ${downloadProgress}%`
                      : isDone
                        ? `${f.label} · Saved`
                        : f.label}
                  </span>
                </button>
              );
            })}
          </div>

          {completedToken && (
            <div className="mt-3 flex flex-wrap items-center gap-3 rounded-lg bg-green-50 px-3 py-2.5 text-sm text-green-800">
              <svg className="h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M16.7 5.3a1 1 0 010 1.4l-8 8a1 1 0 01-1.4 0l-4-4a1 1 0 111.4-1.4L8 12.6l7.3-7.3a1 1 0 011.4 0z" clipRule="evenodd" />
              </svg>
              <span>Downloaded — check your device&apos;s Downloads folder.</span>
              {canShareFiles && (
                <button
                  type="button"
                  onClick={handleSaveToGallery}
                  className="ml-auto rounded-md border border-green-700/30 px-3 py-1 font-medium text-green-800 hover:bg-green-100"
                >
                  Save to Photos…
                </button>
              )}
            </div>
          )}

          {downloadError && (
            <p className="mt-3 inline-flex items-center gap-1.5 text-sm text-red-600">
              <svg className="h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm-1-9a1 1 0 112 0v3a1 1 0 11-2 0V9zm1-4a1.25 1.25 0 100 2.5A1.25 1.25 0 0010 5z" clipRule="evenodd" />
              </svg>
              {downloadError}
            </p>
          )}
          <p className="mt-3 text-sm text-muted">Links expire after 10 minutes.</p>
        </div>
      )}
    </div>
  );
}
