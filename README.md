# StoryWeaver

An AI-assisted toolkit and methodology for producing fact-checked animated explainer videos, from research and scripting to voiceover, rendering, and QC.

It is not tied to one series, one language, or one model vendor. Drop the repository into Cursor, Claude Code, Codex, or any other coding agent. The agent reads `AGENTS.md` and `skills/produce-video/SKILL.md`, then stops at every human checkpoint.

## What you get

- A five-beat story method (hook → break the assumption → mechanism → payoff → audience stance).
- A fact card that separates sources, this-episode numbers, and forbidden claims.
- A creative brief that a person must approve before full voice or a full render.
- Per-language voice-over lint (AI-flavored phrasing, list-reading, sentence length).
- Speech-rate caps and a required pause after a key number.
- Tool-agnostic TTS and render adapters. No secrets in the repo.
- A worked Chinese example series under `examples/invisible-rules/`.

## Quick start

```bash
npm install
npm test
node studio/cli.mjs layout
node studio/cli.mjs doctor
node studio/cli.mjs checkpoint examples/invisible-rules/ep02 brief
```

EP02 should print `BRIEF_APPROVED`. EP01 should refuse a render (`BRIEF_REQUIRED`): it is a historical counterexample, not a template.

Start a new episode in any series folder:

```bash
node studio/cli.mjs init-episode examples/invisible-rules ep03
```

Fill `fact_card.md` and `brief.md`. Run `checkpoint … brief` until you see `BRIEF_READY_FOR_REVIEW`. Stop. A person approves. Agents do not write `status: approved`.

## Production path

```text
One thing
  → Fact card (A sources / B numbers / C do-not-say)
  → Creative brief (viewer intuition, five-beat story, storyboard)
  → Human approval (hash-locked)
  → Voice-over lint
  → Hook sample (~12s) + first-watch comprehension
  → Four review stills
  → Full TTS (cached) → render adapter → mix
  → QC + human ear on number lines
  → Human publish + AI disclosure
  → Metrics review (blank if the export is missing)
```

Topic approval is not brief approval. Changing aspect, duration, or the five-beat structure voids the brief and sends the episode back.

## Commands

```bash
node studio/cli.mjs lint-script <script.md|lines.json>
node studio/cli.mjs qc <episode-dir>
node studio/cli.mjs checkpoint <episode-dir> <brief|lines|hook-sample|stills|render|publish>
node studio/cli.mjs hash-brief <brief.md>
node studio/cli.mjs init-episode <series-dir> <epNN>
node studio/cli.mjs pace <episode-dir>
node studio/cli.mjs layout
node studio/cli.mjs doctor
```

Exit codes: 0 pass or ready for review; 1 incomplete; 2 brief missing or stale.

## Layout

```text
AGENTS.md                 house rules for any coding agent
skills/produce-video/     step-by-step playbook
docs/                     methodology, workflow, adapters, lessons
studio/                   CLI, templates, lint packs, QC, TTS/render contracts
examples/invisible-rules/ worked Chinese explainers (spoken script stays Chinese)
tests/                    contract tests
```

## Secrets

None in git. Copy `.env.example` on the machine that synthesizes voice. Cloud agents without keys stop at a silent preview. `doctor` reports whether a variable is set. It never prints the value.

## Archive

The old SVG physics compiler, T01, the hot-air balloon fixture, method-proof, production-01, Vercel leftovers, and the parked Pages workflow were removed in this revision. Git history is the archive. See `CHANGELOG.md`.
