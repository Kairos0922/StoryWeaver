# HTML Canvas adapter

Status: wired. Entry points live in `studio/render/kit/canvas/README.md`.

Rules:

- Drawing code lives in `studio/render/kit/canvas/kit.js`. An episode only writes parameters: stills in `render/stills.json`, the cut in `render/scenes.json`.
- Time is a line cue (`L05`, `L05.end`, `L05@0.5`), not a hard-coded second. WAV duration drives the clock.
- Playwright Chromium calls `window.__frame(t)`. The frame function depends on inputs and `t` only. No CSS transitions, no `setTimeout`, no `requestAnimationFrame` in render mode, no `Math.random`.
- Fonts are subset and embedded as data URLs. A missing glyph fails the job.
- Characters come from the series rig, not from a one-off drawing in the episode folder.

A second full `index.html` timeline in an episode folder means the kit was skipped.
