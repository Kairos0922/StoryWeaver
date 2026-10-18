# Environment

## Secrets

| Variable | Use |
|---|---|
| `TTS_PROVIDER` | `doubao` or `dry-run` |
| `VOLC_TTS_APP_ID` | Doubao application ID |
| `VOLC_TTS_ACCESS_TOKEN` | Doubao legacy token |
| `VOLC_TTS_API_KEY` | Doubao API key (`X-Api-Key`) |
| `DOUBAO_TTS_API_KEY` | Alias for the API key |
| `DOUBAO_TTS_SPEAKER` | Optional 2.0 speaker |
| `DOUBAO_TTS_ENDPOINT` | Optional endpoint |

Copy `.env.example` to `.env` on the machine that holds the keys. Never commit `.env`.

## Render

| Variable | Use |
|---|---|
| `CHROME` | Chrome path for capture and delivery |
| `SW_FONT_400` | Font file for weight 400 |
| `SW_FONT_500` | Font file for weight 500 |
| `SW_FONT_700` | Font file for weight 700 |
| `SW_FONT_900` | Font file for weight 900 |
| `SW_FONT_LIBRARY` | Optional OFL font library |
| `BLENDER` | Optional Blender path |

## Check

```bash
node studio/cli.mjs doctor
node studio/cli.mjs doctor --episode <episode-dir> --require-render
```

The doctor prints `set` or `unset`. It never prints a secret value. A missing render tool blocks a
render. A missing key blocks TTS only.

## Fonts

Use Noto Sans CJK SC by default. An optional OFL library font can come from the brief. Subset each
font to WOFF2 for each episode. Load fonts from local files. Do not use a CDN.

## Keys

A cloud agent without keys writes `handoff.json` and stops. The machine with keys runs TTS and the
render. Do not paste a key into a chat, a prompt, a file, or a log.
