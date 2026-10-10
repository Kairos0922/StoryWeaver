# Adapters

The core never imports a vendor SDK for speech. Rendering is not an adapter choice: there is one browser pipeline.

## TTS

`studio/tts/interface.mjs` loads `dry-run` or `doubao`.

| Provider | Variables |
|---|---|
| Doubao / Volcengine | `VOLC_TTS_APP_ID`, `VOLC_TTS_ACCESS_TOKEN` (optional `VOLC_TTS_API_KEY`) |
| Dry run | none |

Rules every provider must keep:

- Read secrets from the environment only.
- Never log a key.
- Cache by hash of provider + voice + text + emotion + speech rate.
- Split caption `text` from spoken `tts_text`.
- Refuse a full batch until the hook sample has a human ear pass.
- Append `audio/usage.jsonl` with `chars` and `retake`, never the secret.

The Doubao file is a contract. It fails closed if keys are missing. A job you own can replace `synthesize()` with the real HTTP call without changing episode files.

Cloud agents without keys stop at a silent draft preview. The machine that holds keys runs TTS, then the rest of the cut, from `handoff.json`.

## Render

Playwright captures `seek(t)` frames. ffmpeg encodes them. A shot stacks Canvas 2D, SVG/DOM, and Three.js. Every frame runs the WebGL post pass in `studio/render/browser/post.js`.

Picture clock 2.5s, fail at 5s, hook sample about 12s. Draft frames are labeled `Not human-reviewed`. A release needs a person’s sign-off in `qc/release.json`.

The legacy SVG path, and the unused Manim, Remotion, and HyperFrames notes, are deleted. Git history is the archive.
