# knowledge-video-studio

A toolkit and method for fact-checked animated explainer videos. The toolkit covers research,
script, voice-over, render, and quality control. One browser pipeline draws every frame.

The project is not tied to one series, one language, or one model vendor. Use Cursor, Claude Code,
Codex, or another coding agent. The agent reads `CLAUDE.md`, `AGENTS.md`, and
`skills/produce-video/SKILL.md`. The agent stops at each human checkpoint.

## What you get

- A five-beat story method: hook, break the assumption, mechanism, payoff, audience stance.
- A fact card. It separates sources, episode numbers, and forbidden claims.
- A creative brief. A person must approve the brief before full voice or a full render.
- A voice-over lint for each language. It checks AI-flavored phrases, list reading, and sentence length.
- A speech-rate cap. The script holds for 0.9 seconds after a key number.
- One browser pipeline. It uses DOM/SVG, paused GSAP timelines, Lucide, sparse Lottie, and Three.js
  on demand. One WebGL post pass follows.
- `window.render(t)` and `window.seek(t)`. `--fps 30|60`. `--motion-blur 1-8`.
- Stills, shot thumbnails, a contact sheet, and a two-pass determinism check. They come before video.
- An XML prompt control in `studio/templates/prompt.xml`.
- A director scorecard. All nine axes must be at least 8. A person signs the scorecard.
- A fixed-size collection plan with `series status`, `series next`, and `series audit`.
- A v2 series style lock. A person approves the lock. An agent never fills its approval.
- A TTS adapter for Doubao. A dry-run provider is also available. No secret is in the repository.

## Quick start

```bash
npm install
npm test
node studio/cli.mjs layout
node studio/cli.mjs doctor
node studio/cli.mjs checkpoint tests/fixtures/sample-series/ep01 brief
node studio/cli.mjs render docs/demo/title-card --mode draft --cut preview --review-only
```

The fixture prints `BRIEF_APPROVED`. The fixture is test data. It is not a film.

Start a series outside this repository:

```bash
node studio/cli.mjs init-series /path/to/my-series
node studio/cli.mjs init-episode /path/to/my-series ep01
```

Fill `fact_card.md` and `brief.md`. Run `checkpoint <episode> brief` until you see
`BRIEF_READY_FOR_REVIEW`. Stop. A person approves the brief. An agent does not write
`status: approved`.

## Production path

| Stage | Gate |
|---|---|
| One thing | A person confirms the claim set |
| Fact card | Sources, numbers, and forbidden claims are complete |
| Brief | A person approves and hash-locks the brief |
| Stills | A person sees the stills and records the approval |
| Director scorecard | Every axis is at least 8; a person signs |
| Voice trial | A person hears the hook sample |
| Full render | A person sets `CAPS.md` and the phone pack is ready |
| Release | A person signs `qc/release.json` |
| Deliver | `deliver` builds the only publish package |
| Publish | A person publishes and ticks the AI declaration |
| Metrics | A person pastes the real export or leaves it blank |

A blank or unsourced `post/metrics.md` blocks the next episode.

## Commands

```bash
node studio/cli.mjs lint-script <script.md|lines.json>
node studio/cli.mjs fact-check <episode-dir>
node studio/cli.mjs director-review <episode-dir>
node studio/cli.mjs docs-lint
node studio/cli.mjs qc <episode-dir>
node studio/cli.mjs checkpoint <episode-dir> <brief|lines|hook-sample|stills|render|publish>
node studio/cli.mjs render <episode-dir> --mode draft|release [--cut preview|hook|full] [--fps 30|60] [--motion-blur 1-8] [--foreground]
node studio/cli.mjs deliver <episode-dir>
node studio/cli.mjs init-series <dir> [--collection --episodes 10]
node studio/cli.mjs series plan|status|next|lock|audit|deliver <series-dir>
```

## Branch

Use `main` for all changes. Do not create a feature branch.

## Compatibility

The JSON schema IDs keep the `storyweaver.` prefix. The prefix is a compatibility namespace.
Do not change it without a migration. The project name is `knowledge-video-studio`.

## Documentation language

The English documentation follows ASD-STE100. See `docs/ste100.md`. Run `node studio/cli.mjs docs-lint`
to check the mechanical rules.
