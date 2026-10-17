# Adapters

The core never imports a vendor SDK for speech. Rendering is not an adapter choice: there is one browser pipeline.

## TTS

`studio/tts/interface.mjs` loads `dry-run` or `doubao`.

| Provider | Variables |
|---|---|
| Doubao / Volcengine V3 | `VOLC_TTS_API_KEY` (or `DOUBAO_TTS_API_KEY`), or legacy `VOLC_TTS_APP_ID` + `VOLC_TTS_ACCESS_TOKEN`; optional `DOUBAO_TTS_SPEAKER`, `DOUBAO_TTS_ENDPOINT` |
| Dry run | none |

The Doubao adapter calls `https://openspeech.bytedance.com/api/v3/tts/unidirectional` (it retries `/sse` on 404/405) with `X-Api-Resource-Id: seed-tts-2.0`. A 2.0 speaker must end in `_uranus_bigtts`. See `docs/fact-check.md` for the claim gate that opens before TTS.

Rules every provider must keep:

- Read secrets from the environment only.
- Never log a key.
- Cache by hash of provider + voice + text + emotion + speech rate.
- Split caption `text` from spoken `tts_text`.
- Refuse a full batch until the hook sample has a human ear pass.
- Append `audio/usage.jsonl` with `chars` and `retake`, never the secret.

Voice audition: `node scripts/audition-doubao.mjs <out-dir>` synthesizes the same hook with three candidate speakers. It is a local, key-holding utility; it does not touch `lines.json` or the fact-check gate. It spends three short calls.

Cloud agents without keys stop at a silent draft preview. The machine that holds keys runs TTS, then the rest of the cut, from `handoff.json`.

## Render

Playwright captures `seek(t)` frames. ffmpeg encodes them. There is one browser pipeline.

Recommended picture stack:

| Layer | When |
|---|---|
| DOM / SVG | Type, layout, icons |
| GSAP | Motion. `paused: true`, then `timeline.seek(t)` or `totalProgress` from the pipeline clock. The ticker is slept |
| Lucide | Icons in the DOM stage |
| Lottie | Sparse. SVG renderer, `goToAndStop`, never `play()` |
| Three.js | Only a shot that asks for a `three` layer |
| WebGL post | Every frame. Grade, bloom, grain, vignette in `studio/render/browser/post.js` |

Remotion, Motion, and Rive are inspirations, not dependencies. Do not install them. `useFrame()`, `useCurrentFrame()`, `Sequence`, and `AbsoluteFill` in `studio/render/browser/dom/frame.jsx` are the local equivalents, keyed off the pipeline’s `t`. The pattern is `studio/render/browser/dom/README.md`.

`docs/demo/title-card/` is a 10 second tool fixture (no brief, no voice, Three.js unused). Doctor and a draft preview:

```bash
node studio/cli.mjs doctor --episode docs/demo/title-card --require-render
node studio/cli.mjs render docs/demo/title-card --mode draft --cut preview --review-only
```

Picture clock 2.5s, fail at 5s, hook sample about 12s. Draft and release frames are identical; the mode is in `render_report.json` and draft files end in `_draft`. A release needs a person’s sign-off in `qc/release.json`.

The legacy SVG path, and the unused Manim and HyperFrames notes, are deleted. Git history is the archive.
