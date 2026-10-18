# AGENTS.md — knowledge-video-studio

## Mission

knowledge-video-studio is a production toolkit. It makes fact-checked animated explainer videos
for any topic, series, or language. Do not optimize for one demo. Make each step repeatable.

## How to start

1. Read `skills/produce-video/SKILL.md`. Claude Code reads `CLAUDE.md`. That file points here and
   to the render contract.
2. Run `node studio/cli.mjs doctor` and `node studio/cli.mjs layout`.
3. Create a series directory outside this repository. Run
   `node studio/cli.mjs init-series <dir>`, then `init-episode <series-dir> epNN`.
   A series can have its own Git repository.
4. The CI fixture is `tests/fixtures/sample-series/`. It is test data. Do not add production
   scripts, renders, or character sheets to this repository.

## House rules

1. Content value comes before implementation convenience.
2. A material claim needs a source or an explicit hypothesis label.
3. Treat model output as untrusted input. Validate it before compile or render.
4. A frame is a pure function of time and checked-in inputs. It does not depend on the model vendor.
5. Prefer a structured edit of one beat to a full regeneration.
6. Add no feature without a measurable gain in quality, stability, cost, or production time.
7. Keep schemas backward-compatible. Document a migration in `CHANGELOG.md`.
8. Keep research, observations, hypotheses, and decisions separate.
9. Use `AGENTS.md` exactly. Do not create `Agents.md`.
10. The render contract is binding. When you fix a render bug, add the rule and a lint test.
    Run `node studio/cli.mjs render-contract`.
11. Use motion values from `studio/motion/tokens.js` by name. Do not write an inline easing curve
    or duration.
12. `docs/quality-standard.md` is the release bar. `node studio/cli.mjs quality <episode-dir>`
    runs the machine gates. Add a gate to the source check. Do not make a second copy.
13. Methods are opt-in techniques in `studio/techniques/`. Select a technique in the brief only
    when it fits the topic. Do not make a method a universal gate.
14. Every episode stays inside its series style lock. The lock lives in the series directory.
    The repository keeps the schema, the checker, and a fictional fixture.
15. Use `main` for all changes. Do not create a feature branch. Push to `origin/main`. CI must pass
    before you declare delivery complete.

## Hard stops

- Do not set `brief.md` `status` to `approved`. Do not fill `approved_by` or the body hash.
- Do not run full TTS or a full render before `BRIEF_APPROVED`. The pipeline allows a draft preview.
- Do not call a paid TTS API from a cloud agent without keys. Stop at a silent draft and write
  `handoff.json`.
- Do not invent playback metrics. A blank `post/metrics.md` is valid. It blocks the next topic.
- Do not publish, comment, or post for the user.
- Do not sign a human checklist item. Do not fill `qc/release.json` or `quality_review`.
  The tools reject a signer name that looks like an agent. Use `agent_precheck` for ASR notes.
- Do not write a one-off HTML renderer. Use the browser pipeline and the shared kit.
- Do not hand over a draft or a file from `out/` as final. `deliver` is the only publish path.
- Do not edit `CAPS.md`, `qc/approvals.json`, the render ledger, or a lock to bypass a refusal.
- Do not promise a capability that `doctor` has not verified. A 3D promise needs
  `requires: blender-3d` and a recorded sample.
- Do not add a character, color, font, or camera move that the series lock does not list.
- Do not put secrets in files, prompts, or logs.

## Checkpoints

| Stage | Person must | Agent may |
|---|---|---|
| One thing and fact card | Confirm the claim set | Draft A/B/C |
| Creative brief | Approve and hash-lock | Draft to `BRIEF_READY_FOR_REVIEW` |
| Storyboard stills | Look at the stills and record `stills` | Run `stills` after brief approval |
| Director scorecard | Look at the frames and sign | Draft scores and notes |
| Voice trial | Hear the hook and record `voice_trial` | Render a 12-second draft |
| Full draft render | Set `CAPS.md` and hear the phone pack | Run `render --cut full` after approval |
| Release | Sign `qc/release.json` | Never |
| Delivery | Download the package and compare sha256 | Run `deliver` only |
| Publish | Publish and tick the AI declaration | Hand over the copy |
| Metrics | Paste the real export or leave it blank | Never estimate |

## Render contract

Every frame comes from one browser pipeline. Playwright captures the frame. ffmpeg encodes the
frames. `window.render(t)` and `window.seek(t)` are the frame entry points.

The picture stack has DOM/SVG, GSAP timelines, Lucide icons, sparse Lottie, and Three.js on demand.
Create each timeline with `paused: true`. Only `seek(t)` or `totalProgress` moves it.

Every shot runs one WebGL post pass. Use a named preset.

Do not use CSS transitions, timers, `requestAnimationFrame`, or unseeded `Math.random` in the
capture path. Load fonts from files. Use Noto Sans CJK SC by default. Subset each font to WOFF2.

Write shot thumbnails and a contact sheet before the full encode. Add a new visual every 2 to 4
seconds. Voice pace is a separate clock.

`--fps` defaults to 30. The renderer supports `--fps 60`. `--motion-blur 1-8` averages pure sub-seeks in a
half-frame shutter. Motion blur is not a CSS effect.

Remotion, Motion, and Rive are inspirations, not dependencies. p5, Manim, and a video model are
also not dependencies of the core pipeline. Do not install them. See `docs/stack-decision.md`.

Draft and release frames are identical. The mode is in `render_report.json`. Release frames need
a human sign-off after the draft exists.

## Stage recovery

Each machine stage writes `state/<stage>.done.json`. The file holds input and output hashes.
`node studio/cli.mjs resume <episode-dir>` continues from the last intact stage. It does not read
the chat. The `git-sync` step can push and edit a pull request. You can retry that step alone.

A cloud agent without keys writes `handoff.json` and stops. The machine with keys runs `doctor`,
the hook recordings, duration prediction, the listen pack, and the draft render.

Set `model_budget_calls` in the brief. Stop at the current checkpoint when usage reaches 70%.

## Acceptance

A change is complete only when the automated checks pass and the documented quality checkpoint
passes.
