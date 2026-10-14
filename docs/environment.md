# Environment

## Install

```bash
npm install
npx playwright install chromium
npx playwright install chrome      # real Google Chrome: deliver plays the publish file in it
pip install numpy fonttools
# System tools (Debian/Ubuntu examples)
sudo apt-get install -y ffmpeg fonts-noto-cjk fonts-noto-cjk-extra
```

`node studio/cli.mjs doctor` checks Node ≥ 24, ffmpeg, ffprobe, Python 3, Chromium, Playwright, and whether TTS variables are set. `doctor --episode <dir> --require-render` also requires font weights 400, 500, and 900, a loudnorm self-test, and a scene file whose expressions and gestures exist on the character rig. It never prints a secret.

Missing `font-weight-500` / `font-weight-900` (install `fonts-noto-cjk-extra`) blocks every render, and with it the render tests: fix the machine, not the tests.

### Optional capabilities

A brief may only promise what this machine has proved. `doctor` lists each capability as ready or not; `doctor --verify <id>` runs its sample and records the result in `~/.cache/storyweaver/capabilities/<id>.json` (`SW_CAPABILITY_DIR` overrides).

| Capability | Install | Sample |
|---|---|---|
| `blender-3d` | Official Blender LTS Linux build from download.blender.org (verify its `.sha256`), unpacked under `/opt/blender/<version>`, `blender` on `PATH` or `BLENDER=/path/to/blender`. Runs headless (`-b`). | `studio/capabilities/blender_ring_sample.py`: 5 s ring road with 16 cars, 640×360, 8 samples, Cycles CPU by default (`--engine BLENDER_EEVEE` to test EEVEE). Re-run after upgrading Blender; a version mismatch marks it not ready. |

## Variables

See `.env.example`. None of these belong in git, in a prompt, or in a cloud-agent chat.

| Name | Purpose |
|---|---|
| `TTS_PROVIDER` | `doubao` or `dry-run` |
| `VOLC_TTS_APP_ID` | Doubao application id |
| `VOLC_TTS_ACCESS_TOKEN` | Doubao access token |
| `VOLC_TTS_API_KEY` | Alternate Doubao key name some consoles use |
| `CHROME` | Path to Chrome if Playwright’s Chromium is missing |
| `SW_FONT_400`, `SW_FONT_500`, `SW_FONT_900` | Override font files. TTC files may need `SW_FONT_<w>_INDEX` |

## Two machines

| Machine | May do |
|---|---|
| Cloud agent, no keys | Research, fact card, brief, lint, stills, `handoff.json` |
| Machine with keys | Hook recordings, duration prediction, listen pack, draft render, QC |
| Person | Approve the brief, hear the hook, first-watch, stills, release sign-off, publish, paste metrics |

`handoff.json` lists the commit, the commands, and the expected files. It does not contain secrets.

## Fonts

Embed files. Do not load a face from a CDN. A missing glyph fails the job.
