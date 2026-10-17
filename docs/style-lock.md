# Series style lock

A universal Phase A rule: every episode of a series keeps one look, whatever technique it uses (`docs/techniques.md`). Techniques change per episode; the look does not.

## Series style lock (per series)

A series keeps one look. The lock is `series-style.json` in the series working directory, next to the episode folders and outside this repository. Episodes inherit it. The repository ships only this schema, the checker (`studio/style/style_lock.mjs`), and a fictional fixture (`tests/fixtures/sample-series/series-style.json`).

Derive the lock from shipped episodes: measure palettes, fonts, rig characters, camera values, and eases from the render inputs that produced published films. Do not invent values.

```json
{
  "schema": "storyweaver.series_style.v1",
  "series": "<id>",
  "source": {"measured_from": ["<files>"]},
  "palette": {"ink": "#13232E", "...": "..."},
  "palette_aliases": [],
  "fonts": {"families": ["Noto Sans CJK SC", "..."], "library_ids": [], "weights": [400, 500, 700, 900]},
  "characters": {"<id>": {"name": "", "colors": [], "expressions": [], "approval": {"by": "<person>", "at": "YYYY-MM-DD", "evidence": ""}}},
  "camera": {"zoom": [min, max], "max_rot_deg": 0, "max_shake": 0, "max_hit_zoom": 0, "transitions": [], "language": ""},
  "line": {"ink": "#...", "stroke_px": [min, max], "shading": ""},
  "motion": {"scene_eases": [], "tokens": []}
}
```

Locked keys: `palette`, `fonts`, `characters`, `camera`, `line`, `motion`.

`node studio/cli.mjs style <episode-dir>` (and QC item `style_lock`, and `checkpoint … brief`) fails when:

- a scene or still uses a color name not in `palette`, or any hex not among the palette values;
- `render/stills.json` `palette` adds a key or changes a value;
- a font family is not in `fonts.families`, or the brief picks `font_display` / `font_body` outside `fonts.library_ids`;
- a character, speaker, or rig entry is not in `characters`, or uses an expression the lock does not list;
- a character in the lock has no human `approval` (agent-looking signers are rejected);
- camera zoom leaves `camera.zoom`, rotation or shake exceed their caps, or a transition is not in `camera.transitions`;
- a scene ease is not in `motion.scene_eases`;
- the brief front matter sets a locked key (or any `style_*` key), or the body has a "Style override" section.

No lock file means the series is unlocked; the check passes and says so. To change the look, edit the lock (a direction decision for a person), not the episode.

## v2: collection consistency

A 10-episode collection also needs the things a visual lock cannot see: the same rig, the
same voice, the same intro/outro, the same music bed and the same cover template. The v2
schema keeps every v1 key at the top level (so v1 locks and the existing scene checks keep
working) and adds:

| Key | Purpose |
|---|---|
| `approval` | the person who approved the lock (`by`, `at`) |
| `rig` | `render/rig.json` path and sha256; all episodes use the same rig |
| `voice` | provider, voice_id, speech_rate, emotion range, sample hash |
| `characters.<id>.voice_id` / `speech` | per-character voice and speech rules (the lint already reads `speech`) |
| `open` / `close` | fixed or template intro/outro, hash, duration, music, credits/AI disclosure |
| `music` / `mix` | theme, licence, BPM, loudnorm target (`I=-16`, `TP=-1.5`, `LRA=11`) |
| `cover` | cover template and its fields (episode number/title) |
| `glossary` | term/pronunciation table |

Start from the first episode instead of typing the lock by hand:

```bash
node studio/cli.mjs series lock <series-dir> --from ep01
node studio/cli.mjs series lock <series-dir> --check
```

`--from ep01` writes a **draft**: it measures the visual keys, the rig hash and the voice
fields from the episode's render inputs and `lines.json`. It leaves every `approval` field
empty; a person fills the lock approval and each character approval. The sections the
measurement cannot infer (`open`, `close`, `music`, `mix`, `cover`, `glossary`) are
warnings, not silent defaults. `--force` replaces an existing lock and is a direction
decision for a person.

In this slice `--check` validates the v2 lock and runs the existing visual check over every
`epNN` folder. The full cross-episode audit (rig, voice, open/close, cover, loudness,
glossary) and `series deliver` are the next slice; until they exist, a v2 lock with an
empty `open`/`close` is a draft, not a collection guarantee.

v1 remains valid. New collections should use v2. See `docs/series-workflow.md`.

## Drawing a technique inside the lock

Example: a concept machine (`studio/techniques/concept-machine.json`).

- Build the machine from kit layers and series palette names. New parts get palette names that already exist (`ink`, `teal`, `goods_a` …); a genuinely new color is a lock change, not an episode choice.
- Treatment follows `line`: flat fills, one ink outline at the locked stroke range, one soft shadow. No gradients or glow (banned list).
- The lit subject uses the series accent and the camera language; it is the only element with motion while a line is read.
- Series characters operate or react to the machine. A new character needs series approval in the lock first.
- Labels and readouts sit on cards in the locked fonts. Numbers on them come from the `Model` source.
