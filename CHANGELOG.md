# Changelog

## 0.9.0 — 2026-10-10

DOM stage for kinetic type. The capture clock is still the pipeline’s `t`.

### Added

- GSAP as a dependency. Timelines are created with `paused: true`. Frames call `timeline.seek(t)` or `totalProgress`. `installCaptureClock` removes GSAP’s ticker listener and sleeps it. Pattern: `studio/render/browser/dom/README.md`.
- React primitives `useFrame()`, `useCurrentFrame()`, `Sequence`, and `AbsoluteFill` in `studio/render/browser/dom/frame.jsx`. They read the pipeline `t`. Remotion is not installed.
- Lucide icons and one Lottie flourish (`goToAndStop`, SVG renderer, player frozen). Three.js stays unloaded in this shot.
- `docs/demo/title-card/`, a 10 second tool fixture. `doctor --episode docs/demo/title-card --require-render` and `render … --mode draft --cut preview` run it. It is not a series and cannot be a release.

### Notes

Remotion, Motion, and Rive are inspirations, not dependencies. Do not install them.

## 0.8.0 — 2026-10-10

The repository holds the tool and the method. Series workspaces live outside it.

### Added

- `init-series <dir>` creates a series directory anywhere except inside this repository. `init-episode` refuses the same boundary.
- `tests/fixtures/sample-series/ep01`, a fictional episode for CI: four lines, one shot, a placeholder rig, an approved brief, and checklist names that exist only so the checks can run.

### Removed

- `examples/invisible-rules/` (episodes, scripts, fact cards, character sheets, voice notes, and retrospectives). Git history is the archive.
- The one-series metrics exception. A blank metrics sheet blocks the next episode for every series.

### Migration

Create the series with `node studio/cli.mjs init-series <dir>` outside this checkout, then `init-episode <series-dir> epNN`. Do not commit episode files back into the tool repository. The CI fixture is not a template.

## 0.7.0 — 2026-10-10

One browser render pipeline, and a recoverable path from a cloud agent to the machine that holds keys.

### Added

- Browser pipeline: Playwright captures `seek(t)` frames and ffmpeg encodes them. A shot stacks Canvas 2D, SVG/DOM, and Three.js. Every frame runs a WebGL post pass (`neutral`, `explainer`, `night`).
- Draft and release modes. Draft frames are labeled `Not human-reviewed`. Release requires `qc/release.json` signed by a person. Agent names are rejected.
- Shot thumbnails and a contact sheet before the full encode.
- `handoff.json`, `state/<stage>.done.json`, and `studio resume`.
- `git-sync` as its own retryable step.
- Duration prediction from the first three recorded hook lines.
- A phone listen pack of at most 30 seconds (`listen-pack`).
- `cost` on `render_report.json`: TTS characters, list price at 3 CNY per 10,000 characters, render count, rework ratio. `model_calls` stays null until a usage log exists.
- Model-budget fields on the brief. Checkpoint and resume stop at 70% when `state/model_usage.json` records it.
- Doctor checks required before render: font weights 400/500/900, Chromium, an ffmpeg loudnorm self-test, env key presence (never the value), and scene expressions and gestures against the character rig.

### Removed

- Manim, Remotion, and HyperFrames adapter notes.
- Azure Speech and ElevenLabs TTS adapters.

### Migration

`scenes.json` is unchanged when a shot has no `stack`: it is one Canvas 2D layer. Render output now lives in `out/<draft|release>/<preview|hook|full>/`. TTS providers are `dry-run` and `doubao`. Both language packs remain. The episode language selects the pack.

## 0.6.0 — 2026-10-10

Professionalization of StoryWeaver as a general, portable toolkit.

### Added

- Root playbook `skills/produce-video/SKILL.md` and an English `AGENTS.md` that any coding agent can follow.
- Creative brief (replaces “Phase A”), with a required viewer-intuition table.
- Per-language voice-over lint packs (`studio/lint/packs/en.json`, `zh.json`).
- Speech-rate command `node studio/cli.mjs pace` and a pause-after-key-number rule.
- Claim-precision check (average / individual / fairness / tail-risk / proportion).
- First-watch comprehension item; agents cannot sign human checks.
- `doctor` command and `.env.example` (presence only; no secrets).
- TTS provider interface for Doubao, Azure Speech, and ElevenLabs.
- Worked examples moved to `examples/invisible-rules/`.

### Removed

Git history remains the archive. Deleted from the tree:

- Legacy SVG physics compiler (`src/`, VideoSpec schemas, `@resvg/resvg-js`, `text2wav`).
- Experiments: T01 English colors, hot-air balloon fixture, method-proof, production-01.
- Vercel leftovers and the parked GitHub Pages workflow / static-site builder.
- Stale product docs (`docs/00`–`12`, competitive landscape, Opus-5.5 case notes).
- Dead tests that only covered the SVG path and T01.

### Renamed

- “Gate / 闸门” as branding → approval **checkpoint**.
- “Phase A” → **creative brief** (`brief.md`).
- Series working copy `series/invisible-rules/` → `examples/invisible-rules/`.

### Notes

Spoken Chinese in the Invisible Rules examples is kept. Structural docs, templates, CLI messages, and comments are English.
