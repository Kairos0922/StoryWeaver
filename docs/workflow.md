# Workflow

Folder state is the source of truth. Chats scroll. Files do not.

```text
examples/<series>/epNN/     or any series folder you own
  fact_card.md
  brief.md                  creative brief; hash-locked when approved
  script.md
  lines.json
  sim/                      optional
  audio/                    WAV cache; not in git
  render/                   stills.json, scenes.json
  stills/                   four review frames
  qc/checklist.json
  post/metrics.md
  out/                      hook / preview / full; not in git
```

## Inputs and outputs

| Stage | In | Out | Stop if |
|---|---|---|---|
| One thing | Topic note | One sentence + one action | Two mechanisms in one episode |
| Fact card | Sources, optional `sim/` | A/B/C filled, B rows typed | Placeholder or unsourced number |
| Creative brief | Fact card | Five-beat story, intuition table, storyboard | `BRIEF_INCOMPLETE` |
| Brief approval | `brief.md` | `status: approved` + matching hash | Agent wrote the approval |
| Voice-over | Brief | `script.md`, `lines.json` | Lint errors |
| Hook sample | First ~3 lines | ~12s mix | No human ear; no first-watch |
| Stills | Kit + brief | Four PNGs | Idle characters or empty storyboard |
| Full voice | Approved lines | Cached WAV + `usage.jsonl` | Missing env on this machine |
| Render | Timeline + kit | mp4, captions, contact sheet | `RENDER_ALLOWED` is false |
| QC | Mix | Checklist | Agent signed a human item |
| Publish | Copy + AI disclosure | A person clicks | Agent posted |
| Metrics | Platform export | `post/metrics.md` | Estimated numbers |

## Commands

```bash
node studio/cli.mjs init-episode <series-dir> epNN
node studio/cli.mjs checkpoint <episode-dir> brief
node studio/cli.mjs lint-script <file>
node studio/cli.mjs checkpoint <episode-dir> lines
node studio/cli.mjs pace <episode-dir>
node studio/cli.mjs checkpoint <episode-dir> hook-sample
node studio/cli.mjs checkpoint <episode-dir> stills
node studio/cli.mjs checkpoint <episode-dir> render
node studio/cli.mjs qc <episode-dir>
node studio/cli.mjs checkpoint <episode-dir> publish
```

Exit 0: pass or ready for review. Exit 1: incomplete. Exit 2: brief missing or stale.

`init-episode` refuses `ep03` and later until the previous `post/metrics.md` has a sourced number. The Invisible Rules EP01 sheet is a recorded exception (`metrics_exception: true` plus the fixed English sentence). Copying that sentence onto a new episode does nothing.

## Metrics sheet

Blank is valid. A filled number needs `source:` on the same line. Forbidden words: about, roughly, estimate, approx, expected.

After publish, decide which hook types to keep. That decision is the input to the next brief, not a vibe.
