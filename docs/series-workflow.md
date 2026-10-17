# Series workflow (collection)

A collection is a **fixed-size plan**, default 10 episodes. It is not a production batch:
`collection.json` lists the slots, but episode folders are still created one at a time by
`init-episode`, after the previous episode's `post/metrics.md` has a sourced number.
The metrics gate is unchanged; a collection does not buy an exception.

## Create a collection

```bash
node studio/cli.mjs init-series <dir> --collection --episodes 10
# or, in an existing series:
node studio/cli.mjs series plan <dir> --episodes 10
```

This writes `collection.json` and records `collection` in `series.json`. It does **not**
create `ep01`…`ep10`. `ep01` is the `style-reference`: its look, voice, intro, outro and
cover become the series reference.

```json
{
  "schema": "storyweaver.collection.v1",
  "series": "series-id",
  "episodes": [
    {"slot": "ep01", "title": "", "status": "planned", "role": "style-reference"},
    {"slot": "ep02", "title": "", "status": "planned", "role": "regular"}
  ]
}
```

Statuses: `planned`, `in-progress`, `delivered`. Titles may stay blank until the topic is
fixed. `series plan` refuses to overwrite an existing plan without `--force`.

## See the slate

```bash
node studio/cli.mjs series status <dir>
node studio/cli.mjs series next <dir>
```

`series status` is a 10-row table: slot, title, stage, metrics, blocker, next command.
`series next` prints only the next slot and why it is blocked. Both are read-only views;
they do not change the metrics gate.

Exit codes for `series next`:

| Code | Meaning |
|---|---|
| 0 | ready to create, or an episode is already in progress |
| 3 | blocked by an earlier episode's metrics sheet |
| 1 | no `collection.json`, or an invalid one |

The stage is derived from files, not from a chat:

```text
not-created / empty / fact / brief / brief-approved / stills / voice / draft / release / delivered
```

A slot with `deliver/LATEST` counts as delivered even if nobody updated
`collection.json`. This keeps `series next` from pointing at a finished episode.

## Create the next episode

```bash
node studio/cli.mjs init-episode <dir> ep01
```

`init-episode` checks the collection before creating anything:

- a slot outside the plan fails with `COLLECTION_FULL`;
- the previous episode's blank or unsourced metrics sheet fails with `METRICS_REQUIRED`;
- an allowed slot is marked `in-progress` in `collection.json`.

Fill the fact card and brief, then stop at the normal human checkpoints. When the episode
is published, paste a real export into `post/metrics.md`; only then can the next slot be
created. Do not estimate a number to open the next episode.

## Lock the series look and voice (v2)

```bash
node studio/cli.mjs series lock <dir> --from ep01
node studio/cli.mjs series lock <dir> --check
```

`--from ep01` measures a **draft** v2 lock from the first episode:

- palette, fonts, character names/colours/expressions from `render/stills.json`,
  `render/scenes.json` and `render/rig.json`;
- the rig hash (`render/rig.json` sha256);
- provider, voice id, speech rate, emotion range from `lines.json`;
- camera ranges, transitions, eases and stroke widths from the render docs.

It writes `series-style.json` with **empty approval fields by design**. A person fills the
lock approval and each character approval, and adds the sections the measurement cannot
infer: `open`, `close`, `music`, `mix`, `cover`, `glossary`. The command prints every
warning. `--force` replaces an existing lock; that is a direction decision for a person.

`--check` validates the lock and runs the existing per-episode visual check over every
`epNN` folder. It does **not** yet run the full series audit (rig, voice, open/close,
cover, loudness, glossary); that is the next slice.

### v2 sections

v1 locks remain valid. v2 keeps the six v1 keys at the top level and adds:

| Section | What it pins | Required by `--check` |
|---|---|---|
| `approval` | the person who approved the lock | yes |
| `rig` | `render/rig.json` sha256 | yes |
| `voice` | provider, voice_id, speech_rate, emotion range, sample | yes |
| `characters.<id>` | visual approval + `voice_id` / `speech` | character approval yes |
| `open` / `close` | fixed or template asset, hash, duration, music, credits/AI disclosure | optional in this slice |
| `music` / `mix` | theme, licence, BPM, loudnorm target | optional in this slice |
| `cover` | template and fields (episode number/title) | optional in this slice |
| `glossary` | term/pronunciation table | optional in this slice |

The next slice adds `series audit` (the checks above across the whole season) and
`series deliver` (one collection package with index, checksums, cover contact sheet and
credits). Neither exists yet; do not describe a collection as delivered until it does.

## What this workflow does not do

- It does not create ten folders at once.
- It does not let an agent fill lock approvals.
- It does not estimate playback numbers.
- It does not render intro/outro; the v2 schema has slots for their assets/hashes, and
  `series audit` will require them.
