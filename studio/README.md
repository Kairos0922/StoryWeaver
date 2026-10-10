# Studio

Checkpoints, templates, lint, QC, and render contracts. Commands are in the root `README.md`. The workflow is in `docs/workflow.md`.

```text
studio/
  cli.mjs                 command entry
  templates/              fact card, creative brief, voice-over, metrics
  lint/packs/             per-language AI-flavor and pace rules
  qc/                     checklist and automatic items
  contracts/              picture and voice rules
  tts/                    provider interface (no secrets)
  render/kit/             shared components, not a one-off page
  render/adapters/        HTML Canvas, Manim, Remotion, HyperFrames
```

Episode files live in `examples/<series>/epNN/` or any series folder you create. Do not put episode copy inside `studio/`.
