# Changelog

## 0.6.0 — 2026-10-10

Professionalization of StoryWeaver as a general, portable toolkit.

### Added

- Root playbook `skills/produce-video/SKILL.md` and an English `AGENTS.md` that any coding agent can follow.
- Creative brief (replaces “Phase A”), with a required viewer-intuition table.
- Per-language voice-over lint packs (`studio/lint/packs/en.json`, `zh.json`).
- Speech-rate command `node studio/cli.mjs pace` and a pause-after-key-number rule.
- Claim-precision check (average / individual / fairness / tail-risk / proportion).
- First-watch comprehension item; agents cannot sign human checks.
- `doctor` command and `.env.example` (presence only; no secrets).
- TTS provider interface for Doubao, Azure Speech, and ElevenLabs.
- Worked examples moved to `examples/invisible-rules/`.

### Removed

Git history remains the archive. Deleted from the tree:

- Legacy SVG physics compiler (`src/`, VideoSpec schemas, `@resvg/resvg-js`, `text2wav`).
- Experiments: T01 English colors, hot-air balloon fixture, method-proof, production-01.
- Vercel leftovers and the parked GitHub Pages workflow / static-site builder.
- Stale product docs (`docs/00`–`12`, competitive landscape, Opus-5.5 case notes).
- Dead tests that only covered the SVG path and T01.

### Renamed

- “Gate / 闸门” as branding → approval **checkpoint**.
- “Phase A” → **creative brief** (`brief.md`).
- Series working copy `series/invisible-rules/` → `examples/invisible-rules/`.

### Notes

Spoken Chinese in the Invisible Rules examples is kept. Structural docs, templates, CLI messages, and comments are English.
