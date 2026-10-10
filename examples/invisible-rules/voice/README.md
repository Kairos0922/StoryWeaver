# Voice notes (this series)

This series uses `studio/contracts/voice_contract.md`. The chosen engine was Doubao seed-tts-2.0-expressive after a person heard samples. ChatTTS and CosyVoice samples were rejected. The audition notes are not in this repo. Do not re-open a bake-off from memory.

That vendor is a series choice. The toolkit’s default is “whatever `TTS_PROVIDER` names on the machine that holds keys”.

## Character → voice (production note)

Source: Kairos in chat, 2026-10-10, from EP02 on. EP01 binding was not recorded (`ep01/lines.json` keeps `binding: unrecorded`).

| Character | Vendor voice | Direction |
|---|---|---|
| 阿规 | 解说小明 | Calm, dry humor |
| 等等 | 少年梓辛 | Impatient. Urgency is tone, not speed. |
| 嘀嗒 | 知性灿灿 | Clear. One number at a time. |

Per-line tone lives in that episode’s `lines.json` `emotion` field. It is a draft.

## Handoff

Synthesize outside the repo. Drop files at `<episode>/audio/line_01.wav` and up. WAVs are not in git.

This folder does not hold keys or a caller script. The studio CLI does not request a TTS API. See `.env.example`.
