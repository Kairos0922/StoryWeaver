# XML prompt control

Use `studio/templates/prompt.xml` when you plan an episode or a shot. It is a control surface, not
decoration. The tags map to files a machine can check; the prose is the direction.

| Tag | What goes in it | Where it lands |
|---|---|---|
| `<role>` | code-driven motion designer, not a video model | system/skill preamble |
| `<inputs>` | topic, audience, format, fps, duration, style, palette, fonts, audio | `brief.md` front matter, `series-style.json`, `lines.json` |
| `<direction>` | visual law, banned list, tone | brief `## Approach` / `## Visual style`; `docs/visual-rhythm.md` |
| `<structure>` | shot table with windows, composition, motion, beat, transition | `brief.md` `## Storyboard`; `render/scenes.json` |
| `<build>` | `window.render(t)`, Playwright, ffmpeg, stills, determinism, options | `docs/render-contract.md`; render commands |
| `<gotchas>` | fonts, overlap, loop, beat gaps, no inline easing, no unverified capability | preflight/review |
| `<start>` | stills/keyframes first, director score >=8, then full | human checkpoints |

## The reverse constraints matter more than the positive style

A model left alone regresses to dark background, centered big text, default fade, bounce easing,
decorative particles, and a new element on every word. The `<direction>` banned list exists to stop
that regression. Keep it in every prompt.

## How it maps to the pipeline

- `window.render(t)` / `window.seek(t)` draws one frame and returns a PNG. Every frame is a pure
  function of `t` and checked-in inputs.
- One browser page, one Playwright seek/capture loop, one ffmpeg encode. No second renderer, no
  one-off HTML page, no video-model dependency for the core picture.
- `--fps 30|60`; `--motion-blur 1–8` averages pure sub-seeks inside a half-frame shutter. It is
  still a function of `t`; it is not a CSS transition.
- Stills, shot thumbnails, and a contact sheet come first. Then `qc/director_review.json` (rubric in
  `docs/director-review.md`) must score every axis at least 8. An AI may draft it; a person signs it.
- Only `deliver` makes a publish package. Human approvals are never signed by an agent.

## Stack choice

`docs/stack-decision.md` maps the wider menu (Canvas 2D, DOM/SVG, WebGL, Three.js, p5, Remotion,
Manim, video-model hybrid) to this project's one pipeline. The short version: Canvas 2D + DOM/SVG +
GSAP paused timelines + one WebGL post pass, with Three.js only when a shot declares it. Remotion,
p5, Manim, and a video model are not dependencies of the core pipeline.

## A useful self-check

1. Does the first 2 seconds show a phenomenon or a question, not a production slate?
2. Does every 2–4 second window add a new visual or a meaningful change?
3. Can a phone viewer read the largest and smallest text without pausing?
4. Do the last frame and the first frame survive a loop check?
5. Does the director scorecard have every axis >=8, with a human signature?
