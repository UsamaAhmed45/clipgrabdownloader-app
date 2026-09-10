"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { siteConfig } from "@/config/site";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const STORAGE_KEY = "clipgrab-install-prompt-seen";

const benefits = [
  "Opens instantly from your home screen",
  "Feels like a real app — no browser bar",
  "Same fast downloader, no app store needed",
];

export function InstallPrompt() {
  const [deferredEvent, setDeferredEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [variant, setVariant] = useState<"android" | "ios" | null>(null);

  useEffect(() => {
    const alreadySeen = window.localStorage.getItem(STORAGE_KEY);
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true;

    if (alreadySeen || isStandalone) return;

    const isIos = /iphone|ipad|ipod/i.test(window.navigator.userAgent);

    function handleBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      setDeferredEvent(event as BeforeInstallPromptEvent);
      setVariant("android");
      const timer = setTimeout(() => setVisible(true), 2000);
      return () => clearTimeout(timer);
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // iOS Safari never fires beforeinstallprompt — show manual
    // instructions instead, on the same "new user, once" basis.
    let iosTimer: ReturnType<typeof setTimeout> | undefined;
    if (isIos) {
      iosTimer = setTimeout(() => {
        setVariant("ios");
        setVisible(true);
      }, 2000);
    }

    function handleInstalled() {
      window.localStorage.setItem(STORAGE_KEY, "installed");
      setVisible(false);
    }
    window.addEventListener("appinstalled", handleInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleInstalled);
      if (iosTimer) clearTimeout(iosTimer);
    };
  }, []);

  function dismiss() {
    window.localStorage.setItem(STORAGE_KEY, "dismissed");
    setVisible(false);
  }

  async function handleInstallClick() {
    if (!deferredEvent) return;
    await deferredEvent.prompt();
    await deferredEvent.userChoice;
    window.localStorage.setItem(STORAGE_KEY, "prompted");
    setVisible(false);
  }

  if (!visible || !variant) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-4 sm:px-6">
      <div className="animate-rise-in surface-card w-full max-w-md rounded-2xl p-5">
        <div className="flex items-start gap-3">
          <Image
            src="/logo/logo-icon-gradient.svg"
            alt=""
            width={44}
            height={44}
            className="h-11 w-11 shrink-0"
          />
          <div className="min-w-0 flex-1">
            <p className="text-base font-semibold">Install {siteConfig.name}</p>
            <p className="mt-0.5 text-sm text-muted">Add it to your home screen for the full app feel.</p>
          </div>
          <button
            type="button"
            onClick={dismiss}
            aria-label="Dismiss"
            className="shrink-0 rounded-md p-1 text-muted hover:bg-paper hover:text-ink"
          >
            <svg viewBox="0 0 20 20" className="h-5 w-5" fill="currentColor" aria-hidden>
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        <ul className="mt-4 space-y-1.5">
          {benefits.map((b) => (
            <li key={b} className="flex items-center gap-2 text-sm text-ink/80">
              <svg className="h-4 w-4 shrink-0 text-accent" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M16.7 5.3a1 1 0 010 1.4l-8 8a1 1 0 01-1.4 0l-4-4a1 1 0 111.4-1.4L8 12.6l7.3-7.3a1 1 0 011.4 0z" clipRule="evenodd" />
              </svg>
              {b}
            </li>
          ))}
        </ul>

        {variant === "android" ? (
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={handleInstallClick}
              className="brand-gradient-bg flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold text-white"
            >
              Install
            </button>
            <button
              type="button"
              onClick={dismiss}
              className="rounded-xl border border-line px-4 py-2.5 text-sm font-medium hover:border-accent hover:text-accent"
            >
              Not now
            </button>
          </div>
        ) : (
          <div className="mt-4 rounded-lg bg-paper px-3 py-2.5 text-sm text-ink/80">
            Tap the Share icon <span aria-hidden>⬆️</span> in Safari, then{" "}
            <span className="font-medium">&quot;Add to Home Screen&quot;</span>.
          </div>
        )}
      </div>
    </div>
  );
}
