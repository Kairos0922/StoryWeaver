# Cast

Three roles reused across episodes. Jobs come from EP01 and the retrospective:

| Spoken name | Id | Job |
|---|---|---|
| 等等 | dengdeng | Audience stand-in. Asks, errs, resists. Pauses before accepting. |
| 阿规 | agui | States one rule. Does not read “first, second, third”. |
| 嘀嗒 | dida | Reports one number at a time. Also written 嘟嗒 in some dialogue. |

## Sprites

Sheets supplied by Kairos, 2026-10-10, in `sprites/src/`:

| File | Content |
|---|---|
| `sprites/src/lineup.svg` | Three-person lineup and scale (Dengdeng 1.0, Agui 1.0, Dida 0.95) |
| `sprites/src/agui.svg` | Agui: hero, four expressions, “arrow flips = change direction” |
| `sprites/src/dengdeng.svg` | Dengdeng: hero, four expressions, hop |
| `sprites/src/dida.svg` | Dida: hero, four expressions, overtime alarm |

`build_rig.py` splits the sheets into role-tagged primitives in `sprites/rig.json`. It does not invent shapes. An unassigned element fails the build.

```bash
python3 examples/invisible-rules/ip/build_rig.py          # rebuild after a sheet edit
python3 examples/invisible-rules/ip/build_rig.py --check  # fail if rig.json is stale
```

The shared kit’s `character` component draws only from `rig.json`.

## Frozen expression ids

Add, never rename.

| Character | ids (sheet label) | Default |
|---|---|---|
| Agui `agui` | `neutral` (hero), `smug`, `surprised`, `serious`, `wink` | `neutral` |
| Dengdeng `dengdeng` | `daily`, `anxious`, `aha`, `happy` | `anxious` (matches the hero) |
| Dida `dida` | `serious`, `smug`, `doubt`, `alarm` | `serious` (matches the hero) |

Agui’s “surprised” sheet has the arrow down. The rig stores the arrow separately with default `arrow_flip: 1`.

Moving parts:

- Agui: screen face; `arrow_flip` / `arrow_rot`; dashed belt.
- Dengdeng: egg-body `squash` / `hop`; hair `jitter`.
- Dida: needle brows (`brow`); tick progress (`ticks`); top button (`press`).

Do not invent a fourth speaking persona in one episode. Change this file first.
