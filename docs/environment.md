# Environment

## Install

```bash
npm install
npx playwright install chromium
pip install numpy fonttools
# System tools (Debian/Ubuntu examples)
sudo apt-get install -y ffmpeg fonts-noto-cjk fonts-noto-cjk-extra
```

`node studio/cli.mjs doctor` checks Node ≥ 24, ffmpeg, ffprobe, Python 3, Chromium, Playwright, and whether TTS variables are set. `doctor --episode <dir> --require-render` also requires font weights 400, 500, and 900, a loudnorm self-test, and a scene file whose expressions and gestures exist on the character rig. It never prints a secret.

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
