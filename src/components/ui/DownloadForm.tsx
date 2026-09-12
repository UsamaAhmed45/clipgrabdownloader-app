"use client";

import { useEffect, useRef, useState, type DragEvent, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { isInsideAndroidApp } from "@/lib/androidBridge";
import { normalizeSubmittedUrl } from "@/lib/urlNormalize";
import {
  MAX_CONCURRENT_DOWNLOADS,
  MAX_HISTORY_ENTRIES,
  createJobId,
  findDuplicateJob,
  nextWaitingJob,
  canStartDownload,
  type Job,
  type JobFormat,
} from "@/lib/downloadQueue";

interface DownloadFormProps {
  placeholder?: string;
}

interface HistoryEntry {
  title: string;
  platform: string;
  filename: string;
  timestamp: number;
  status: "completed" | "failed" | "cancelled";
}

const LOADING_MESSAGES = ["Reading the link…", "Talking to the source…", "Finding available formats…", "Almost there…"];
const MAX_AUTO_RETRIES = 2;
const HISTORY_STORAGE_KEY = "clipgrab-download-history";

function loadHistory(): HistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(HISTORY_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveHistory(entries: HistoryEntry[]) {
  try {
    window.localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(entries.slice(0, MAX_HISTORY_ENTRIES)));
  } catch {
    // Storage full or unavailable (private browsing, etc.) — history is a
    // nice-to-have, not worth surfacing an error for.
  }
}

// Display-only, derived purely from the URL the person actually typed —
// not fetched, not fabricated, just the hostname reformatted for
// readability in the history list.
function guessPlatformLabel(url: string): string {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "").replace(/^m\./, "");
    const primary = host.split(".").slice(0, -1).join(".") || host;
    return primary.charAt(0).toUpperCase() + primary.slice(1);
  } catch {
    return "Link";
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function DownloadForm({ placeholder = "Paste a video link" }: DownloadFormProps) {
  const [value, setValue] = useState("");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [duplicateNotice, setDuplicateNotice] = useState<string | null>(null);
  const [focused, setFocused] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);
  const [canShareFiles, setCanShareFiles] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const lastBlobRef = useRef<{ blob: Blob; filename: string } | null>(null);
  const analyzeControllersRef = useRef<Map<string, AbortController>>(new Map());
  const downloadControllersRef = useRef<Map<string, AbortController>>(new Map());
  const jobsRef = useRef<Job[]>([]);
  jobsRef.current = jobs;

  useEffect(() => {
    setCanShareFiles(
      typeof navigator !== "undefined" &&
        "canShare" in navigator &&
        navigator.canShare({ files: [new File([""], "test.mp4", { type: "video/mp4" })] })
    );
    setHistory(loadHistory());
  }, []);

  const anyAnalyzing = jobs.some((j) => j.status === "analyzing");
  useEffect(() => {
    if (!anyAnalyzing) {
      setLoadingMessageIndex(0);
      return;
    }
    const interval = setInterval(() => {
      setLoadingMessageIndex((i) => Math.min(i + 1, LOADING_MESSAGES.length - 1));
    }, 2200);
    return () => clearInterval(interval);
  }, [anyAnalyzing]);

  function updateJob(id: string, patch: Partial<Job>) {
    setJobs((prev) => prev.map((j) => (j.id === id ? { ...j, ...patch } : j)));
  }

  function removeJob(id: string) {
    analyzeControllersRef.current.get(id)?.abort();
    setJobs((prev) => prev.filter((j) => j.id !== id));
  }

  async function handlePaste() {
    try {
      const text = await navigator.clipboard.readText();
      if (text) setValue(text.trim());
    } catch {
      // Clipboard permission denied or unavailable — input stays manual, no error shown.
    }
  }

  function handleClear() {
    setValue("");
    setDuplicateNotice(null);
  }

  function submitUrl(rawUrl: string) {
    const trimmed = rawUrl.trim();
    if (!trimmed) return;

    const duplicate = findDuplicateJob(jobsRef.current, trimmed);
    if (duplicate) {
      setDuplicateNotice(`This link is already in your queue (${duplicate.title ?? "analyzing…"}).`);
      return;
    }
    setDuplicateNotice(null);

    const id = createJobId();
    const newJob: Job = {
      id,
      originalUrl: trimmed,
      normalizedUrl: normalizeSubmittedUrl(trimmed),
      status: "analyzing",
      title: null,
      formats: [],
      selectedFormatToken: null,
      error: null,
      createdAt: Date.now(),
      completedAt: null,
      retryCount: 0,
      downloadProgress: null,
    };
    setJobs((prev) => [newJob, ...prev]);
    setValue("");
    void runAnalysis(id, trimmed);
  }

  async function runAnalysis(jobId: string, url: string) {
    const controller = new AbortController();
    analyzeControllersRef.current.set(jobId, controller);

    try {
      const res = await fetch("/api/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
        signal: controller.signal,
      });
      const data = await res.json();

      if (!res.ok) {
        updateJob(jobId, { status: "failed", error: data.error ?? "Something went wrong. Try again." });
        return;
      }
      if (data.status === "provider_not_configured" || data.status === "extraction_failed") {
        updateJob(jobId, { status: "failed", error: data.message });
        return;
      }
      if (data.status === "ready") {
        updateJob(jobId, {
          status: "ready",
          title: data.title ?? null,
          author: data.author ?? undefined,
          thumbnail: data.thumbnail ?? undefined,
          formats: data.formats ?? [],
        });
        return;
      }
      updateJob(jobId, { status: "failed", error: "Unexpected response. Try again." });
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      updateJob(jobId, {
        status: "failed",
        error:
          err instanceof DOMException && err.name === "TimeoutError"
            ? "That took too long. The source may be slow right now — try again."
            : "Couldn't reach the server. Check your connection and try again.",
      });
    } finally {
      analyzeControllersRef.current.delete(jobId);
    }
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    submitUrl(value);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragActive(false);
    const dropped = event.dataTransfer.getData("text/plain") || event.dataTransfer.getData("text/uri-list");
    if (dropped) setValue(dropped.trim());
  }

  // Supports a ?url= query param so a shared link (e.g. from the Android
  // app's share-sheet handler) pre-fills and auto-starts a job.
  const sharedUrlParam = useSearchParams().get("url");
  const autoSubmittedRef = useRef(false);
  useEffect(() => {
    if (!sharedUrlParam || autoSubmittedRef.current) return;
    autoSubmittedRef.current = true;
    submitUrl(decodeURIComponent(sharedUrlParam));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sharedUrlParam]);

  function selectFormat(jobId: string, token: string) {
    updateJob(jobId, { selectedFormatToken: token });
    maybeStartNext();
  }

  function maybeStartNext() {
    setJobs((prev) => {
      if (!canStartDownload(prev, MAX_CONCURRENT_DOWNLOADS)) return prev;
      const next = nextWaitingJob(prev);
      if (!next) return prev;
      void beginDownload(next.id, next.selectedFormatToken as string, next.formats);
      return prev.map((j) => (j.id === next.id ? { ...j, status: "downloading", downloadProgress: 0 } : j));
    });
  }

  function handleDownloadClick(job: Job, format: JobFormat) {
    if (job.status === "downloading") return;

    if (isInsideAndroidApp()) {
      window.location.href = `/api/download/file?token=${format.token}`;
      updateJob(job.id, { status: "completed", completedAt: Date.now(), selectedFormatToken: format.token });
      return;
    }

    // The concurrency check and the resulting state transition must
    // happen inside the SAME setJobs updater — reading jobsRef.current
    // and calling setJobs as two separate steps is a real race: several
    // clicks can fire in the same tick (e.g. starting every queued job's
    // download at once), and each would read the same stale "before any
    // of them started" snapshot, all conclude a slot is free, and all
    // start — exactly the bug this atomic version fixes (verified with a
    // real 3-clicks-at-once browser test).
    setJobs((prev) => {
      const canStart = canStartDownload(prev, MAX_CONCURRENT_DOWNLOADS);
      const updated = prev.map((j) =>
        j.id === job.id
          ? { ...j, selectedFormatToken: format.token, status: canStart ? ("downloading" as const) : ("ready" as const), downloadProgress: canStart ? 0 : null }
          : j
      );
      if (canStart) void beginDownload(job.id, format.token, job.formats);
      return updated;
    });
  }

  function handleCancelDownload(jobId: string) {
    downloadControllersRef.current.get(jobId)?.abort();
  }

  async function beginDownload(jobId: string, token: string, formats: JobFormat[], attempt = 0) {
    const controller = new AbortController();
    downloadControllersRef.current.set(jobId, controller);

    try {
      const res = await fetch(`/api/download/file?token=${token}`, { signal: controller.signal });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        if (res.status === 502 && attempt < MAX_AUTO_RETRIES) {
          await delay(600 * (attempt + 1));
          downloadControllersRef.current.delete(jobId);
          return beginDownload(jobId, token, formats, attempt + 1);
        }
        updateJob(jobId, {
          status: "failed",
          error: data?.error ?? "This link stopped working. Try again.",
          retryCount: attempt,
        });
        recordHistory(jobId, "failed");
        return;
      }

      const disposition = res.headers.get("content-disposition") ?? "";
      const filename = disposition.match(/filename="([^"]+)"/)?.[1] ?? "download";
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
          updateJob(jobId, { downloadProgress: Math.min(99, Math.round((received / total) * 100)) });
        }
        blob = new Blob(chunks, { type: contentType });
      } else {
        blob = await res.blob();
      }

      lastBlobRef.current = { blob, filename };
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);

      updateJob(jobId, { status: "completed", downloadProgress: 100, completedAt: Date.now() });
      recordHistory(jobId, "completed", filename);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        updateJob(jobId, { status: "cancelled" });
        recordHistory(jobId, "cancelled");
      } else if (attempt < MAX_AUTO_RETRIES) {
        await delay(600 * (attempt + 1));
        downloadControllersRef.current.delete(jobId);
        return beginDownload(jobId, token, formats, attempt + 1);
      } else {
        updateJob(jobId, { status: "failed", error: "Couldn't download that file. Try again.", retryCount: attempt });
        recordHistory(jobId, "failed");
      }
    } finally {
      downloadControllersRef.current.delete(jobId);
      maybeStartNext();
    }
  }

  function recordHistory(jobId: string, status: HistoryEntry["status"], filename?: string) {
    const job = jobsRef.current.find((j) => j.id === jobId);
    if (!job) return;
    const entry: HistoryEntry = {
      title: job.title ?? "Untitled",
      platform: guessPlatformLabel(job.originalUrl),
      filename: filename ?? "—",
      timestamp: Date.now(),
      status,
    };
    setHistory((prev) => {
      const next = [entry, ...prev].slice(0, MAX_HISTORY_ENTRIES);
      saveHistory(next);
      return next;
    });
  }

  function retryJob(job: Job) {
    if (job.formats.length === 0) {
      updateJob(job.id, { status: "analyzing", error: null });
      void runAnalysis(job.id, job.originalUrl);
      return;
    }
    const token = job.selectedFormatToken ?? job.formats[0].token;
    if (!canStartDownload(jobsRef.current, MAX_CONCURRENT_DOWNLOADS)) {
      updateJob(job.id, { status: "ready", selectedFormatToken: token, error: null });
      return;
    }
    updateJob(job.id, { status: "downloading", downloadProgress: 0, error: null, selectedFormatToken: token });
    void beginDownload(job.id, token, job.formats);
  }

  async function handleSaveToGallery() {
    if (!lastBlobRef.current) return;
    const { blob, filename } = lastBlobRef.current;
    try {
      const file = new File([blob], filename, { type: blob.type });
      await navigator.share({ files: [file] });
    } catch {
      // Share sheet cancelled or unsupported — file's already saved via
      // the direct download, so this is a soft failure.
    }
  }

  function clearCompleted() {
    setJobs((prev) => prev.filter((j) => j.status !== "completed"));
  }

  function clearHistory() {
    setHistory([]);
    saveHistory([]);
  }

  const hasAnyJobs = jobs.length > 0;
  const hasCompleted = jobs.some((j) => j.status === "completed");

  return (
    <div className="w-full">
      <form onSubmit={handleSubmit} className="w-full">
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}
          className={`flex flex-col gap-2 rounded-2xl p-2 transition-shadow duration-200 sm:flex-row sm:items-center ${
            focused || dragActive
              ? "shadow-[0_0_0_4px_rgba(30,99,238,0.16),0_12px_32px_rgba(18,20,26,0.10)]"
              : "shadow-[0_1px_2px_rgba(18,20,26,0.05),0_10px_28px_rgba(18,20,26,0.08)]"
          } ${dragActive ? "ring-2 ring-accent ring-dashed" : ""} bg-paper-raised border border-line`}
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
              placeholder={dragActive ? "Drop a supported video URL here" : placeholder}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              className="w-full rounded-xl border-0 bg-transparent py-3.5 pl-4 pr-20 text-[15px] text-ink outline-none placeholder:text-muted"
            />
            <div className="absolute right-1.5 top-1/2 flex -translate-y-1/2 items-center gap-0.5">
              {value && (
                <button
                  type="button"
                  onClick={handleClear}
                  aria-label="Clear input"
                  title="Clear"
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-muted hover:bg-paper hover:text-ink"
                >
                  <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none" aria-hidden>
                    <path d="M6 6l8 8M14 6l-8 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                </button>
              )}
              <button
                type="button"
                onClick={handlePaste}
                aria-label="Paste from clipboard"
                title="Paste from clipboard"
                className="flex h-9 w-9 items-center justify-center rounded-lg text-muted hover:bg-paper hover:text-accent"
              >
                <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                  <path d="M8 3a1 1 0 00-1 1v1H5.5A1.5 1.5 0 004 6.5v10A1.5 1.5 0 005.5 18h9a1.5 1.5 0 001.5-1.5v-10A1.5 1.5 0 0014.5 5H13V4a1 1 0 00-1-1H8zm0 2h4v1H8V5zM6 8h8v1.5H6V8zm0 3h8v1.5H6V11zm0 3h5v1.5H6V14z" />
                </svg>
              </button>
            </div>
          </div>
          <button
            type="submit"
            aria-label="Analyze link"
            className="brand-gradient-bg shrink-0 rounded-xl px-7 py-3.5 font-semibold text-white shadow-[0_8px_20px_rgba(30,99,238,0.35)]"
          >
            Download
          </button>
        </div>

        {duplicateNotice && (
          <p role="status" aria-live="polite" className="mt-2 text-sm text-muted">
            {duplicateNotice}
          </p>
        )}
      </form>

      {hasAnyJobs && (
        <div className="mt-4 space-y-3">
          {hasCompleted && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={clearCompleted}
                className="rounded-lg border border-line px-3 py-1 text-sm font-medium hover:border-accent hover:text-accent"
              >
                Clear completed
              </button>
            </div>
          )}

          {jobs.map((job) => (
            <div key={job.id} className="surface-card animate-rise-in rounded-xl p-4" role="group" aria-label={`${guessPlatformLabel(job.originalUrl)} download`}>
              <div className="flex items-start gap-3">
                {job.thumbnail && (
                  // eslint-disable-next-line @next/next/no-img-element -- external, per-request thumbnails from arbitrary upstream hosts aren't something next/image's fixed domain allowlist can cover generically here.
                  <img
                    src={job.thumbnail}
                    alt=""
                    className="h-14 w-14 shrink-0 rounded-lg object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-muted">{guessPlatformLabel(job.originalUrl)}</p>
                  <p className="truncate text-base font-medium text-ink">
                    {job.title ?? (job.status === "analyzing" ? LOADING_MESSAGES[loadingMessageIndex] : job.originalUrl)}
                  </p>
                  {job.author && <p className="truncate text-sm text-muted">{job.author}</p>}
                </div>
                {(job.status === "ready" || job.status === "failed" || job.status === "cancelled" || job.status === "completed") && (
                  <button
                    type="button"
                    onClick={() => removeJob(job.id)}
                    aria-label="Remove from list"
                    title="Remove"
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-paper hover:text-red-600"
                  >
                    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none" aria-hidden>
                      <path d="M6 6l8 8M14 6l-8 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                    </svg>
                  </button>
                )}
              </div>

              {job.status === "analyzing" && (
                <div role="status" aria-live="polite" className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-paper">
                  <div className="loading-pattern h-full w-full" />
                  <span className="sr-only">{`${guessPlatformLabel(job.originalUrl)} link, analyzing`}</span>
                </div>
              )}

              {job.status === "ready" && job.formats.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {job.formats.map((f) => (
                    <button
                      key={f.token}
                      type="button"
                      onClick={() => handleDownloadClick(job, f)}
                      className="rounded-lg border border-line px-4 py-2 text-sm font-medium hover:border-accent hover:text-accent"
                    >
                      {f.label}
                      {job.selectedFormatToken === f.token && !canStartDownload(jobs, MAX_CONCURRENT_DOWNLOADS) ? " · Waiting…" : ""}
                    </button>
                  ))}
                </div>
              )}

              {job.status === "downloading" && (
                <div className="mt-3">
                  <div
                    role="status"
                    aria-live="polite"
                    aria-label={
                      job.downloadProgress !== null
                        ? `${guessPlatformLabel(job.originalUrl)} download, ${job.downloadProgress} percent complete`
                        : `${guessPlatformLabel(job.originalUrl)} downloading`
                    }
                    className="relative h-2 w-full overflow-hidden rounded-full bg-paper"
                  >
                    <div
                      className="download-progress-fill h-full transition-[width] duration-150"
                      style={{ width: `${job.downloadProgress ?? 15}%` }}
                    />
                  </div>
                  <div className="mt-1.5 flex items-center justify-between text-sm text-muted">
                    <span>{job.downloadProgress !== null ? `${job.downloadProgress}%` : "Downloading…"}</span>
                    <button
                      type="button"
                      onClick={() => handleCancelDownload(job.id)}
                      className="font-medium text-muted hover:text-red-600"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {job.status === "completed" && (
                <div className="mt-3 flex flex-wrap items-center gap-3 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800">
                  <svg className="h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.7 5.3a1 1 0 010 1.4l-8 8a1 1 0 01-1.4 0l-4-4a1 1 0 111.4-1.4L8 12.6l7.3-7.3a1 1 0 011.4 0z" clipRule="evenodd" />
                  </svg>
                  <span>Downloaded — check your device&apos;s Downloads folder.</span>
                  {canShareFiles && (
                    <button type="button" onClick={handleSaveToGallery} className="ml-auto rounded-md border border-green-700/30 px-3 py-1 font-medium text-green-800 hover:bg-green-100">
                      Save to Photos…
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => retryJob(job)}
                    className={canShareFiles ? "font-medium text-green-800 hover:underline" : "ml-auto font-medium text-green-800 hover:underline"}
                  >
                    Download again
                  </button>
                </div>
              )}

              {(job.status === "failed" || job.status === "cancelled") && (
                <div role="status" aria-live="polite" className="mt-3 flex flex-wrap items-center gap-3">
                  <p className="inline-flex items-center gap-1.5 text-sm text-red-600">
                    <svg className="h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm-1-9a1 1 0 112 0v3a1 1 0 11-2 0V9zm1-4a1.25 1.25 0 100 2.5A1.25 1.25 0 0010 5z" clipRule="evenodd" />
                    </svg>
                    {job.error ?? (job.status === "cancelled" ? "Cancelled." : "Something went wrong.")}
                  </p>
                  <button
                    type="button"
                    onClick={() => retryJob(job)}
                    className="rounded-lg border border-line px-3 py-1 text-sm font-medium hover:border-accent hover:text-accent"
                  >
                    Retry
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {history.length > 0 && (
        <details className="mt-4 text-sm text-muted">
          <summary className="cursor-pointer select-none font-medium hover:text-ink">Recent downloads ({history.length})</summary>
          <ul className="mt-2 space-y-1.5">
            {history.map((h, i) => (
              <li key={i} className="flex items-center justify-between gap-2 truncate">
                <span className="truncate">
                  {h.platform} · {h.filename} {h.status !== "completed" && `(${h.status})`}
                </span>
                <span className="shrink-0 text-xs text-muted">{new Date(h.timestamp).toLocaleDateString()}</span>
              </li>
            ))}
          </ul>
          <button type="button" onClick={clearHistory} className="mt-2 rounded-lg border border-line px-3 py-1 text-xs font-medium hover:border-accent hover:text-accent">
            Clear history
          </button>
        </details>
      )}
    </div>
  );
}
