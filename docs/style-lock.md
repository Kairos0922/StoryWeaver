# Style lock

A series style lock keeps the episodes consistent. The lock lives in the series directory. The
repository holds the schema, the checker, and a fictional fixture.

## v1 keys

| Key | Content |
|---|---|
| `palette` | Named colors |
| `font` | Display and body font |
| `line` | Stroke width and cap |
| `camera` | Allowed moves |
| `motion` | Named tokens |
| `characters` | Character IDs |

## v2 keys

v2 adds these keys:

| Key | Content |
|---|---|
| `approval` | Person, date, hash |
| `rig` | Character rig hash |
| `voice` | Provider, voice ID, rate |
| `characters` | Voice and speech rules |
| `open` | Open marker template |
| `close` | Close marker template |
| `music` | Theme and license |
| `mix` | Loudness and true peak |
| `cover` | Cover template and fields |
| `glossary` | Banned variants |

v1 locks stay valid. A new collection uses v2.

## Commands

```bash
node studio/cli.mjs series lock <series> --from ep01
node studio/cli.mjs series lock <series> --check
node studio/cli.mjs style <episode-dir>
```

The first command writes a draft. A person fills the approval fields. An agent never fills them.
The second command checks the lock and the episode. The third command lists each deviation.

## Scene markers

Open, close, and cover are scenes in `scenes.json`. They are not a second renderer.

| Marker | Rule |
|---|---|
| Open | First scene, `role: "open"` |
| Close | Last scene, `role: "close"` |
| Cover | `cover.template` and `cover.fields` |
| Episode | `episode_number` and `episode_title` |

The lock checks the template ID and the sha256. A scene that does not match the lock fails.
