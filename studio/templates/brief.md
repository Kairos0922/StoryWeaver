---
status: draft
series: {{series}}
episode: {{episode}}
language: en
audience_profile: ""
model_budget_calls: ""
model_budget_stop_ratio: 0.7
font_display: ""
font_body: ""
aspect: "16:9"
target_duration_s: 90
produce_vertical: false
vertical_duration_s: ""
structure_revision: 0
approved_by: ""
approved_at: ""
approved_aspect: ""
approved_duration_s: ""
approved_produce_vertical: ""
approved_vertical_duration_s: ""
approved_structure_revision: ""
approved_body_sha256: ""
---

# Creative brief · {{series}} / {{episode}}

Topic approval is not brief approval. Until `status` is `approved` and the body hash matches, do not run full TTS or a full render.

Production agents must not edit `status`, `approved_by`, `approved_at`, or any `approved_*` field.

## One thing

(TODO. One sentence. After the watch, the viewer can do one concrete action.)

## Viewer intuition

Fill this before you pick a hook. The script must acknowledge I1 before the first “break the assumption” line.

| # | Viewer’s private objection (their words) | When that is true | Our reply (fact-card B only) | Line ids |
|---|---|---|---|---|
| I1 | (TODO) | (TODO) | (TODO) | (TODO) |

Hook candidates need a column: “Will the first reaction be a rebuttal?”

## Aspect

- Main frame: front-matter `aspect`. Landscape explainers use `16:9`.
- Vertical: set `produce_vertical` to `true` and `vertical_duration_s` to 45–60 when you also ship 9:16.
- Changing aspect voids approval.

## Duration

- Landscape `target_duration_s` is at most 90. Replace the 90 with this episode’s target.
- Vertical is at most 60.
- Changing duration increments `structure_revision`, returns `status` to `draft`, and clears every `approved_*` field.

Speech-rate cap (planning only; measure on the hook sample):

- Chinese: at most 4.0 characters/s of speech, 4.6 on any one line.
- English: at most 2.8 words/s of speech, 3.2 on any one line.
- After a key number, hold at least 0.9s. Do not write “speak fast” in emotion cues.

## Fonts

Blank `font_display` / `font_body` keep the validated default, Noto Sans CJK SC. To try a library font, set its id (see `studio/render/kit/fonts/README.md`). `font_display` replaces weights 700/900, `font_body` 400/500. Doctor fails if any on-screen character has no glyph in the chosen face.

## Model budget

`model_budget_calls` is this episode’s call budget. Record the running total in `state/model_usage.json` as `{ "calls": N }`. Stop at the current checkpoint once `model_budget_stop_ratio` (default 0.7) is reached. Leave the call count blank until a real log exists. Do not invent it.

## Five-beat story

1. Hook (0–4s): (TODO. Offend a belief or show a paradox. At most one new term.)
2. Break the assumption: (TODO. Acknowledge I1 first. Then break it. One number per line.)
3. Mechanism: (TODO. One mechanism, one picture.)
4. Payoff: (TODO. The character resists once before they accept.)
5. Audience stance: (TODO. A vote this episode can answer. Next-episode teaser is a separate 2s card.)

Do not cut away after the hook and restart. Tips are cards. The voice keeps one principle.

## Storyboard

One row per 10 seconds. The three beats are 0–3s, 3–7s, 7–10s. Name at least four visual devices. Character action cannot say “stands”.

Visual clock: 2.5s. A row with more than 5s of no new visual is unfinished.

| Window | 0–3s | 3–7s | 7–10s | Devices | Character action | Voice point |
| --- | --- | --- | --- | --- | --- | --- |
| (TODO) | (TODO) | (TODO) | (TODO) | (TODO) | (TODO) | (TODO) |

Device names: kinetic number, cut, stamp, character action, compare bars, cards, push, pan. Do not list them as used while the row is still TODO.

## Banned motion

Named defaults this episode must not use. Generic “avoid AI look” does not count. After the first draft, append every default the render still fell back to, and copy it into the series list.

- Purple/blue gradients, glow, lens flares
- Decorative floating particles
- Everything fading in at once
- Every element doing fade + slide-up
- Everything centered
- Text that moves while it is being read
- Bounce on opacity or color
- Inline easing or duration numbers instead of `studio/motion/tokens.js` names

## Audience profile

Optional. Set front-matter `audience_profile` to a file name under `studio/profiles/` (for example `children-education`) to add that profile's gates. Leave it blank for the general standard. Profile sections such as `## Guess before reveal` and `## Try it at home` go below when the profile asks for them.

## Hook sample

Before full voice, render about the first 12 seconds. A person listens, then signs `ear_hook` and `first_watch` in `qc/checklist.json`.

## Approval

The reviewer edits only the front matter:

1. Copy the current `aspect`, `target_duration_s`, `produce_vertical`, `vertical_duration_s`, and `structure_revision` into the matching `approved_*` fields.
2. Run `node studio/cli.mjs hash-brief <this file>` and write the digest to `approved_body_sha256`.
3. Set `approved_by` to a person’s name, `approved_at` to `YYYY-MM-DD`, and `status` to `approved`.

Any later edit to the body, aspect, or duration expires the approval.
