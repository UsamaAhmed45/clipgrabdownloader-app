# Design plan

Subject: a utility people reach for mid-scroll — they hit a video worth
keeping, drop into this tool for fifteen seconds, and leave. Not a brand
they browse. The design should feel like a fast, well-made tool, not a
SaaS marketing site: closer to a well-built system utility than a startup
landing page.

## Color
- `--ink: #12141A` — near-black text, not pure #000/#111
- `--paper: #F7F6F3` — warm-white background (not stark white, not the
  generic cream-#F4F1EA default — sits a step cooler/greyer)
- `--paper-raised: #FFFFFF` — card/input surfaces on top of paper
- `--line: #E4E2DC` — hairline borders/dividers
- `--accent: #2653D8` — a confident cobalt blue, used ONLY for the primary
  action and active/focus states — not decoration
- `--accent-ink: #0F2E8C` — accent text/hover
- `--muted: #6B6A64` — secondary text

Platform brand colors (from platforms.ts) are used sparingly as a 3px
left-border accent on that platform's own page hero only — never as a
full background wash, and never implying official platform branding.

## Type
- Display/headlines: "Fraunces" (serif, has real personality without being
  a "premium SaaS" default) at tight tracking, used only for H1s.
- Body/UI: "Inter" for everything else — labels, nav, body copy, buttons.
  Two clearly distinct families, one job each.
- No tracked-out uppercase eyebrows, no middle-dot meta strings.

## Layout
- Left-aligned, not centered-hero. A tool doesn't need a centered
  billboard moment.
- Homepage hero: headline + the actual download input, side by side on
  desktop (input IS the hero, not a demo screenshot of it), stacked on
  mobile.

  [ Download Videos.  ] [ paste a link___________ ] [Download]
  [ Simply.            ] supported: IG · TikTok · YouTube · FB · X...

- Platform pages follow one consistent template (intro → how-to steps →
  supported formats → troubleshooting → FAQ → related platforms) so the
  structure is predictable but the copy is never templated find/replace.
- No identical rounded SaaS cards everywhere: the how-to steps use a plain
  numbered list (legitimate here — it IS a sequence), format/
  troubleshooting/FAQ use flat dividers instead of card grids.

## Principles
- One accent color, used with intent (primary actions + focus rings only).
- No gradients, no soft box-shadow card kit, no decorative badges.
- Motion: a single subtle state transition on the download button
  (idle → loading → result) and nothing else animates on load.
- Every page keeps the same header/footer chrome; visual variety comes
  from typography and content, not new UI kits per page.
