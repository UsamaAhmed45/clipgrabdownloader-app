"use client";

import { useEffect, useState } from "react";

export function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const stored = window.localStorage.getItem("theme");
    const preferred = stored === "dark" || stored === "light"
      ? stored
      : window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
    setTheme(preferred);
    document.documentElement.setAttribute("data-theme", preferred);
  }, []);

  function toggle() {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    window.localStorage.setItem("theme", next);
  }

  const checked = theme === "dark";

  return (
    <label
      className="theme-switch"
      aria-label={`Switch to ${checked ? "light" : "dark"} mode`}
      title={`Switch to ${checked ? "light" : "dark"} mode`}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={toggle}
        aria-hidden="true"
      />
      <span className="theme-switch-track">
        <span className="theme-switch-icon theme-switch-icon-sun" aria-hidden>
          <svg viewBox="0 0 20 20" fill="currentColor">
            <path d="M10 3a1 1 0 011 1v1a1 1 0 11-2 0V4a1 1 0 011-1zm0 12a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zm7-5a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM5 10a1 1 0 01-1 1H3a1 1 0 110-2h1a1 1 0 011 1zm9.9-4.9a1 1 0 010 1.41l-.7.7a1 1 0 11-1.42-1.41l.71-.71a1 1 0 011.41 0zM6.51 13.8a1 1 0 010 1.41l-.7.7a1 1 0 11-1.42-1.41l.71-.7a1 1 0 011.41 0zm8.9 1.41a1 1 0 01-1.41 0l-.71-.7a1 1 0 111.42-1.42l.7.71a1 1 0 010 1.41zM6.51 6.2a1 1 0 01-1.41 0l-.71-.7A1 1 0 115.8 4.09l.7.71a1 1 0 010 1.41zM10 6a4 4 0 100 8 4 4 0 000-8z" />
          </svg>
        </span>
        <span className="theme-switch-icon theme-switch-icon-moon" aria-hidden>
          <svg viewBox="0 0 20 20" fill="currentColor">
            <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
          </svg>
        </span>
        <span className="theme-switch-thumb" />
      </span>
    </label>
  );
}
