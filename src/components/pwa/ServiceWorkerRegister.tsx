"use client";

import { useEffect } from "react";

export function ServiceWorkerRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Registration failing (unsupported browser, blocked, etc.) just
        // means no offline shell/installability boost — the site still
        // works fully as a normal website either way.
      });
    }
  }, []);

  return null;
}
