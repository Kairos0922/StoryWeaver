# CLAUDE.md — StoryWeaver

Read `AGENTS.md` and `docs/render-contract.md` first. They are binding; this file is the Claude entry point and does not replace them.

## The loop

A model does not generate pixels. It writes checked-in code that draws every frame as a pure function of time. Playwright seeks `t`, captures a PNG; ffmpeg encodes the frames; Python/numpy synthesizes the bed and SFX; the same inputs produce the same bytes.

## Render API

- `window.render(t)` draws and returns the frame at `t` (PNG base64). `window.seek(t)` is an alias.
- No wall clock, `requestAnimationFrame`, timers, CSS transitions/animations, or unseeded `Math.random` in the capture path.
- 30 fps by default. `--fps 60` is supported. `--motion-blur 1–8` averages pure sub-seeks inside a half-frame shutter; it is not a CSS effect and never moves the frame's `t`.
- Stills, shot thumbnails, and a contact sheet come before the full encode. Determinism is a two-pass, fresh-context PNG hash check.
- One browser pipeline. Do not add a one-off HTML renderer, a second compositor, or a video-model dependency.

## Stack

Canvas 2D, DOM/SVG, GSAP timelines created `paused: true`, Lucide icons, sparse Lottie (`goToAndStop`), Three.js only when a shot declares it, one WebGL post pass. `docs/stack-decision.md` maps the wider stack menu to this choice. Do not install Remotion, p5, Manim, or a video model for the core pipeline.

## Prompt and direction

Fill `studio/templates/prompt.xml` (or the brief) with the XML sections `<role> <inputs> <direction> <structure> <build> <gotchas> <start>`. Read `skills/produce-video/references/prompt-framework.md`.

Direction defaults to reject: dark background with centered big text, default fade-in/out, bounce easing, decorative particles/glow, uniform linear motion, every element appearing at once, inline easing/duration numbers, and all-caps English micro-labels. One accent, one focus per screen, a new visual every 2–4 seconds.

## Director review

Before a full render, capture stills/keyframes, score `qc/director_review.json` on the rubric in `docs/director-review.md`, and fix anything below 8. An AI may draft the scorecard; a person reviews the frames and signs it. `node studio/cli.mjs director-review <episode-dir>` validates it.

## Commands

```bash
node studio/cli.mjs doctor
node studio/cli.mjs init-series <dir>
node studio/cli.mjs init-episode <series-dir> epNN
node studio/cli.mjs checkpoint <episode-dir> brief
node studio/cli.mjs stills <episode-dir>
node studio/cli.mjs director-review <episode-dir>
node studio/cli.mjs render <episode-dir> --mode draft --cut preview --fps 30
node studio/cli.mjs render <episode-dir> --mode draft --cut preview --fps 60 --motion-blur 3
node studio/cli.mjs render-contract
node studio/cli.mjs layout
```

## Hard stops

The hard stops in `AGENTS.md` apply. In particular: never approve a brief or sign a release, never fill human approvals, never call paid TTS without keys, never publish, never invent metrics, never add a capability the doctor has not verified. Series directories live outside this repository; do not add production renders or character sheets here.
