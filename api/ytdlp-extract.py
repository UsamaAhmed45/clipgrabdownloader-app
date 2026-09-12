"""
A minimal Vercel Python Function wrapping yt-dlp directly (as a Python
library, not a subprocess — this is the reliable way to run it in a
serverless function, since spawning a separate binary process has real
packaging problems on Vercel's Node.js runtime; see README "yt-dlp on
Vercel" for the context on why this exists as a separate function at all
rather than living inside the main Next.js app).

This does ONE thing: given a URL, ask yt-dlp for that video's metadata
and format list, return it as JSON. No downloading of the actual video
file happens here — this only extracts *where* the file lives; the
existing Next.js app still handles streaming the file itself, exactly as
it does for every other platform.

Deliberately built on Python's raw http.server interface (the format
Vercel's Python runtime understands natively via a `handler` class) rather
than pulling in Flask or FastAPI, since this function does one narrow job
and a web framework would be unused weight for it.
"""

import json
from http.server import BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs

import yt_dlp


def extract_info(url: str) -> dict:
    ydl_opts = {
        "quiet": True,
        "no_warnings": True,
        "noplaylist": True,
        "nocheckcertificate": True,
        # Skip formats requiring a merge step (video-only + audio-only
        # combined via ffmpeg) — this function only ever returns formats
        # that are already a complete, directly downloadable file,
        # matching what the rest of this project's pipeline expects.
        "format": "best[acodec!=none][vcodec!=none]/best",
    }
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(url, download=False)

    formats = []
    direct_url = info.get("url")
    if direct_url:
        formats.append(
            {
                "formatId": info.get("format_id", "default"),
                "ext": info.get("ext", "mp4"),
                "quality": info.get("format_note") or info.get("resolution") or "default",
                "hasVideo": info.get("vcodec") not in (None, "none"),
                "hasAudio": info.get("acodec") not in (None, "none"),
                "url": direct_url,
            }
        )

    return {
        "title": info.get("title") or "video",
        "thumbnail": info.get("thumbnail"),
        "formats": formats,
    }


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        query = parse_qs(urlparse(self.path).query)
        url = query.get("url", [None])[0]

        if not url:
            self._send_json({"error": "Missing url parameter."}, status=400)
            return

        try:
            result = extract_info(url)
            self._send_json(result, status=200)
        except Exception as err:  # noqa: BLE001 — this boundary must
            # never leak a raw traceback to the client; every failure
            # mode collapses to one clear, safe error shape.
            self._send_json({"error": f"yt-dlp extraction failed: {str(err)[:300]}"}, status=502)

    def _send_json(self, payload: dict, status: int):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)
