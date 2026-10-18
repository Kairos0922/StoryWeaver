# CLAUDE.md — knowledge-video-studio

Read `AGENTS.md` and `docs/render-contract.md` first. They are binding. This file is the Claude
entry point. It does not replace them.

## The loop

A model does not make video pixels. The model writes code. The code draws each frame at one time.
Playwright seeks `t` and captures a PNG. ffmpeg encodes the frames. Python and numpy make the audio.
The same inputs make the same bytes.

## Render API

- `window.render(t)` draws the frame at `t` and returns a PNG. `window.seek(t)` is an alias.
- Do not use a wall clock, `requestAnimationFrame`, a timer, a CSS transition, a CSS animation, or
  unseeded `Math.random` in the capture path.
- The default frame rate is 30 fps. Use `--fps 60` for a higher rate.
- `--motion-blur 1-8` averages pure sub-seeks in a half-frame shutter. It is not a CSS effect.
  It does not change the frame time.
- Stills, shot thumbnails, and a contact sheet come before the full encode. A two-pass hash check
  proves determinism.
- Use one browser pipeline. Do not add a second renderer or a video-model dependency.

## Stack

The core uses Canvas 2D, DOM/SVG, paused GSAP timelines, Lucide icons, sparse Lottie, and one
WebGL post pass. Use Three.js only when a shot declares a 3D layer.

`docs/stack-decision.md` gives the full decision. Do not install Remotion, p5, Manim, or a video
model for the core pipeline.

## Prompt and direction

Fill `studio/templates/prompt.xml` or the brief. Use the XML sections `<role> <inputs> <direction>
<structure> <build> <gotchas> <start>`. Read
`skills/produce-video/references/prompt-framework.md`.

Reject these defaults:

- A dark background with centered text.
- A fade-in for each element.
- A bounce easing.
- Decorative particles or glow.
- A uniform linear move.
- An inline easing or duration number.
- An all-caps English micro-label.

Use one accent color. Use one focus for each screen. Add a new visual every 2 to 4 seconds.

## Director review

Before a full render, capture stills and keyframes. Score `qc/director_review.json` with the rubric
in `docs/director-review.md`. Fix each score below 8. An AI can draft the scorecard. A person must
review the frames and sign it. Run `node studio/cli.mjs director-review <episode-dir>` to check it.

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
node studio/cli.mjs docs-lint
node studio/cli.mjs render-contract
node studio/cli.mjs layout
```

## Hard stops

The hard stops in `AGENTS.md` apply. In particular:

- Do not approve a brief.
- Do not sign a release.
- Do not fill a human approval.
- Do not call paid TTS without keys.
- Do not publish.
- Do not invent metrics.
- Do not promise a capability that `doctor` has not verified.

Keep series directories outside this repository. Do not add production renders or character sheets
to this repository.
