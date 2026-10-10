---
name: produce-video
description: Produce a fact-checked animated explainer with StoryWeaver. Works for any topic, series, or language. Enforces a fact card, creative brief, human checkpoints, voice-over lint, hook sample, and QC. Do not run full TTS or a full render before brief approval. Do not invent metrics. Do not publish.
---

# Produce a video

You are staffing a small studio, not improvising a clip. Value lives in the fact card, the brief, and QC. Rendering uses an adapter. Do not write a physics engine. Do not write a fresh page per episode.

Read `docs/methodology.md`, `docs/workflow.md`, `docs/adapters.md`, and `docs/lessons.md`. The films under `examples/invisible-rules/` are worked examples. EP01 is a counterexample (lint must fail). Do not “fix” it into the next episode.

This skill is tool-agnostic. Cursor, Claude Code, Codex, and other agents follow the same files.

## Do not

- Set `brief.md` `status` to `approved`, or fill `approved_by` / `approved_*` / the body hash.
- Prepare full-episode voice or a full render before `BRIEF_APPROVED`. `lint-script` may run anytime.
- Call Doubao, Azure, ElevenLabs, or any paid API unless this machine already has the env vars **and** the user asked for synthesis. Prefer a silent preview.
- Invent completion rate, watch time, drop-off, or comment counts.
- Publish, comment, or post.
- Sign a human checklist item. If your name looks like an agent, QC will reject it. Put machine notes in `agent_precheck`.
- Copy `metrics_exception` onto a new episode.
- Extend a deleted SVG compiler. It is not in this tree.

## 0. Open a folder

The series directory must already exist.

```bash
node studio/cli.mjs doctor
node studio/cli.mjs init-episode <series-dir> epNN
```

`METRICS_REQUIRED` means the previous episode has no sourced playback numbers. Do not invent them. Invisible Rules EP01 is the only recorded exception, so `ep02` can exist and `ep03` cannot until EP02 has a sourced sheet.

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
- Five-beat story
- At least one finished 10-second storyboard row

Landscape ≤ 90s. Vertical ≤ 60s. Plan speech at ≤ 4.0 Chinese characters/s or ≤ 2.8 English words/s. Do not write “speak fast”.

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

## 4. Sample, stills, cut

This CLI stops at checkpoints. It does not upload a video.

1. After `HOOK_SAMPLE_ALLOWED`, render about the first 12 seconds with the chosen adapter. A person listens. Sign `ear_hook` with a **person’s** name. Run a first-watch with someone who has not read the script. Sign `first_watch`.
2. Draw four stills. A person looks, then signs `stills_four`, `beat_clock`, `no_idle`.
3. After `RENDER_ALLOWED`, render the full cut. Do not install a paid renderer to “try it”. Adapter criteria: `studio/render/adapters/README.md`.
4. A person hears every number line in the mix. ASR is assistive. Loudness target is −16 LUFS; do not invent a reading without a mix.
5. After `PUBLISH_ALLOWED`, hand publish copy and the AI disclosure to a person. They click publish.

Picture: `studio/contracts/visual_contract.md`. Voice: `studio/contracts/voice_contract.md`.

TTS on a machine with keys:

```text
TTS_PROVIDER=doubao|azure|elevenlabs
# plus the matching variables in .env.example
```

Cache by content hash. Write `usage.jsonl`. Never print a key.

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
- [ ] Hook sample heard; first-watch recorded
- [ ] Four stills signed
- [ ] Full mix heard on number lines
- [ ] AI disclosure; person published
- [ ] Metrics blank or sourced
