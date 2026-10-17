# StoryWeaver

An AI-assisted toolkit and methodology for producing fact-checked animated explainer videos, from research and scripting to voiceover, rendering, and QC.

It is not tied to one series, one language, or one model vendor. Drop the repository into Cursor, Claude Code, Codex, or any other coding agent. The agent reads `AGENTS.md` and `skills/produce-video/SKILL.md`, then stops at every human checkpoint.

## What you get

- A five-beat story method (hook → break the assumption → mechanism → payoff → audience stance).
- A fact card that separates sources, this-episode numbers, and forbidden claims.
- A creative brief that a person must approve before full voice or a full render.
- Per-language voice-over lint (AI-flavored phrasing, list-reading, sentence length). The episode language selects the pack.
- Speech-rate caps and a required pause after a key number.
- One browser render pipeline. DOM/SVG, GSAP seek, Lucide, sparse Lottie, Three.js on demand, then a WebGL post pass. Remotion, Motion, and Rive are inspirations, not dependencies. A TTS provider interface for Doubao or a dry run. No secrets in the repo.
- A fixed-size collection plan (`collection.json`, default 10 slots) with `series status/next`; episode folders are still created one at a time after the previous episode's sourced metrics.
- A v2 series lock that a first episode can seed (`series lock --from ep01`): visual keys, rig hash, voice identity, and the scene markers for intro/outro, music, mix, cover and glossary. A person approves the lock; an agent never fills its approval.
- `series audit` for cross-episode consistency (rig, voice, speech, open/close, cover, music, mix, glossary) and `series deliver` for one collection package with an index and checksums.
- Commands that create a series workspace outside this repository.

## Quick start

```bash
npm install
npm test
node studio/cli.mjs layout
node studio/cli.mjs doctor
node studio/cli.mjs checkpoint tests/fixtures/sample-series/ep01 brief
node studio/cli.mjs doctor --episode docs/demo/title-card --require-render
node studio/cli.mjs render docs/demo/title-card --mode draft --cut preview --review-only
```

The fixture should print `BRIEF_APPROVED`. It is test data, not a film.

Start a series outside this repository:

```bash
node studio/cli.mjs init-series /path/to/my-series
node studio/cli.mjs init-episode /path/to/my-series ep01
```

Fill `fact_card.md` and `brief.md`. Run `checkpoint … brief` until you see `BRIEF_READY_FOR_REVIEW`. Stop. A person approves. Agents do not write `status: approved`.

## Production path

```text
One thing
  → Fact card (A sources / B numbers / C do-not-say)
  → Creative brief (viewer intuition, five-beat story, storyboard, `requires:` capabilities)
  → Human approval (hash-locked) = storyboard approval
  → Voice-over lint (series per-character speech rules; blocks TTS)
  → Stills → person approves (qc/approvals.json, bound to the files)
  → Voice trial (hook recordings) → person approves → duration prediction
  → Full render: detached, one at a time, counted against CAPS.md
  → Human release sign-off → release render
  → `studio deliver` (the only publish package: encode, real-Chrome playback, cover at 320 px, sha256)
  → Human publish + platform AI-generated-content declaration
  → Metrics review (blank if the export is missing)
```

What each gate exists to stop (EP03 retro):

- **Delivery** is never "the render finished". `deliver` encodes the publish file (H.264 High@4.1, ≤30 MB, faststart, no soft subtitle track), plays it end to end and seeks it in real Google Chrome, measures the cover's glyph pixels at 320 px (a dark fill inside a dark outline fails), and writes `manifest.json` + `SHA256SUMS`. If anything fails there is no package. Hand over only `deliver/<stamp>/`, with its byte size and sha256 so a truncated download is caught.
- **Script register.** `series-style.json` holds each character's age, identity, and speech (`characters.<id>.speech`, `dialogue`). Lint flags written register: tidy parallel clauses (没…，没…，只能…), 不是…而是, 你知道吗, 其实, 总结, 首先, sentences longer than that character speaks, and too many tidy lines overall. TTS opens only through `openEpisodeTts`, behind checkpoint `lines`.
- **Spend.** Stills need the approved brief; a hook render needs approved stills; a full render needs approved stills and voice trial. `CAPS.md` (`MAX_FULL_RENDERS`, `APPROVED: <person> <date>`) is enforced by the renderer from `state/full_renders.jsonl`; raising it needs a new approval line. `state/render.lock` allows one hook/full render per episode (a dead PID is stale). Hook/full renders run detached and log to `out/logs/`; check with `render-status`.
- **Promises.** A brief or `acceptance.md` that mentions 3D/Blender must declare `requires: blender-3d`, and that capability must have a passing sample recorded by `doctor --verify blender-3d`. Otherwise the brief stage fails before any work.

Topic approval is not brief approval. Changing aspect, duration, or the five-beat structure voids the brief and sends the episode back.

## Commands

```bash
node studio/cli.mjs lint-script <script.md|lines.json>
node studio/cli.mjs qc <episode-dir>
node studio/cli.mjs checkpoint <episode-dir> <brief|lines|hook-sample|stills|render|publish>
node studio/cli.mjs hash-brief <brief.md>
node studio/cli.mjs init-series <dir> [--collection --episodes 10]
node studio/cli.mjs series plan <series-dir> --episodes 10
node studio/cli.mjs series status <series-dir>
node studio/cli.mjs series next <series-dir>
node studio/cli.mjs series lock <series-dir> --from ep01
node studio/cli.mjs series lock <series-dir> --check
node studio/cli.mjs series audit <series-dir>
node studio/cli.mjs series deliver <series-dir>
node studio/cli.mjs init-episode <series-dir> <epNN>
node studio/cli.mjs pace <episode-dir>
node studio/cli.mjs layout
node studio/cli.mjs doctor [--episode <dir>] [--require-render]
node studio/cli.mjs handoff <episode-dir>
node studio/cli.mjs resume <episode-dir>
node studio/cli.mjs predict-duration <episode-dir>
node studio/cli.mjs listen-pack <episode-dir>
node studio/cli.mjs doctor --verify blender-3d          # record a capability sample
node studio/cli.mjs stills <episode-dir>
node studio/cli.mjs approval-hashes <episode-dir> [--voice <file>]
node studio/cli.mjs render <episode-dir> --mode draft|release [--cut preview|hook|full] [--foreground]
node studio/cli.mjs render-status <episode-dir>
node studio/cli.mjs cover-check <episode-dir>
node studio/cli.mjs deliver <episode-dir>
node studio/cli.mjs git-sync <episode-dir>
```

Exit codes: 0 pass or ready for review; 1 incomplete or refused (stage order, caps, lock, delivery check); 2 brief missing or stale; 3 human review pending, a render is running (`render-status`), or the next collection slot is blocked by the previous metrics sheet (`series next`).

## Layout

```text
AGENTS.md                 house rules for any coding agent
skills/produce-video/     step-by-step playbook
docs/                     methodology, workflow, adapters, lessons
studio/                   CLI, templates, lint packs, QC, browser pipeline
tests/fixtures/           fictional episode used only by tests
docs/demo/title-card/     10s kinetic-type shot on the seek clock; not a series
tests/                    contract tests
```

## Secrets

None in git. Copy `.env.example` on the machine that synthesizes voice. Cloud agents without keys stop at a silent draft and write `handoff.json`. `doctor` reports whether a variable is set. It never prints the value.

## Archive

The old SVG physics compiler, T01, the hot-air balloon fixture, method-proof, production-01, Vercel leftovers, and the parked Pages workflow were removed in this revision. Git history is the archive. See `CHANGELOG.md`.
