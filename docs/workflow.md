# Workflow

## Stages

| Stage | Command | Gate |
|---|---|---|
| Series | `init-series <dir>` | Directory outside this repository |
| Episode | `init-episode <series-dir> epNN` | Previous metrics or first episode |
| Fact card | Edit `fact_card.md` | A person confirms the claim set |
| Brief | `checkpoint <episode> brief` | `BRIEF_READY_FOR_REVIEW` |
| Approval | A person edits the front matter | Hash-locked approval |
| Script | `lint-script <script.md>` | No lint error |
| Lines | `lint-script <lines.json>` | No lint error |
| Fact check | `fact-check <episode>` | Every claim is verified |
| Stills | `stills <episode>` | A person records the stills |
| Director review | `director-review <episode>` | Every axis is at least 8 |
| Hook | `render --cut hook` | A person records the voice trial |
| Full | `render --cut full` | `CAPS.md` and the phone pack |
| Release | A person signs `qc/release.json` | Signed release |
| Deliver | `deliver <episode>` | Package and sha256 |
| Publish | A person publishes | AI declaration |
| Metrics | Edit `post/metrics.md` | Real export or blank |

## Exit codes

| Code | Meaning |
|---|---|
| 0 | Pass or ready for review |
| 1 | Incomplete or refused |
| 2 | Brief missing, stale, or doctor blocked |
| 3 | Quality gate, order, or duration refused |
| 4 | Render cap or lock refused |
| 5 | Beat clock refused |

## Branch

Use `main` for all changes. Do not create a feature branch. Push to `origin/main`. The remote default
is `main`.

## First episode

```bash
node studio/cli.mjs init-series /path/to/series
node studio/cli.mjs init-episode /path/to/series ep01
```

Fill the fact card and the brief. Run the brief checkpoint. Stop for a person.

## Draft preview

A draft preview needs an approved brief. It does not need voice. Use it to check the picture.

```bash
node studio/cli.mjs render <episode-dir> --mode draft --cut preview
```

## Full render

A full render needs stills, a voice trial, `CAPS.md`, and the render lock. It runs detached.
Check `render-status`.

## Delivery

`deliver` is the only publish path. It encodes the file, plays it in Chrome, checks the cover,
and writes `manifest.json` and `SHA256SUMS`. If a check fails, no package exists.

## Metrics

Paste the real export. Leave the sheet blank if you have no export. Do not estimate. A blank sheet
blocks the next episode.
