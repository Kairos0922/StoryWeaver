# Adapters

The core never imports a vendor SDK. Adapters are contracts plus, where wired, a runner.

## TTS

`studio/tts/interface.mjs` loads `dry-run`, `doubao`, `azure`, or `elevenlabs`.

Required environment (see `.env.example`):

| Provider | Variables |
|---|---|
| Doubao / Volcengine | `VOLC_TTS_APP_ID`, `VOLC_TTS_ACCESS_TOKEN` (optional `VOLC_TTS_API_KEY`) |
| Azure Speech | `AZURE_SPEECH_KEY`, `AZURE_SPEECH_REGION` |
| ElevenLabs | `ELEVENLABS_API_KEY` |

Rules every adapter must keep:

- Read secrets from the environment only.
- Never log a key.
- Cache by hash of provider + voice + text + emotion + speech rate.
- Split caption `text` from spoken `tts_text`.
- Refuse a full batch until the hook sample has a human ear pass.

The shipped vendor files are contracts. They fail closed if keys are missing. A production job that you own can replace `synthesize()` with a real HTTP call without changing episode files.

Cloud agents without keys stop at a silent preview. The machine that holds keys runs TTS.

## Render

| Adapter | Status |
|---|---|
| HTML Canvas | Wired: stills, preview, hook, full |
| Manim | Contract only |
| Remotion | Contract only; not a core dependency |
| HyperFrames | Contract only |

Shared vocabulary: `studio/render/kit/manifest.json`. Picture clock 2.5s, fail at 5s, hook sample ~12s.

The legacy SVG / VideoSpec path is deleted. Git history is the archive.
