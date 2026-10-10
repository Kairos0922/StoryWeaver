# Example series: Invisible Rules

A Chinese landscape explainer series used as a **worked example**. One episode teaches one everyday rule the viewer cannot see, and leaves one action.

Spoken lines stay in Chinese. Everything around them (this README, briefs, fact-card labels, CLI, tests) is English.

| Episode | Role in the toolkit |
|---|---|
| [EP01 · Why the elevator ignores you](ep01/README.md) | Counterexample. Published v2 script still has scaffold. Creative brief is `reconstructed`, so a render is refused. |
| [EP02 · One long line, or three short ones?](ep02/README.md) | Pipeline example. Brief approved (landscape 16:9). Shared kit, audio-driven timeline, silent preview. |

## Cast

- `ip/` — Dengdeng (audience stand-in), Agui (rule), Dida (number). Names in the spoken script are 等等 / 阿规 / 嘀嗒.
- `voice/` — production notes for one Doubao voice set. That is a series choice, not a toolkit default.

Picture rules: `studio/contracts/visual_contract.md`.  
Voice rules: `studio/contracts/voice_contract.md`.

## Start another episode

```bash
node studio/cli.mjs init-episode examples/invisible-rules ep03
```

Then fill the fact card and creative brief only. Stop at `BRIEF_READY_FOR_REVIEW`. Agents do not approve, do not publish, and do not invent playback numbers.

EP01 is the only recorded metrics exception. EP03 cannot open until EP02 has a sourced `post/metrics.md`.
