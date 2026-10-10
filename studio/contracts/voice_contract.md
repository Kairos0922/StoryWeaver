# Voice contract

This file is the studio-wide voice rule set. A series may bind specific voices in its own `voice/` folder after a person has heard samples. Do not re-audition every episode.

This repository does not store secrets, does not call a TTS API from the CLI, and does not bake a vendor into `package.json`. Cache, usage logs, and voice IDs live on the machine that holds keys. See `docs/environment.md` and `studio/tts/`.

## Provider interface

Any adapter must:

1. Read credentials only from environment variables.
2. Never print a key or a token.
3. Cache by a hash of `(provider, voice, text, emotion, speech_rate)`.
4. Separate caption `text` from spoken `tts_text`.
5. Refuse a full-episode batch until the hook sample has a human ear pass.
6. Write usage to `usage.jsonl` (characters or bytes, not the secret).

Adapters shipped as contracts: Doubao / Volcengine, Azure Speech, ElevenLabs. Add another vendor by implementing `studio/tts/interface.mjs`.

## Roles (when a series uses characters)

| Role | Does | Does not |
|---|---|---|
| Audience stand-in | Ask, err, resist | Accept on the first try |
| Rule | State one rule | Read “first, second, third” |
| Number | Report one number | Stack a comparison in one sentence |

A series may rename the roles. It may not invent a fourth speaking persona in one episode without updating the series notes.

## Budget and cache

- Stay under 3000 spoken characters (or the series budget, if lower).
- Re-renders reuse the cache. Identical lines do not bill twice.
- Default `speech_rate` is a modest slowdown (try −10 to −15 on providers that support it). Measure on the hook sample. Do not guess a final rate.
- Emotion cues describe tone, not speed. “Speak fast” is a lint warning.

## Rejected defaults

Do not put a vendor back on the line after a person has rejected its sample, unless you run a new A/B and record the choice. Sample notes live in the series `voice/` folder. Do not commit WAV binaries unless they are a release asset and the size is acceptable.
