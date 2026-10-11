# Workflow

Folder state is the source of truth. Chats scroll. Files do not.

```text
<series-dir>/               outside this repository; optionally its own git repo
  epNN/
    fact_card.md
    brief.md                creative brief; hash-locked when approved
    script.md
    lines.json
    sim/                    optional
    audio/                  WAV cache; not in git
    render/                 stills.json, scenes.json, rig.json
    stills/                 four review frames
    qc/checklist.json
    qc/release.json         human release sign-off; agents leave it blank
    qc/listen_pack.md       phone checklist, 30 seconds or less
    state/                  stage done markers, duration prediction, model usage
    handoff.json            commands for the machine that holds keys
    post/metrics.md
    out/                    draft and release renders; not in git
```

## Inputs and outputs

| Stage | In | Out | Stop if |
|---|---|---|---|
| One thing | Topic note | One sentence + one action | Two mechanisms in one episode |
| Fact card | Sources, optional `sim/` | A/B/C filled, B rows typed | Placeholder or unsourced number |
| Creative brief | Fact card, `../series-style.json` | Approach (techniques or none), five-beat story, intuition table, storyboard, model budget | `BRIEF_INCOMPLETE` (also on style-lock deviation) |
| Brief approval | `brief.md` | `status: approved` + matching hash | Agent wrote the approval |
| Voice-over | Brief | `script.md`, `lines.json` | Lint errors |
| Hook recordings | First 3 lines | WAV files | No key on this machine |
| Duration prediction | Those 3 recordings | `state/duration_prediction.json` | Prediction exceeds the brief limit |
| Listen pack | Number lines, names, vote | `qc/listen_pack.md` and an m4a ≤ 30s | — |
| Draft render | Timeline + kit | Thumbnails, contact sheet, `*_draft.mp4` (no in-frame mark) | Doctor failed, or brief not approved |
| Release | Human sign-off | Release mp4 (same picture, no `_draft` suffix) | `qc/release.json` missing or signed by an agent |
| Publish | Copy + tick the platform AI-generated-content declaration | A person clicks | Agent posted |
| Git sync | The episode diff | Push and pull-request text | Retry this step alone; do not re-render |
| Metrics | Platform export | `post/metrics.md` | Estimated playback numbers |

## Commands

```bash
node studio/cli.mjs init-series <dir>
node studio/cli.mjs init-episode <series-dir> epNN
node studio/cli.mjs checkpoint <episode-dir> brief
node studio/cli.mjs lint-script <file>
node studio/cli.mjs handoff <episode-dir>
node studio/cli.mjs resume <episode-dir>
node studio/cli.mjs predict-duration <episode-dir>
node studio/cli.mjs listen-pack <episode-dir>
node studio/cli.mjs doctor --episode <episode-dir> --require-render
node studio/cli.mjs render <episode-dir> --mode draft --cut preview --review-only
node studio/cli.mjs render <episode-dir> --mode release --cut full
node studio/cli.mjs git-sync <episode-dir>
node studio/cli.mjs checkpoint <episode-dir> publish
```

Exit 0: pass, ready for review, or the next resume step is identified. Exit 1: incomplete, over the duration limit, or the model budget has reached its stop ratio. Exit 2: brief missing or stale, or doctor blocked a render.

`resume` reads `state/<stage>.done.json`. It does not read the chat. If the input hash changed, that stage is open again. `git-sync --retry` rewrites the push step without repeating TTS or the render.

`init-series` and `init-episode` refuse a directory inside the tool repository. `init-episode` refuses the next episode until the previous `post/metrics.md` has a sourced number. A blank sheet blocks the next topic. Do not invent a number to open it.

## Model budget

Set `model_budget_calls` on the brief. Write `{ "calls": N }` to `state/model_usage.json` from a real log. At 70% (or `model_budget_stop_ratio`), `checkpoint` and `resume` stop on the current stage. Leave the file absent until you have a number. Do not invent one.

## Metrics sheet

Blank is valid. A filled playback number needs `source:` on the same line. Forbidden words: about, roughly, estimate, approx, expected.

Copy TTS cost and rework rate from `render_report.json` when that file exists. Leave them blank when it does not.

After publish, decide which hook types to keep. That decision is the input to the next brief, not a vibe.
