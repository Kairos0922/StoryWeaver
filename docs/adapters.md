# Adapters

The core does not import a vendor SDK. Rendering is not an adapter choice. One browser pipeline
draws each frame.

Remotion, Motion, and Rive are inspirations, not dependencies. The pipeline uses `seek(t)` and paused
GSAP timelines. Do not install them.

## TTS

`studio/tts/interface.mjs` loads `dry-run` or `doubao`.

| Provider | Variables |
|---|---|
| Doubao V3 | `VOLC_TTS_API_KEY` or `DOUBAO_TTS_API_KEY`; or legacy `VOLC_TTS_APP_ID` and `VOLC_TTS_ACCESS_TOKEN` |
| Doubao options | `DOUBAO_TTS_SPEAKER`, `DOUBAO_TTS_ENDPOINT` |
| Dry run | None |

The Doubao adapter calls the V3 HTTP unidirectional endpoint. It retries `/sse` after a 404 or 405.
It sends `X-Api-Resource-Id: seed-tts-2.0`. A 2.0 speaker must end with `_uranus_bigtts`.

The adapter reads secrets from the environment. It never logs a key. It caches by provider, voice,
text, emotion, and rate. It appends `audio/usage.jsonl` with the character count and the retake
flag. It does not write the secret.

Voice audition:

```bash
node scripts/audition-doubao.mjs <out-dir>
```

This tool makes three short samples. It does not touch `lines.json` or the fact check.

## Render

Playwright captures `seek(t)` frames. ffmpeg encodes the frames. There is one pipeline.

| Layer | Use |
|---|---|
| DOM/SVG | Type, layout, icons |
| Canvas 2D | Illustration, diagrams, particles with a seed |
| GSAP | Paused timelines moved by `seek(t)` |
| Lottie | Sparse icons or flourishes, `goToAndStop` |
| Three.js | A shot that declares a 3D layer |
| WebGL post | One pass: grade, grain, vignette, bloom |

## Rules

- Read secrets from the environment.
- Never log a key.
- Cache by content hash.
- Keep caption text separate from spoken text.
- Refuse a full batch until the hook sample passes.
- Append usage data without the secret.
- A cloud agent without keys stops at a silent draft.
