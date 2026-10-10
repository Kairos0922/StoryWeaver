# AGENTS.md

## Mission

StoryWeaver is a production toolkit for fact-checked animated explainer videos of any topic, series, or language. Do not optimize for a one-off demo that cannot be repeated.

## How to start

1. Read `skills/produce-video/SKILL.md`.
2. Run `node studio/cli.mjs doctor` and `node studio/cli.mjs layout`.
3. Work episode files in a series folder. The Invisible Rules films under `examples/invisible-rules/` are worked examples, not the product.

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
10. Direct changes to `main` are acceptable; CI must pass before delivery is declared complete.

## Hard stops

- Do not set `brief.md` `status` to `approved`, and do not fill `approved_by` or the body hash. That is a person’s job.
- Do not run full TTS or a full render before `BRIEF_APPROVED`.
- Do not call a paid TTS API from a cloud agent that does not hold keys. Stop at a silent preview.
- Do not invent playback metrics. A blank `post/metrics.md` is valid and blocks the next topic.
- Do not publish, comment, or post on behalf of the user.
- Do not sign a human checklist item. `checked_by` values that look like an agent are rejected. Use `agent_precheck` for ASR or pace notes.
- Do not write a one-off HTML renderer for one episode. Use an adapter and the shared kit.
- Do not put secrets in files, prompts, or logs.

## Checkpoints (plain names)

| Stage | Person must | Agent may |
|---|---|---|
| One thing + fact card | Confirm the claim set | Draft A/B/C |
| Creative brief | Approve and hash-lock | Draft, then stop at `BRIEF_READY_FOR_REVIEW` |
| Hook sample | Listen; first-watch with someone who has not read the script | Render ~12s after lines are allowed |
| Storyboard stills | Look at four frames | Draw stills from the kit |
| Full render | Sign remaining human items | Mix and encode after `RENDER_ALLOWED` |
| Publish | Click publish; write the AI disclosure | Hand over copy |
| Metrics review | Paste a real export or leave blanks | Never estimate |

## Rendering contract

Every frame is `seek(t)`. No CSS transitions, no timers, no `requestAnimationFrame` in render mode, no unseeded `Math.random`. Fonts load from files, never from a CDN. Something new appears every 2–4 seconds on the picture clock. Voice pace is a separate, slower clock.

## Acceptance

A change is complete only when automated checks pass and the documented quality checkpoint is satisfied.
