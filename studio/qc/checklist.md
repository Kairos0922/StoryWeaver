# QC checklist

Machine-readable items live in `checklist.json`. `node studio/cli.mjs qc <episode-dir>` scores an episode against that list.

Automatic items are decided from files. Setting them to `pass` in the episode overlay does nothing.

Human items start as `pending`. A pass needs all three:

```json
"status": "pass",
"checked_by": "a person’s name",
"evidence": "which hook clip / which stills"
```

`pass` without `checked_by` stays `pending`. A `checked_by` value that looks like an agent (`agent`, `bot`, `Claude`, `Grok`, `Opus`, `GPT`, `Cursor`) is rejected. Agents may write `agent_precheck` (ASR, pace, glyph coverage). That field never opens a checkpoint.

`pending` and `fail` block every stage listed in `blocks`. ASR scores, LUFS readings, and completion rates are not invented by this repository. Leave those items pending until a person heard the mix or a platform export exists.

The loudness target −16 LUFS is a pipeline contract, not a measurement of any checked-in file.
