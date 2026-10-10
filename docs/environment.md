# Environment

## Install

```bash
npm install
# HTML Canvas renders:
npx playwright install chromium
pip install numpy fonttools
# System tools (Debian/Ubuntu examples)
sudo apt-get install -y ffmpeg fonts-noto-cjk fonts-noto-cjk-extra
```

`node studio/cli.mjs doctor` checks Node ≥ 24, ffmpeg, Python 3, a browser, CJK fonts if you need them, Playwright, and whether TTS variables are **set**. It never prints a value.

## Variables

See `.env.example`. None of these belong in git, in a prompt, or in a cloud-agent chat.

| Name | Purpose |
|---|---|
| `TTS_PROVIDER` | `doubao` / `azure` / `elevenlabs` / `dry-run` |
| `VOLC_TTS_APP_ID` | Doubao application id |
| `VOLC_TTS_ACCESS_TOKEN` | Doubao access token |
| `VOLC_TTS_API_KEY` | Alternate Doubao key name some consoles use |
| `AZURE_SPEECH_KEY` | Azure Speech key |
| `AZURE_SPEECH_REGION` | Azure region |
| `ELEVENLABS_API_KEY` | ElevenLabs key |
| `CHROME` | Path to Chrome if Playwright’s Chromium is missing |
| `SW_FONT_400` … `SW_FONT_900` | Override font files; TTC files may need `SW_FONT_<w>_INDEX` |

## Split of labor

| Machine | May do |
|---|---|
| Any agent, no keys | Research, fact card, brief, lint, silent preview, stills |
| Machine with keys | Per-line TTS, hook sample mix, full mix |
| Person | Approve brief, hear hook, first-watch, stills, publish, paste metrics |

## Fonts

Embed files. Do not load a CDN face at 3 a.m. A missing glyph fails the job; the kit will not fall back to a system default silently.
