# Series workflow

A series is a group of episodes. It lives outside this repository. The series can have a fixed
size, a style lock, and one delivery package.

## Collection

Create a collection with a fixed size:

```bash
node studio/cli.mjs init-series /path/to/series --collection --episodes 10
```

`collection.json` holds the slot list. Each slot has a title, a status, and a role.

| Command | Job |
|---|---|
| `series plan <series> --episodes 10` | Create or replace the plan |
| `series status <series>` | Show each slot and its stage |
| `series next <series>` | Show the next slot and the blocker |

`init-episode` marks the slot `in-progress`. It refuses a slot outside the plan. A blank or
unsourced `post/metrics.md` blocks the next slot.

## Style lock

The first episode can seed a v2 lock:

```bash
node studio/cli.mjs series lock <series> --from ep01
```

A person fills the approval fields. An agent never fills them. Check the lock with:

```bash
node studio/cli.mjs series lock <series> --check
```

## v2 lock keys

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

## Scene markers

Open, close, and cover are scenes in `scenes.json`. They are not a second renderer.

- `role: "open"` is the first scene.
- `role: "close"` is the last scene.
- `cover` holds the cover template and fields.
- `episode_number` and `episode_title` identify the episode.
- `bgm` holds the music ID.

## Audit

```bash
node studio/cli.mjs series audit <series>
```

The audit checks the lock, the plan, the style, the rig, the voice, the speech, the open and close
markers, the cover, the music, the mix, and the glossary. It exits with code 1 on a failure.

## Deliver

```bash
node studio/cli.mjs series deliver <series>
```

The command needs one package for each slot. It writes `index.json`, `SHA256SUMS`, `collection.md`,
`covers.html`, and each episode package. It refuses on an audit failure or a missing package.

## Order

Create one episode at a time. Review the metrics before you create the next episode. Do not create
a batch.
