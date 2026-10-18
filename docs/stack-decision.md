# Stack decision

The stack menu is not an install list. knowledge-video-studio has one render pipeline. A checked-in
browser page draws frame(t). Playwright captures the frame. ffmpeg encodes the frames. numpy makes
the audio. A second renderer doubles the determinism, font, and delivery surface. Do not add one for
one episode.

| Option | Role | Decision |
|---|---|---|
| Canvas 2D | Pixel, flat, and line art | Core |
| HTML/CSS/SVG | Type, layout, and vector diagrams | Core |
| WebGL shader | One post pass | Core |
| Three.js | A shot that declares a 3D layer | Opt-in for each shot |
| p5.js and p5.brush | Brush and paper texture | Not a dependency |
| Remotion or HyperFrames | React video framework | Not used |
| Manim | Math and geometry | Not used |
| Code and video model | Real people or plates | Not the default |

## Why

- The contract is `window.render(t)` or `window.seek(t)`. A frame is a pure function of `t` and
  checked-in inputs.
- A video model adds a source of nondeterminism, licensing, and AI disclosure. It is not a drop-in
  layer.
- The kit covers the useful vocabulary. Add a new technology only when it gives a measurable gain
  in quality, stability, cost, or production time. The render contract must pass.
- Audio is code. `studio/render/kit/audio/mix.py` uses numpy for the bed and the SFX. `beatClock` and
  `cueFrames` put the cuts on the beat. The TTS adapter is separate and gated by the fact check.
- Reference-video analysis is not in the core. `beat_clock` and `cue_frames` place the cues for the
  episode audio. A reference analyzer is a separate offline tool. It is not a render dependency.

## Options

- `--fps 30|60`. The default is 30.
- `--motion-blur 1-8`. Sub-seeks centre on `t` in a half-frame shutter. The page averages them.
- `window.render(t)` and `window.seek(t)` are the frame entry points.
- `qc/director_review.json` and `director-review` are the pre-export scorecard. Each axis is at
  least 8.

## Non-negotiable rules

- No CSS transition, keyframe, timer, `requestAnimationFrame`, or unseeded random value in the
  capture path.
- No CDN font.
- No one-off HTML renderer.
- No unverified 3D, character, font, or camera promise.
- No agent-signed human approval.
- No publish.
