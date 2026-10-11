# Changelog

## 0.16.0 — 2026-10-11

Technique registry: methods are opt-in and used only where they fit. Replaces the 0.15.0 mandatory concept-machine rule.

### Added

- `studio/techniques/<id>.json` (schema `storyweaver.technique.v1`: `fits`, `avoid`, `brief_section`, `checks`) and `studio/techniques.mjs`. Registered: `concept-machine`, `guess-before-reveal`, `try-it-at-home`. `docs/techniques.md`.
- Required brief section `## Approach`: technique ids or `none`, plus one sentence why. Only selected techniques' checks run (`checkpoint … brief`, QC item `techniques`, `quality` as `technique:<id>`).

### Changed

- `concept-machine` is a technique, no longer a required heading or a gate on every episode.
- `children-education` profile keeps only the universal `profile_no_anxiety` gate and lists `suggested_techniques`. Guess-before-reveal and try-it-at-home moved to techniques because they do not fit every topic.
- `docs/style-lock.md` is now style lock only.

### Removed

- QC item `concept_machine`, `checkConceptModel`, `validateConceptMachine` in `brief.mjs`, profile checks `profile_guess_before_reveal`, `profile_guess_order`, `profile_try_it_at_home`.

### Migration

- Add `## Approach` to every brief (re-approval needed: body hash changes). Briefs that keep `## Concept machine` list `concept-machine`; others may delete that section and write `none` or another technique.
- Children's episodes that relied on the profile for guess/try-it now list those techniques in `## Approach` when they fit.

## 0.15.0 — 2026-10-11

Phase A hard rule "concept machine" and a generic series style lock.

### Added

- Brief section `## Concept machine` (Machine, Motion, Lit subject, Model) in `studio/templates/brief.md`. `validateBrief` requires it; the motion must state its meaning, the lit subject must be one thing, and the model must cite `fact_card.md B#` or a `sim/` file that exists. QC item `concept_machine`.
- `studio/style/style_lock.mjs` and `docs/style-lock.md`: schema `storyweaver.series_style.v1` for `series-style.json` in the series directory (never in this repo). Pins palette, fonts, characters (with human approval), camera language, line/shading treatment, and a motion subset. `node studio/cli.mjs style <episode-dir>`; QC item `style_lock`; `checkpoint … brief` also fails on deviation or a brief that sets a locked key.
- Fictional fixture lock `tests/fixtures/sample-series/series-style.json`; `tests/style_lock.test.js`.

### Migration

- Existing briefs need a `## Concept machine` section; the body hash changes, so re-approval is required.
- A series without `series-style.json` stays unlocked and passes the style check.

## 0.14.1 — 2026-10-11

CI runs `render-contract` as its own step; install brotli explicitly.

### Changed

- `.github/workflows/ci.yml`: add `npm run render-contract`; apt installs `python3-brotli`.
- Drop the `npm test` stand-in that only existed because the workflow could not be edited (`tests/motion_lab.test.js` repository-wide contract check). Unit coverage of the lint rules stays.

## 0.14.0 — 2026-10-11

Optional per-episode fonts, WOFF2 subsets, and a missing-glyph gate for every face. Noto Sans CJK SC stays the default.

### Added

- `studio/render/kit/fonts/library.mjs`: resolves fonts from an external OFL library (`SW_FONT_LIBRARY`, default `~/.cache/storyweaver/fonts/qiaomu-cover-fonts`, layout compatible with joeseesun/qiaomu-cover-fonts). Checks presence, OFL license, sha256, and Reserved Font Names (reserved-name fonts are embedded whole, never subset). Font files are not vendored.
- Brief front matter `font_display` (weights 700/900) and `font_body` (400/500). Blank keeps Noto.
- `studio/render/kit/fonts/glyphs.py` and `episodeGlyphCheck`: every on-screen character (lines + scene text + HUD) against every used face. New doctor check `glyph-coverage` (blocks render) and quality gate `glyph_coverage`.
- Doctor checks `woff2-tools` (fontTools + brotli) and reports `font-library` with the fetch command.
- `studio/render/kit/fonts/README.md`; `tests/fonts.test.js` with a fictional generated font library.

### Changed

- `subset_fonts.py` builds subsets with `pyftsubset` and writes WOFF2 (was OTF). `render_report.json` fonts gain `library_id`, `license`, `license_file`, `subset`, `bytes`.
- WOFF2 needs Python brotli (on Ubuntu it comes with `python3-fonttools` as a recommended package).

### Migration

- Install brotli for Python (`apt install python3-brotli`). Existing briefs need no change.

## 0.13.0 — 2026-10-11

Release quality standard v1.1. Machine gates unchanged.

### Added

- Fourth human review question `whole_piece`: does the cut work as one whole piece, with nothing that looks good but does not fit the content.
- Reviewer guidance for each of the four questions, an explicit note that there are no fixed weights yet (children's education: content and comprehension > visual craft > novelty), and the reasons web-only criteria are excluded.

### Changed

- `quality` and release sign-off require `quality_review.whole_piece` from a person (same agent-name rejection). Templates updated.

### Migration

- Add `whole_piece` to existing `qc/release.json` files (copy from `studio/templates/release.json`).

## 0.12.0 — 2026-10-11

Deterministic re-render is a real, built-in check.

### Added

- `studio/render/browser/determinism.mjs`: every episode render re-renders a seeded sample (first, last, scene starts, 4 seeded picks) twice in fresh browser contexts at full resolution and writes `qc/determinism.json` with per-frame sha256 hashes and input hashes. `render_report.json` gains `determinism`.

### Changed

- `quality` gate `deterministic` now requires both a clean `render-contract` lint and a pipeline-written, non-stale, all-matching `qc/determinism.json`. Missing fails.

### Removed

- Hand-supplied `qc/determinism.json` (`first`/`second` hash arrays). Such files are rejected.

### Migration

- Re-render each episode (a `--review-only` draft is enough) before running `quality`.

## 0.11.0 — 2026-10-11

Release quality standard v1.

### Added

- `docs/quality-standard.md` (v1): blocking machine gates and three human-only review questions.
- `node studio/cli.mjs quality <episode-dir>`: one pass/fail report over existing checks (`qc` pace, script lint, fact card, claim precision; `render-contract`; `motion-qc` from `qc/motion.json`; brief `## Banned motion`). Exit 3 = machine gates pass, human review pending.
- Motion spec `shots`: exactly one `hero` move per shot; `BANNED_KINDS` plus spec `banned`.
- Optional audience profiles in `studio/profiles/` selected by brief `audience_profile`; first profile `children-education` (no-anxiety phrases, guess before reveal, try it at home).
- `qc/release.json` `quality_review` with three person-only answers; agent-looking names are rejected.

### Migration

- Existing episodes: add `quality_review` to `qc/release.json` (copy from `studio/templates/release.json`) and write `qc/motion.json` from the draft.

## 0.10.1 — 2026-10-11

Calibrate Chinese on-screen text hold from narration pace.

### Changed

- Chinese text-hold threshold is `0.27 s/char + 0.5 s`, derived from `pace.comfortable_per_s` (3.7) in `studio/lint/packs/zh.json` — the same source as the comfortable narration pace, calibrated against an approved episode. The provisional flag is removed.
- `docs/motion-tokens.md`, `skills/produce-video/SKILL.md`, and motion-lab tests updated to match.


## 0.10.0 — 2026-10-11

Render contract, motion tokens, and motion QC.

### Added

- `docs/render-contract.md` and `node studio/cli.mjs render-contract` (CI via `npm test`): no wall clock, frame callbacks, timers, unseeded randomness, network, or CSS motion in the capture path; exact dependency versions.
- `studio/motion/tokens.js` and `docs/motion-tokens.md`: five named easings, closed-form springs by damping ratio, no overshoot on opacity/color, exits 40–50% shorter, per-beat rounded beat grid.
- `node studio/cli.mjs motion-qc <motion.json>`: text hold, contrast ≥ 4.5:1, flashes ≤ 3/s, SFX sync (+0–2 frames), onion-skin and speed-graph SVGs.
- `Banned motion` section in the brief template.

### Changed

- Dependencies are pinned to exact versions.

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
