import { spawn } from "node:child_process";

export interface YtDlpFormat {
  formatId: string;
  ext: string;
  quality: string;
  hasVideo: boolean;
  hasAudio: boolean;
  filesize?: number;
  url: string;
}

export interface YtDlpResult {
  title: string;
  thumbnail?: string;
  formats: YtDlpFormat[];
}

// Override with the full path to the binary via YTDLP_PATH if it's not on
// the server's PATH (see README "Free built-in extraction (yt-dlp)").
const YTDLP_BIN = process.env.YTDLP_PATH || "yt-dlp";
const TIMEOUT_MS = 25_000;

interface RawFormat {
  format_id?: string;
  ext?: string;
  format_note?: string;
  resolution?: string;
  vcodec?: string;
  acodec?: string;
  filesize?: number;
  filesize_approx?: number;
  url?: string;
}

/**
 * Spawns the yt-dlp binary against a single, already-validated URL and
 * parses its JSON metadata output (`-j`). This shells out to the
 * well-established, actively maintained open-source yt-dlp project rather
 * than reimplementing any platform-specific extraction logic here.
 *
 * The URL is always passed as a discrete argv entry (never interpolated
 * into a shell string), so there's no command-injection surface even
 * though the input ultimately comes from the person using the site.
 */
export function extractWithYtDlp(url: string): Promise<YtDlpResult> {
  return new Promise((resolve, reject) => {
    const args = ["-j", "--no-warnings", "--no-playlist", "--no-check-certificates", url];
    const child = spawn(/* turbopackIgnore: true */ YTDLP_BIN, args, { timeout: TIMEOUT_MS });

    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => (stdout += chunk));
    child.stderr.on("data", (chunk) => (stderr += chunk));

    child.on("error", (err) => {
      const code = (err as NodeJS.ErrnoException).code;
      if (code === "ENOENT") {
        reject(new Error("YTDLP_NOT_INSTALLED"));
      } else {
        reject(err);
      }
    });

    child.on("close", (code) => {
      if (code !== 0 || !stdout.trim()) {
        reject(new Error(stderr.trim() || "yt-dlp exited without output."));
        return;
      }
      try {
        const data = JSON.parse(stdout);
        const rawFormats: RawFormat[] = Array.isArray(data.formats) ? data.formats : [];

        const formats: YtDlpFormat[] = rawFormats
          // Only progressive formats (both video+audio in one file) or
          // audio-only formats — anything video-only would need an ffmpeg
          // mux step this scaffold deliberately doesn't add (see README).
          .filter((f) => f.url && (f.vcodec !== "none" || f.acodec !== "none"))
          .filter((f) => f.acodec && f.acodec !== "none")
          .map((f) => ({
            formatId: f.format_id ?? "unknown",
            ext: f.ext ?? "mp4",
            quality: f.format_note || f.resolution || (f.vcodec === "none" ? "audio" : "video"),
            hasVideo: f.vcodec !== "none" && !!f.vcodec,
            hasAudio: f.acodec !== "none" && !!f.acodec,
            filesize: f.filesize ?? f.filesize_approx,
            url: f.url as string,
          }));

        if (formats.length === 0 && typeof data.url === "string") {
          formats.push({
            formatId: "default",
            ext: data.ext ?? "mp4",
            quality: "default",
            hasVideo: true,
            hasAudio: true,
            url: data.url,
          });
        }

        resolve({
          title: typeof data.title === "string" ? data.title : "video",
          thumbnail: typeof data.thumbnail === "string" ? data.thumbnail : undefined,
          formats,
        });
      } catch {
        reject(new Error("Couldn't parse yt-dlp's output for this link."));
      }
    });
  });
}
