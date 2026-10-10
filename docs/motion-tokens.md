# Motion tokens and motion QC

Numbers replace adjectives. Scenes reference names from `studio/motion/tokens.js`; they do not write inline curves or durations.

## Easings

| Token | cubic-bezier | Use |
|---|---|---|
| `outExpo` | 0.16, 1, 0.3, 1 | Text and logo entrances |
| `outQuint` | 0.22, 1, 0.36, 1 | Calm, premium entrances |
| `inOutQuart` | 0.76, 0, 0.24, 1 | Travel across the frame; camera moves |
| `inExpo` | 0.7, 0, 0.84, 0 | Fast exits |
| `outBack` | 0.34, 1.56, 0.64, 1 | Playful pop. Overshoots: position and scale only |

Entrances ease out, exits ease in. Exits are 40–50% shorter than the entrance (`exitDuration`). Linear is only for rotation, progress bars, and loop phase.

## Springs

`spring(t, zeta, freq)` is closed-form. Damping ratio presets (`DAMPING`): `critical` 1.0 (no overshoot), `premium` 0.8, `playful` 0.5, `cartoon` 0.25. Position and size may overshoot. Opacity and color may not: `springFor` clamps them to critical damping and `easingFor` refuses `outBack` on them.

## Durations and stagger

UI feedback 0.15 s, UI move 0.35 s, hero reveal 0.75 s. Stagger: letters 1 frame, words 0.09 s, list items 0.06 s. Start the next element when the previous one is 30–50% done.

## Beat grid

`beatFrame(n, bpm, fps) = round(n * 60 * fps / bpm)`, rounded per beat. Narrated episodes use voice cue times instead: `cueFrames(seconds, fps)`. Cut on a beat; change layout on a bar (every 4 beats or 4 lines), not every beat.

## Hierarchy

One hero action per shot. Secondary motion travels 50–70% of the hero and starts 100–200 ms later. Ambient motion stays under 5% of hero travel. Everything else waits, dims to 40%, or holds still.

## Motion QC

`node studio/cli.mjs motion-qc <motion.json> [--out <dir>]` reads values measured from a draft and writes `report.json`, `<track>.onion.svg`, and `<track>.speed.svg`. Fixture: `tests/fixtures/motion-qc/spec.json`.

| Field | Check | Threshold |
|---|---|---|
| `texts[] {id, text, hold_s}` + `language` | Text hold | en: 0.3 s/word + 0.5 s. zh: 0.27 s/char + 0.5 s (`1 / pace.comfortable_per_s` from `studio/lint/packs/zh.json`, calibrated against an approved episode’s narration pace) |
| `contrast[] {id, fg, bg}` | Contrast vs the worst background in any frame | ≥ 4.5:1 |
| `luminance[]` (per-frame mean relative luminance) | Flashes (WCAG general flash) | ≤ 3 per second |
| `sfx {events[] {id, frame}, peaks_s[] or audio}` | SFX sync, measured on the decoded mix | peak 0–2 frames after the picture event, target +1 |
| `tracks {id: [{frame, x, y, scale}]}` | Onion skin and speed graph; sharp speed changes listed as advisory | Ghosts should bunch near keys; speed curve should have no corners |

Read the onion skin: tight spacing near a key means easing is working; even spacing means linear. Read the speed graph: a flat line is linear, a corner is a hard start or stop.
