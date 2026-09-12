import { normalizeSubmittedUrl } from "./urlNormalize";

// The one place this number is defined — every caller (the queue
// component, tests) imports it rather than hardcoding "2" again.
export const MAX_CONCURRENT_DOWNLOADS = 2;
export const MAX_HISTORY_ENTRIES = 50;

export interface JobFormat {
  label: string;
  token: string;
}

export type JobStatus = "analyzing" | "ready" | "downloading" | "completed" | "failed" | "cancelled";

export interface Job {
  id: string;
  originalUrl: string;
  normalizedUrl: string;
  status: JobStatus;
  title: string | null;
  author?: string;
  thumbnail?: string;
  formats: JobFormat[];
  selectedFormatToken: string | null;
  error: string | null;
  createdAt: number;
  completedAt: number | null;
  retryCount: number;
  // Tracks the in-flight download of whichever format is selected —
  // separate from `status`, since a job can be "ready" (analysis done)
  // for a while before the person picks a format and actually starts
  // downloading it.
  downloadProgress: number | null;
}

/**
 * Duplicate detection uses the exact same normalizer as the server
 * (src/lib/urlNormalize.ts has no server-only dependencies — it's pure
 * string/URL manipulation — so it's safe to import directly into client
 * code too) rather than a second reimplementation that could drift from
 * the server's own definition of "the same URL."
 */
export function findDuplicateJob(jobs: Job[], rawUrl: string): Job | undefined {
  const normalized = normalizeSubmittedUrl(rawUrl);
  return jobs.find((j) => j.normalizedUrl === normalized && j.status !== "cancelled" && j.status !== "failed");
}

export function countActiveDownloads(jobs: Job[]): number {
  return jobs.filter((j) => j.status === "downloading").length;
}

export function canStartDownload(jobs: Job[], limit: number = MAX_CONCURRENT_DOWNLOADS): boolean {
  return countActiveDownloads(jobs) < limit;
}

/**
 * Among jobs waiting for a download slot (status "ready" with a format
 * already selected), returns the one that's been waiting longest — FIFO,
 * so a job never gets starved by later ones repeatedly jumping the queue.
 */
export function nextWaitingJob(jobs: Job[]): Job | undefined {
  return jobs
    .filter((j) => j.status === "ready" && j.selectedFormatToken)
    .sort((a, b) => a.createdAt - b.createdAt)[0];
}

export function createJobId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `job-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
