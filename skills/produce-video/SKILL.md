---
name: produce-video
description: Produce a fact-checked explainer with knowledge-video-studio. Use the fact card, brief, human checkpoints, voice lint, hook sample, and QC. Do not run full TTS or a full render before brief approval. Do not publish.
---

# Produce a video

You are a small studio. Do not improvise a clip. Value comes from the fact card, the brief, and QC.
Use the shared browser pipeline. Do not write a physics engine. Do not write a page for each episode.
Remotion, Motion, and Rive are inspirations, not dependencies. The pipeline uses `seek(t)` and paused
GSAP timelines. Do not install them.

Read `docs/methodology.md`, `docs/workflow.md`, `docs/adapters.md`, and `docs/lessons.md`.
The folder `tests/fixtures/sample-series/` is CI data. It is not a template. Do not copy its
approval fields.

This skill is tool-agnostic. Cursor, Claude Code, Codex, and other agents use the same files. For a
new episode, fill `studio/templates/prompt.xml` and read `references/prompt-framework.md`.

## Do not

- Set `brief.md` `status` to `approved`. Do not fill `approved_by`, `approved_*`, or the body hash.
- Prepare full voice or a full render before `BRIEF_APPROVED`. You can run `lint-script` at any time.
- Call Doubao or a paid API without keys and a user request. Use the dry-run provider and a silent draft.
- Invent completion rate, watch time, drop-off, or comment counts.
- Publish, comment, or post.
- Sign a human checklist item or `qc/release.json`. The tools reject a signer name that looks like
  an agent. Put machine notes in `agent_precheck`.
- Invent a playback number to open the next episode.
- Extend an SVG compiler that is not in this tree.

## 0. Open a folder

The series directory lives outside this repository. The episode language comes from `brief.md` and
`lines.json`. Lint and pace use that language pack.

```bash
node studio/cli.mjs doctor
node studio/cli.mjs init-series <dir>
node studio/cli.mjs init-episode <series-dir> epNN
```

`METRICS_REQUIRED` means the previous episode has no sourced playback numbers. Do not invent them.
A blank sheet blocks the next episode.

A series can have a fixed-size `collection.json`. Read it before you create an episode:

```bash
node studio/cli.mjs series status <series-dir>
node studio/cli.mjs series next <series-dir>
```

Do not create an episode outside the plan. Do not bypass the metrics gate. After a person approves the first episode, that person runs `series lock --from ep01` and fills the
lock approvals. An agent never
fills them. Before you hand over a season, run `series audit` and `series deliver`.

## 1. One thing and fact card

Edit `fact_card.md`.

- One mechanism. Put a second mechanism in another episode.
- Section A: each sentence has a source. If you did not read the PDF, say so.
- Section B: each on-screen number points at a `sim/` field and has a quantity type.
- Section C: list what you will not say. Include the fairness and average rules.

`sim/` exists only when the episode needs numbers.

## 2. Write the creative brief, then stop

Fill `brief.md`:

- One thing
- Viewer intuition (at least I1, in the viewer's words)
- Aspect and duration
- Approach: technique IDs or `none`, plus one sentence. Read the technique's `fits` and `avoid`
  fields first. Paste the chosen technique's brief section.
- Five-beat story
- At least one finished 10-second storyboard row
- Director review plan

Use a series style lock when the series has one. `node studio/cli.mjs style <episode-dir>` lists
each deviation. Do not override a locked key.

Speech-rate cap: 4.0 Chinese characters per second or 2.8 English words per second. Landscape
length comes from the approved brief. The measured cut must be within ±10%. Vertical is at most 60
seconds. Do not write "speak fast".

Set `model_budget_calls`. Record real calls in `state/model_usage.json`. Stop at 70%.

```bash
node studio/cli.mjs checkpoint <episode-dir> brief
```

The only acceptable result is `BRIEF_READY_FOR_REVIEW`. Give it to a person and stop. Do not run
`hash-brief` and write the digest.

If you edit the body, set `status` to `draft`, increase `structure_revision`, and clear `approved_*`.

## 3. Script, lines, and voice gate

Write `script.md` and `lines.json`. Run:

```bash
node studio/cli.mjs lint-script <script.md|lines.json>
node studio/cli.mjs fact-check <episode-dir>
```

The fact check needs every claim, a source, and a human review. A fact or mechanism claim must be
`verified`. An estimate, analogy, or pedagogy claim must say so. TTS does not open until the fact
check passes.

## 4. Stills and director review

After brief approval, run:

```bash
node studio/cli.mjs stills <episode-dir>
```

A person looks at the stills and records `stills` in `qc/approvals.json`. Do not sign for them.

Then render the review sheets:

```bash
node studio/cli.mjs render <episode-dir> --mode draft --cut preview --review-only
node studio/cli.mjs director-review <episode-dir>
```

Fill `qc/director_review.json`. Every axis must be at least 8. An AI can draft the scores. A person
must sign. Fix the scene and re-render. Do not re-score the same frames after a promise to fix.

## 5. Hook sample

Render a 12-second hook after a person approves the stills. A person hears it and records `voice_trial`.
Then run duration prediction.

## 6. Full render

A person sets `CAPS.md` and hears the phone pack. The render runs detached and one at a time. Check
`render-status`.

## 7. Release and deliver

A person signs `qc/release.json` after the draft. Only `deliver` makes the publish package. Compare
the bytes and sha256. Do not hand over a file from `out/`.

## 8. Publish and metrics

A person publishes and ticks the platform AI declaration. Paste the real metrics export. Leave the
sheet blank if you have no export. Do not estimate.
