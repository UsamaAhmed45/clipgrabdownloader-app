/**
 * The Android app (see /android-app in the project root) appends
 * "ClipGrabAndroidApp/1.0" to its WebView's User-Agent string specifically
 * so the site can detect it — see MainActivity.kt's UA_SUFFIX constant.
 *
 * Why this matters: in a normal browser, downloads go through
 * fetch()+Blob() so we can show a progress bar and a "Save to Photos"
 * share option (see DownloadForm.tsx). But a JS-created blob download
 * never fires Android's WebView.setDownloadListener — that only fires for
 * a genuine HTTP navigation with a Content-Disposition header. So inside
 * the Android app specifically, downloads use a plain navigation instead,
 * and the native app takes over from there with its own DownloadManager
 * (which is what actually gets the file into Downloads/Gallery).
 */
export function isInsideAndroidApp(): boolean {
  if (typeof navigator === "undefined") return false;
  return navigator.userAgent.includes("ClipGrabAndroidApp");
}
