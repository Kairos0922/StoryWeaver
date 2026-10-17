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
fixed. `series plan` will not overwrite an existing plan without `--force`.

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
- camera ranges, transitions, eases and stroke widths from the render docs;
- `mix` defaults from the current render target (`I=-16`, `TP=-1.5`, `LRA=11`);
- `open` / `close` / `cover` / `music` / `glossary` **only if the first episode already
  has the scene markers and files** (see below).

It writes `series-style.json` with **empty approval fields by design**. A person fills the
lock approval and each character approval, and fills the sections the measurement could
not infer. The command prints every warning. `--force` replaces an existing lock; that is
a direction decision for a person.

`--check` validates the lock and runs the existing per-episode visual check over every
`epNN` folder. It is the fast visual gate, not the full collection audit.

### v2 sections

v1 locks remain valid. v2 keeps the six v1 keys at the top level and adds:

| Section | What it pins | Required by `series audit` |
|---|---|---|
| `approval` | the person who approved the lock | yes |
| `rig` | `render/rig.json` sha256 | yes |
| `voice` | provider, voice_id, speech_rate, emotion range, sample | yes |
| `characters.<id>` | visual approval + `voice_id` / `speech` | character approval yes |
| `open` / `close` | template id/sha256, duration, music; close also credits/AI disclosure | yes |
| `music` / `mix` | theme, licence, BPM, loudnorm target | yes |
| `cover` | template id/sha256, fields (episode number/title) | yes |
| `glossary` | term/pronunciation table | yes |

Open, close and cover are **scene markers** inside the normal `scenes.json`, so the
existing `seek(t)` renderer draws them with no second assembly path. The marker contract:

```json
{
  "id": "open",
  "role": "open",
  "template": {"id": "series-open", "sha256": "<sha256 of the template file>"},
  "episode_number": 1,
  "episode_title": "…",
  "duration_s": 3,
  "layers": ["…"]
}
```

- `scenes.scenes[0]` is the `open` marker; `scenes.scenes.at(-1)` is the `close` marker.
- `scenes.cover` (or `render/cover.json`) carries the same `template` and
  `episode_number` / `episode_title` fields.
- `scenes.bgm.id` is the series music theme; the renderer records it in
  `render_report.json` as `bgm`.
- `render_report.json.audio` now records the loudness target and the measured values.

## Audit the collection

```bash
node studio/cli.mjs series audit <dir>
```

The audit is a machine gate for `series deliver`. It checks:

| Check | What it reads |
|---|---|
| `lock` | v2 schema, human approvals, required sections |
| `collection` | fixed slots, no extra `epNN` folders |
| `style` | the existing per-episode visual lock |
| `rig` | `render/rig.json` sha256 equals the lock |
| `voice` | `lines.json` provider, speech rate, voice ids |
| `speech` | `lint-script` on `script.md`, including series speech rules |
| `open` / `close` | one marker each, first/last, template id/sha256, episode number/title |
| `cover` | template id/sha256 and the lock's fields |
| `music` | `render_report.json.bgm.id` equals `music.theme` (or `none`) |
| `mix` | normalised full mix; measured LUFS within ±1 of `mix.target_lufs`; true peak within the cap |
| `glossary` | no banned variant in the script or lines |

`SERIES_AUDIT_OK` means the existing episodes are consistent. It does not mean every slot
has been produced; `series deliver` checks that separately.

## Deliver the collection

```bash
node studio/cli.mjs series deliver <dir>
```

`series deliver` runs the audit, then requires a deliverable package for every slot
(`epNN/deliver/LATEST` with a valid `manifest.json`). It aggregates them into
`series/deliver/<stamp>/`:

```text
index.json          order, titles, per-episode source + file hashes
SHA256SUMS          every file in the collection package
collection.md       episode table and AI-disclosure reminder
covers.html         cover contact sheet (relative images)
ep01/ … ep10/       the per-episode deliver packages, unchanged
```

It refuses with `SERIES_AUDIT_FAILED` or `SERIES_DELIVER_INCOMPLETE` rather than produce a
partial package. It does not publish; the platform AI-generated-content declaration is
still a human upload step.

## What this workflow does not do

- It does not create ten folders at once.
- It does not let an agent fill lock approvals.
- It does not estimate playback numbers.
- It does not generate open/close/cover artwork; it checks the template hashes and scene
  markers a person authored.
- It does not publish, and it does not replace the per-episode `deliver` gate.
