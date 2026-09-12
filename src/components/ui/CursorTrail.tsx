"use client";

import { useEffect, useRef } from "react";

interface TrailPoint {
  x: number;
  y: number;
  age: number;
}

/**
 * A subtle glowing cursor trail in brand colors. Deliberately scaled down
 * from a full multi-mode particle system (constellation/ribbon/comet/
 * bubbles with intensity dials) — this is a utility site people want to
 * use quickly, not a showcase piece, so the effect stays light: one soft
 * trailing glow, no configuration surface, and it disables itself
 * automatically wherever it would cost more than it's worth:
 * - touch-only devices (no real cursor to trail)
 * - prefers-reduced-motion
 * - the canvas is pointer-events: none, so it can never intercept a click
 *
 * Theme-aware on purpose: this used to render with mix-blend-mode:
 * "screen", which lightens whatever's underneath — that reads as a nice
 * glow against the dark theme's near-black background, but against the
 * light theme's pale "paper" background, screen-blending an
 * already-light color into a light background produces almost no
 * visible contrast, which is why it looked like the trail had vanished
 * in light mode. Fixed by dropping the blend mode entirely and using
 * theme-appropriate colors/opacity instead — a deeper, more saturated
 * blue for light mode, the lighter cyan glow for dark mode.
 */
export function CursorTrail() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const hasFinePointer = window.matchMedia("(pointer: fine)").matches;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!hasFinePointer || reducedMotion) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let w = window.innerWidth;
    let h = window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    function resize() {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas!.width = Math.floor(w * dpr);
      canvas!.height = Math.floor(h * dpr);
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    window.addEventListener("resize", resize);

    // Track the active theme live — the toggle switches data-theme
    // without a page reload, so the trail's colors need to follow along
    // rather than being fixed at mount time.
    let isDark = document.documentElement.getAttribute("data-theme") === "dark";
    const themeObserver = new MutationObserver(() => {
      isDark = document.documentElement.getAttribute("data-theme") === "dark";
    });
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

    let points: TrailPoint[] = [];
    let mouseX = w / 2;
    let mouseY = h / 2;
    let active = false;
    const LIFE = 0.5; // seconds

    function isOverHeader(clientY: number): boolean {
      const header = document.querySelector("header");
      if (!header) return false;
      return clientY <= header.getBoundingClientRect().bottom;
    }

    function onMove(e: PointerEvent) {
      if (e.pointerType !== "mouse") return;
      mouseX = e.clientX;
      mouseY = e.clientY;
      // The header carries the logo and site name — a decorative glow
      // has no business anywhere near the actual branding, so the trail
      // simply stops emitting points while the cursor is over it. Any
      // trail points already in flight from just before entering the
      // header still fade out normally rather than vanishing abruptly.
      if (isOverHeader(mouseY)) {
        active = false;
        return;
      }
      active = true;
      points.push({ x: mouseX, y: mouseY, age: 0 });
      if (points.length > 24) points.shift();
    }
    function onLeave() {
      active = false;
    }
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerleave", onLeave);

    let raf = 0;
    let last = performance.now();

    function frame(now: number) {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      ctx!.clearRect(0, 0, w, h);

      // Dark mode: a light cyan-to-blue glow, visible against a near-black
      // background. Light mode: a deeper, more saturated blue at higher
      // opacity — a pale glow would just disappear against the light
      // "paper" background.
      const core = isDark ? "255, 255, 255" : "15, 58, 184";
      const mid = isDark ? "47, 207, 255" : "30, 99, 238";
      const outer = isDark ? "30, 99, 238" : "15, 58, 184";
      const trailAlphaScale = isDark ? 0.35 : 0.5;
      const coreAlpha = isDark ? 0.5 : 0.4;

      for (const p of points) p.age += dt;
      points = points.filter((p) => p.age < LIFE);

      for (let i = 0; i < points.length; i++) {
        const p = points[i];
        const t = p.age / LIFE;
        const alpha = (1 - t) * trailAlphaScale;
        const radius = 6 * (1 - t) + 1;
        if (alpha <= 0.01) continue;
        const gradient = ctx!.createRadialGradient(p.x, p.y, 0, p.x, p.y, radius * 2.5);
        gradient.addColorStop(0, `rgba(${mid}, ${alpha})`);
        gradient.addColorStop(0.6, `rgba(${outer}, ${alpha * 0.6})`);
        gradient.addColorStop(1, `rgba(${outer}, 0)`);
        ctx!.beginPath();
        ctx!.arc(p.x, p.y, radius * 2.5, 0, Math.PI * 2);
        ctx!.fillStyle = gradient;
        ctx!.fill();
      }

      if (active) {
        const glow = ctx!.createRadialGradient(mouseX, mouseY, 0, mouseX, mouseY, 14);
        glow.addColorStop(0, `rgba(${core}, ${coreAlpha})`);
        glow.addColorStop(0.4, `rgba(${mid}, ${coreAlpha * 0.7})`);
        glow.addColorStop(1, `rgba(${outer}, 0)`);
        ctx!.beginPath();
        ctx!.arc(mouseX, mouseY, 14, 0, Math.PI * 2);
        ctx!.fillStyle = glow;
        ctx!.fill();
      }

      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerleave", onLeave);
      themeObserver.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: 0,
        width: "100vw",
        height: "100vh",
        pointerEvents: "none",
        zIndex: 60,
      }}
    />
  );
}
