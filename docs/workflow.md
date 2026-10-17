# Workflow

Folder state is the source of truth. Chats scroll. Files do not.

```text
<series-dir>/               outside this repository; optionally its own git repo
  series.json               workspace marker; optional collection metadata
  collection.json           fixed-size slate (series plan; default 10 slots)
  series-style.json         series lock (v1, or v2 from series lock --from ep01)
  epNN/
    fact_card.md
    brief.md                creative brief; hash-locked when approved
    script.md
    lines.json
    sim/                    optional
    audio/                  WAV cache; not in git
    render/                 stills.json, scenes.json, rig.json
    CAPS.md                 MAX_FULL_RENDERS + APPROVED line from a person; enforced by the renderer
    stills/                 four review frames
    qc/checklist.json
    qc/approvals.json       person approvals for stills and voice trial, bound to sha256
    qc/release.json         human release sign-off; agents leave it blank
    qc/listen_pack.md       phone checklist, 30 seconds or less
    state/                  stage done markers, duration prediction, model usage,
                            full_renders.jsonl (cap ledger), render.lock, render.job.json
    handoff.json            commands for the machine that holds keys
    post/metrics.md
    out/                    draft and release renders, out/logs/ for detached renders; not in git
    deliver/<stamp>/        the publish package from `deliver`; LATEST names the current one
```

## Inputs and outputs

| Stage | In | Out | Stop if |
|---|---|---|---|
| Series plan | A fixed-size slate (default 10) | `collection.json`; no episode folders yet | Slot outside the plan, duplicate slot |
| Series lock | First episode render inputs + voice | `series-style.json` draft, approvals empty | Agent-filled approval, missing rig/voice |
| One thing | Topic note | One sentence + one action | Two mechanisms in one episode |
| Fact card | Sources, optional `sim/` | A/B/C filled, B rows typed | Placeholder or unsourced number |
| Creative brief | Fact card, `../series-style.json` | Approach (techniques or none), five-beat story, intuition table, storyboard, model budget, `requires:` | `BRIEF_INCOMPLETE` (style-lock deviation; a promised capability such as 3D that is undeclared or has no passing doctor sample) |
| Brief approval (= storyboard) | `brief.md` | `status: approved` + matching hash | Agent wrote the approval |
| Voice-over | Brief, series `characters.*.speech` + `dialogue` | `script.md`, `lines.json` | Lint errors (written register, per-character sentence length); TTS refuses (`openEpisodeTts`) |
| Stills | Approved brief | `stills/*.png` | Person approval in `qc/approvals.json` (`stills.sha256` from `approval-hashes`) |
| Voice trial | First 3 lines, approved stills | WAV files, hook render | Person approval `voice_trial` (file + sha256); no key on this machine |
| Duration prediction | Those 3 recordings | `state/duration_prediction.json` | Prediction exceeds the brief limit |
| Listen pack | Number lines, names, vote | `qc/listen_pack.md` and an m4a ≤ 30s | — |
| Full render (draft) | Both approvals, `CAPS.md` | Detached job, `out/logs/`, `*_draft.mp4` | `STAGE_ORDER`, `RENDER_CAP`, `CAPS_CHANGED_UNAPPROVED`, `RENDER_LOCKED` |
| Release | Human sign-off | Release mp4 (same picture, no `_draft` suffix) | `qc/release.json` missing or signed by an agent |
| Deliver | Release render | `deliver/<stamp>/`: publish mp4 ≤30 MB, cover + 320 px thumb, srt, `manifest.json`, `SHA256SUMS` | Any check fails → `deliver/rejected-<stamp>/report.json`, no media |
| Publish | The delivered files + copy; tick the platform AI-generated-content declaration | A person clicks | No deliverable package, or its files no longer hash; agent posted |
| Git sync | The episode diff | Push and pull-request text | Retry this step alone; do not re-render |
| Metrics | Platform export | `post/metrics.md` | Estimated playback numbers |

## Commands

```bash
node studio/cli.mjs init-series <dir> --collection --episodes 10
node studio/cli.mjs series plan <series-dir> --episodes 10
node studio/cli.mjs series status <series-dir>
node studio/cli.mjs series next <series-dir>
node studio/cli.mjs series lock <series-dir> --from ep01
node studio/cli.mjs series lock <series-dir> --check
node studio/cli.mjs init-episode <series-dir> epNN
node studio/cli.mjs checkpoint <episode-dir> brief
node studio/cli.mjs lint-script <file>
node studio/cli.mjs handoff <episode-dir>
node studio/cli.mjs resume <episode-dir>
node studio/cli.mjs predict-duration <episode-dir>
node studio/cli.mjs listen-pack <episode-dir>
node studio/cli.mjs doctor --episode <episode-dir> --require-render
node studio/cli.mjs stills <episode-dir>
node studio/cli.mjs approval-hashes <episode-dir> --voice audio/trial.mp3
node studio/cli.mjs render <episode-dir> --mode draft --cut preview --review-only
node studio/cli.mjs render <episode-dir> --mode draft --cut full      # detached; prints log path
node studio/cli.mjs render-status <episode-dir>
node studio/cli.mjs render <episode-dir> --mode release --cut full
node studio/cli.mjs deliver <episode-dir>
node studio/cli.mjs checkpoint <episode-dir> publish
node studio/cli.mjs git-sync <episode-dir>
```

Exit 0: pass, ready for review, or the next resume step is identified. Exit 1: incomplete, over the duration limit, or the model budget has reached its stop ratio. Exit 2: brief missing or stale, or doctor blocked a render.

Full renders are never retried by starting another one: `render-status` shows the running job and its log. A lock whose PID is gone is stale and the next render replaces it. Every full-render start counts against `CAPS.md`, finished or not.

`resume` reads `state/<stage>.done.json`. It does not read the chat. If the input hash changed, that stage is open again. `git-sync --retry` rewrites the push step without repeating TTS or the render.

`init-series` and `init-episode` refuse a directory inside the tool repository. `init-episode` refuses the next episode until the previous `post/metrics.md` has a sourced number. A blank sheet blocks the next topic. Do not invent a number to open it.

## Model budget

Set `model_budget_calls` on the brief. Write `{ "calls": N }` to `state/model_usage.json` from a real log. At 70% (or `model_budget_stop_ratio`), `checkpoint` and `resume` stop on the current stage. Leave the file absent until you have a number. Do not invent one.

## Metrics sheet

Blank is valid. A filled playback number needs `source:` on the same line. Forbidden words: about, roughly, estimate, approx, expected.

Copy TTS cost and rework rate from `render_report.json` when that file exists. Leave them blank when it does not.

After publish, decide which hook types to keep. That decision is the input to the next brief, not a vibe.
