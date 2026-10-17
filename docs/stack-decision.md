# Stack decision

The menu in the brief is not an install list. StoryWeaver has one render pipeline: a checked-in
browser page draws frame(t); Playwright captures; ffmpeg encodes; numpy synthesizes audio. A second
renderer doubles the determinism, font, and delivery surface. Do not add one for a single episode.

| Option | Role here | Decision |
|---|---|---|
| Canvas 2D | pixel/flat/line art, the shared kit | **core** |
| HTML/CSS/SVG | type, layout, UI motion, vector diagrams | **core** (deterministic seek only) |
| WebGL shader | one post pass: grade, grain, vignette, bloom | **core** |
| Three.js | a shot that explicitly declares a 3D layer | **opt-in per shot** |
| p5.js + p5.brush | brush/paper texture experiments | **not a dependency**; implement a seeded Canvas brush if needed |
| Remotion / HyperFrames | React video framework | **not used**; one page + Playwright is the pipeline |
| Manim | math/geometry derivation | **not used**; the shared kit + SVG/Canvas covers it |
| Code + video model hybrid | real people/dance/plate | **not default**; would break the pure-t frame. If ever needed, a licensed, checked-in clip with a deterministic seek layer and a new gate; not installed here |

## Why

- The ep01–epNN contract is `window.render(t)` / `window.seek(t)`: a frame is a pure function of `t`
  and checked-in inputs. A video model is a new source of nondeterminism, licensing, and AI-content
  disclosure; it is not a drop-in layer.
- The kit already covers the useful vocabulary: Canvas 2D, DOM/SVG, GSAP paused timelines, Lucide,
  sparse Lottie, Three.js on demand, one WebGL post pass. New tech must add a measurable quality,
  stability, cost, or production-time gain, and it must pass the render contract.
- Audio is code too: `studio/render/kit/audio/mix.py` uses numpy for the bed and SFX; `beatClock` /
  `cueFrames` align cuts to the beat. The TTS adapter is separate and gated by the fact check.
- Reference-video analysis and beat detection are not in the core. `beat_clock` and `cue_frames`
  already place cues on the episode's audio. A reference analyzer would be a separate, offline tool,
  not a new dependency of the render.

## Options added in this optimization

- `--fps 30|60` (default 30).
- `--motion-blur 1–8`: sub-seeks centred on `t` inside a half-frame shutter, averaged in-page.
  This is a pure `t` effect, not a CSS transition.
- `window.render(t)` and `window.seek(t)` are the documented external frame entry points.
- `qc/director_review.json` + `director-review` CLI: the pre-export scorecard (all axes >= 8).

## Non-negotiables

No CSS transitions/keyframes, timers, `requestAnimationFrame`, or unseeded randomness in the capture
path. No CDN fonts. No one-off HTML renderer. No unverified 3D/character/font/camera promise. No
agent-signed human approval. No publish.
