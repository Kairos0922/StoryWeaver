# AGENTS.md

## Mission

StoryWeaver is a production toolkit for fact-checked animated explainer videos of any topic, series, or language. Do not optimize for a one-off demo that cannot be repeated.

## How to start

1. Read `skills/produce-video/SKILL.md`. Claude Code reads `CLAUDE.md`, which points here and to the render contract.
2. Run `node studio/cli.mjs doctor` and `node studio/cli.mjs layout`.
3. Create a series directory outside this repository: `node studio/cli.mjs init-series <dir>`, then `init-episode <series-dir> epNN`. Each series can be its own git repository. The only episode in this repo is the CI fixture under `tests/fixtures/sample-series/`. Do not add production scripts, renders, or character sheets here.

## House rules

1. Content value precedes implementation convenience.
2. Material claims need a source or an explicit hypothesis label.
3. Model output is untrusted input: validate before compile or render.
4. Rendering is a pure function of time and checked-in inputs. It does not depend on the model vendor.
5. Prefer a structured edit of one beat over regenerating the film.
6. Do not add a feature without a measurable quality, stability, cost, or production-time benefit.
7. Keep schemas backward-compatible or document the migration in `CHANGELOG.md`.
8. Keep research, observations, hypotheses, and decisions distinct.
9. Use `AGENTS.md` exactly; do not create `Agents.md`.
10. The render contract (`docs/render-contract.md`) is binding. When you fix a render bug, add the rule that would have caught it, and a lint rule when it can be matched. Run `node studio/cli.mjs render-contract`.
11. Motion numbers come from `studio/motion/tokens.js` by name (`docs/motion-tokens.md`). No inline easing curves or durations.
12. `docs/quality-standard.md` (v1) is the release bar. `node studio/cli.mjs quality <episode-dir>` aggregates the existing gates; add a gate to its source check, not a second copy. Audience rules go in `studio/profiles/<id>.json`, never in general code.
13. Methods are opt-in techniques (`studio/techniques/<id>.json`, `docs/techniques.md`), chosen per episode in the brief's `## Approach` only where they fit; never make a situational method a universal gate. Universal gates (quality standard, style lock, pace, text hold, render contract, glyph coverage) apply to every episode. Every episode stays inside its series style lock (`docs/style-lock.md`). The lock lives in the series directory, never in this repository; the repo keeps the schema, checker, and a fictional fixture.
14. Direct changes to `main` are acceptable; CI must pass before delivery is declared complete.

## Hard stops

- Do not set `brief.md` `status` to `approved`, and do not fill `approved_by` or the body hash. That is a person’s job.
- Do not run full TTS or a full render before `BRIEF_APPROVED`. A draft preview after approval is allowed. A release is not.
- Do not call a paid TTS API from a cloud agent that does not hold keys. Stop at a silent draft and write `handoff.json`.
- Do not invent playback metrics. A blank `post/metrics.md` is valid and blocks the next topic.
- Do not publish, comment, or post on behalf of the user.
- Do not sign a human checklist item, and do not fill `qc/release.json` (including `quality_review`). `checked_by` and `signed_by` values that look like an agent are rejected. Use `agent_precheck` for ASR or pace notes.
- Do not write a one-off HTML renderer for one episode (covers included). Use the browser pipeline and the shared kit; the cover is `render/cover.json` or `scenes.json` `cover`.
- Do not hand over a draft or a render from `out/` as final, and do not encode a publish file by hand. `deliver` is the only path; if it rejects, fix the cause and run it again.
- Do not edit `CAPS.md`, `qc/approvals.json`, or the render ledger/lock to get past a refusal. Stop and report.
- Do not promise a capability (e.g. 3D) in a brief or acceptance standard unless `doctor` shows it ready.
- Do not add a character, color, font, or camera move to an episode that the series lock does not list. Do not edit a lock's `approval` fields.
- Do not put secrets in files, prompts, or logs.

## Checkpoints (plain names)

| Stage | Person must | Agent may |
|---|---|---|
| One thing + fact card | Confirm the claim set | Draft A/B/C |
| Creative brief | Approve and hash-lock | Draft, then stop at `BRIEF_READY_FOR_REVIEW` |
| Storyboard stills | Look at the stills; record `stills` in `qc/approvals.json` | `stills` after brief approval; print `approval-hashes` |
| Director scorecard | Look at stills/thumbs; sign `qc/director_review.json` with every axis ≥8 | Draft scores/notes, run `director-review`; never sign |
| Voice trial (hook sample) | Listen; record `voice_trial`; first-watch with someone who has not read the script | Render ~12s in draft after stills are approved |
| Full draft render | Set `CAPS.md` (`MAX_FULL_RENDERS`, `APPROVED`); listen to the phone pack | `render --cut full` (detached) after both approvals; never start a second one, check `render-status` |
| Release | Sign `qc/release.json` after seeing the draft | Never. Agents cannot fill `signed_by` |
| Delivery | Download `deliver/<stamp>/`, compare bytes/sha256 | `deliver` only. Never hand out a file from `out/` |
| Publish | Click publish; tick the platform AI-generated-content declaration | Hand over copy. `git-sync` is a separate retry |
| Metrics review | Paste a real export or leave blanks | Never estimate |

## Rendering contract

Every frame is `render(t)` / `seek(t)` from one browser pipeline: Playwright captures the frame, ffmpeg encodes it. `window.render(t)` and `window.seek(t)` are the external frame entry points. `--fps 30|60` is supported; `--motion-blur 1–8` averages pure sub-seeks inside a half-frame shutter, never a CSS effect. The picture stack is DOM/SVG, GSAP timelines created with `paused: true` and moved only by `timeline.seek(t)` or `totalProgress` from that external `t`, Lucide icons, sparse Lottie (`goToAndStop`), and Three.js only when a shot asks for it. Every shot then runs one WebGL post pass (grade, bloom, grain, vignette) from a named preset. No CSS transitions, no timers, no `requestAnimationFrame` in render mode, no unseeded `Math.random`. Fonts load from files, never from a CDN: Noto Sans CJK SC by default, or an optional OFL library font picked in the brief (`font_display` / `font_body`, see `studio/render/kit/fonts/README.md`), always subset per episode to WOFF2. A character without a glyph in any used face fails doctor and quality. Shot thumbnails and a contact sheet are written before the full encode. Something new appears every 2–4 seconds on the picture clock. Voice pace is a separate, slower clock.

Remotion, Motion, and Rive are inspirations, not dependencies. p5, Manim, and a video model are also not dependencies of the core pipeline; do not install them. See `docs/stack-decision.md`. The timing primitives and the GSAP seek pattern live in `studio/render/browser/dom/`. `docs/demo/title-card/` is a tool fixture, not a series.

Draft and release frames are identical: nothing marks the picture. The mode lives in `render_report.json` (`review.mode`) and draft files end in `_draft`. Release frames require a human sign-off written after the draft exists.

## Stage recovery

Each finished machine stage writes `state/<stage>.done.json` with the hashes of its inputs and outputs. `node studio/cli.mjs resume <episode-dir>` continues from the last intact stage. It does not read the chat. Pushing and editing a pull request are the `git-sync` step, which can be retried on its own.

A cloud agent with no keys writes `handoff.json` (commit, commands, expected files) and stops. The machine that holds keys runs doctor, the hook recordings, duration prediction, the listen pack, and the draft render.

Set `model_budget_calls` on the brief. When recorded usage reaches 70%, stop at the current checkpoint.

## Acceptance

A change is complete only when automated checks pass and the documented quality checkpoint is satisfied.
