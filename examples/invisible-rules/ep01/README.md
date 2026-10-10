# EP01 · Why the elevator ignores you

Worked **counterexample**. This is the published v2 voice-over of the first Invisible Rules film. The toolkit keeps it so checkpoints can refuse it. It is not a template for the next episode.

| File | What it is |
|---|---|
| `script.md` | Spoken Chinese v2. Contains scaffold. Lint must fail. |
| `fact_card.md` | Production fact card. A/B/C present. Raw `sim/` results are not in this repo. |
| `brief.md` | Reconstructed “should have been” plan. `status: reconstructed`. Storyboard is empty. |
| `lines.json` | 25 spoken lines transcribed from the script. Not the original 27 TTS calls. |
| `post/metrics.md` | Playback fields blank. The retrospective said there were none. |
| `qc/checklist.json` | Human items pending |

There is no MP4, cover, or sprite sheet for this episode in the repository.

Do not copy this voice-over. Open a new folder from the templates:

```bash
node studio/cli.mjs init-episode examples/invisible-rules ep02
```

Expected:

```bash
node studio/cli.mjs lint-script examples/invisible-rules/ep01/script.md
# exit 1 — meta-plain-speech, scaffold-remember, scaffold-so-dash, oral-ordinal

node studio/cli.mjs checkpoint examples/invisible-rules/ep01 render
# exit 2 — BRIEF_REQUIRED
```
