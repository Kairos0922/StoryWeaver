---
name: produce-video
description: Produce a fact-checked animated explainer with StoryWeaver. Works for any topic, series, or language. Enforces a fact card, creative brief, human checkpoints, voice-over lint, hook sample, and QC. Do not run full TTS or a full render before brief approval. Do not invent metrics. Do not publish.
---

# Produce a video

You are staffing a small studio, not improvising a clip. Value lives in the fact card, the brief, and QC. Rendering uses the shared browser pipeline. Do not write a physics engine. Do not write a fresh page per episode.

Read `docs/methodology.md`, `docs/workflow.md`, `docs/adapters.md`, and `docs/lessons.md`. The folder `tests/fixtures/sample-series/` is CI data, not a template and not a workspace. Do not copy its approval fields.

This skill is tool-agnostic. Cursor, Claude Code, Codex, and other agents follow the same files.

## Do not

- Set `brief.md` `status` to `approved`, or fill `approved_by` / `approved_*` / the body hash.
- Prepare full-episode voice or a full render before `BRIEF_APPROVED`. `lint-script` may run anytime.
- Call Doubao, or any paid API, only when this machine already has the env vars and the user asked for synthesis. Otherwise stay on the dry-run provider and a silent draft.
- Invent completion rate, watch time, drop-off, or comment counts.
- Publish, comment, or post.
- Sign a human checklist item or `qc/release.json`. If your name looks like an agent, QC will reject it. Put machine notes in `agent_precheck`.
- Invent a playback number so the next episode can be created.
- Extend a deleted SVG compiler. It is not in this tree.

## 0. Open a folder

The series directory lives outside this repository. The video’s language is the episode’s language (`brief.md` and `lines.json`). Lint and pace use that language’s pack (`en.json` or `zh.json`).

```bash
node studio/cli.mjs doctor
node studio/cli.mjs init-series <dir>
node studio/cli.mjs init-episode <series-dir> epNN
```

`METRICS_REQUIRED` means the previous episode has no sourced playback numbers. Do not invent them. A blank sheet blocks the next episode.

A series may also have a fixed-size `collection.json` (default 10 slots; `docs/series-workflow.md`). Read it before creating an episode:

```bash
node studio/cli.mjs series status <series-dir>
node studio/cli.mjs series next <series-dir>
```

Do not create an episode outside the plan (`COLLECTION_FULL`) and do not bypass the previous episode's metrics gate. After the first episode is approved, a person runs `series lock --from ep01` (or reviews the draft it writes) and fills the lock/character approvals; an agent never fills them.

## 1. One thing and fact card

Edit `fact_card.md`.

- One mechanism. Split a second mechanism into another episode.
- Section A: every sentence has a source. If you did not read the PDF, say so.
- Section B: every on-screen number points at a `sim/` field, with a quantity type (`average`, `individual`, `fairness`, `tail-risk`, `proportion`).
- Section C: what you will not say. Include: do not sell fairness as speed; do not sell a group average as this viewer’s next visit.

`sim/` exists only when this episode needs numbers.

## 2. Write the creative brief, then stop

Fill `brief.md`:

- One thing
- Viewer intuition (at least I1, in the viewer’s words)
- Aspect and duration
- Approach: technique id(s) from `studio/techniques/` or `none`, plus one sentence why it fits this topic. Read each technique's `fits` / `avoid` first; never use one for its own sake. Paste each chosen technique's brief section. Only chosen techniques are checked (`docs/techniques.md`).
- Five-beat story
- At least one finished 10-second storyboard row

Draw whatever you choose inside `../series-style.json` when the series has one (`docs/style-lock.md`). `node studio/cli.mjs style <episode-dir>` lists every deviation. Never override a locked key from the brief or the scene files.

Speech-rate cap is per language: at most 4.0 Chinese characters/s or 2.8 English words/s. Landscape length is chosen by the content and set by the approved brief (`approved_duration_s`); the measured cut must land within ±10% (series can override in `series-style.json` → `duration`). Vertical is at most 60. Do not write “speak fast”.

Set `model_budget_calls` in the brief. Record real call counts in `state/model_usage.json`. At 70% of the budget, stop at the current checkpoint.

```bash
node studio/cli.mjs checkpoint <episode-dir> brief
```

The only acceptable result is `BRIEF_READY_FOR_REVIEW`. Hand that to a person and **stop**. Do not run `hash-brief` and write the digest back.

If you later edit the body, set `status` to `draft`, increment `structure_revision`, and clear `approved_*`.

## 3. Voice-over

Write `script.md` with the five English headings (Hook, Break the assumption, Mechanism, Payoff, Audience stance). Spoken lines are `>` quotes. Put `## Self-check` last.

Acknowledge I1 before the first break-assumption line. One number per line. Average numbers include “average” (or the language equivalent).

```bash
node studio/cli.mjs lint-script <episode-dir>/script.md
```

Fix every `ERROR`. Treat long-sentence and method warnings as work: split the line; move assumptions to the fact card.

Then copy passing quotes into `lines.json` (`language: en` or `zh`, one object per line, `claims` pointing at B ids, `key_number` on number lines).

```bash
node studio/cli.mjs checkpoint <episode-dir> lines
```

Do not make a hook sample before `LINES_ALLOWED`.

## 4. Sample, stills, draft, release

This CLI stops at checkpoints. It does not upload a video. A cloud agent with no keys writes `handoff.json` and stops. The machine that holds keys runs `node studio/cli.mjs resume <episode-dir>` and continues from the last intact stage.

1. Stills: `stills <episode-dir>` (needs the approved brief, which holds the storyboard). A person looks and records `stills` in `qc/approvals.json` with the hash from `approval-hashes`; they also sign `stills_four`, `beat_clock`, `no_idle`. Changing a still voids the approval.
2. Voice trial: record the first 3 hook lines (TTS goes through `openEpisodeTts`, which refuses while lint fails). Run `predict-duration`; if it exceeds the brief limit, revise the script. After `HOOK_SAMPLE_ALLOWED`, `render --mode draft --cut hook`. A person listens, records `voice_trial` (file + sha256) and signs `ear_hook`; first-watch with someone who has not read the script, then `first_watch`.
3. Run `listen-pack`. It joins number lines, character names, and the vote into a phone file of at most 30 seconds, plus `qc/listen_pack.md`. ASR may add lines. An ASR score does not pass the pack.
4. A person writes `CAPS.md` (`MAX_FULL_RENDERS`, `APPROVED: <name> <date>`). Run `doctor --episode <dir> --require-render`, then `render --mode draft --cut full`. It refuses without both approvals, beyond the cap, or while another render holds the lock; it runs detached and prints its log path. Follow it with `render-status`; never start another to "retry". The draft file ends in `_draft`; nothing marks the picture.
5. Run `node studio/cli.mjs quality <episode-dir>` (`docs/quality-standard.md`). Fix every machine gate. Exit 3 means only the four human questions remain; do not answer them.
6. A person hears the listen pack and signs `qc/release.json` (`signed_by`, `signed_at`) and `quality_review`. Agents cannot fill those fields. Only then: `render --mode release --cut full`.
7. `deliver <episode-dir>`. It makes the publish encode, plays it in real Chrome end to end with seeks, checks the cover at 320 px on rendered glyph pixels, and writes `deliver/<stamp>/` with `manifest.json` and `SHA256SUMS`. If it prints `DELIVERY_REJECTED`, fix the cause (cover in the kit doc, not by hand) and run it again. Hand over only that folder, with each file's byte size and sha256.
8. After `PUBLISH_ALLOWED`, hand publish copy to a person and remind them to tick the platform AI-generated-content declaration. They click publish. `git-sync` is a separate step for the push and the pull-request text. Retry it with `--retry` without rendering again.

Picture: `studio/contracts/visual_contract.md`. Voice: `studio/contracts/voice_contract.md`. Pipeline: `studio/render/adapters/README.md`.

Motion stack for a shot, when the picture needs type and icons: DOM/SVG, GSAP seek (`paused: true`, then `timeline.seek(t)` or `totalProgress` from the pipeline clock), Lucide, and a Lottie file only when `goToAndStop` holds still. Three.js stays off unless that shot has a `three` layer. The WebGL post pass is unchanged. Remotion, Motion, and Rive are inspirations, not dependencies. Do not install them. Pattern: `studio/render/browser/dom/README.md`. The tool fixture, not an episode, is `docs/demo/title-card/`:

```bash
node studio/cli.mjs doctor --episode docs/demo/title-card --require-render
node studio/cli.mjs render docs/demo/title-card --mode draft --cut preview --review-only
```

TTS on a machine with keys:

```text
TTS_PROVIDER=doubao
# or TTS_PROVIDER=dry-run
```

Cache by content hash. Append `audio/usage.jsonl` with `chars` and `retake`. Never print a key. The render report records `cost.tts_chars` and `cost.tts_cny` at 3 CNY per 10,000 characters. `cost.model_calls` stays null until a usage API is recorded.

## Motion rules and self-review

- Contract: `docs/render-contract.md`. Run `node studio/cli.mjs render-contract` before a render. Every fixed render bug adds a rule.
- Tokens: `studio/motion/tokens.js` (5 named easings, closed-form springs by damping ratio, durations, beat grid). Opacity and color never bounce. Exits are 40–50% shorter than entrances. One hero action per shot.
- Banned motion: keep the brief's `Banned motion` list; after each first draft, name every default the render fell back to and add it.
- Motion QC: measure the draft into a motion spec and run `node studio/cli.mjs motion-qc <motion.json>`. It checks text hold time (zh: 0.27 s/char + 0.5 s from `pace.comfortable_per_s`), contrast ≥ 4.5:1, flashes ≤ 3/s, and SFX landing 0–2 frames after the picture event; it writes an onion skin and a speed graph per tracked element. See `docs/motion-tokens.md`.
- Self-review loop: still → look → notes with frame numbers → fix → re-render only what changed. Apply one or two notes per round; two to four rounds is normal. Count creative follow-ups and technical fixes separately in the render report.
- If a fix will not stick, render the frames before and after the problem frame, list every difference, and change one line.
- Make the picture work with the sound off first.

## 5. After publish

Copy a real export into `post/metrics.md`. Put `source:` on the same line as any number. Leave missing cells blank.

Do not open the next topic until that sheet has a sourced number (unless you are looking at the recorded EP01 exception).

## If the structure changes

Changing the five beats, the aspect, or the duration is a new brief. Return to step 2. Do not patch one line on a finished encode and call it the same film.

## Final checklist

- [ ] One thing and one action
- [ ] Fact card A/B/C, B rows typed
- [ ] Viewer intuition filled; acknowledged before the first break
- [ ] Brief approved by a person; hash matches
- [ ] Lint clean; pace inside the language cap
- [ ] Hook lines recorded; predicted duration inside the brief limit
- [ ] Hook sample heard; first-watch recorded
- [ ] Four stills signed
- [ ] Listen pack heard on a phone
- [ ] Render contract clean; motion QC passes
- [ ] `quality` machine gates pass (`docs/quality-standard.md` v1)
- [ ] A person answered the four review questions in `quality_review`
- [ ] Stills and voice trial approved by a person before the full render; renders within `CAPS.md`
- [ ] Draft rendered after doctor; release signed by a person
- [ ] `deliver` printed `DELIVERABLE`; person got `deliver/<stamp>/` with bytes + sha256
- [ ] Platform AI-generated-content declaration ticked on upload; person published
- [ ] Metrics blank or sourced; cost copied from the render report or left blank
