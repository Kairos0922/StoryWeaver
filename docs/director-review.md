# Director review (pre-export scorecard)

The full encode is expensive. Before it, look at the stills, the shot thumbnails, and the contact
sheet as a picky motion director, not as the person who wrote the scene. Fix anything below 8.

`node studio/cli.mjs director-review <episode-dir>` validates `qc/director_review.json`. An AI may
draft the scores and notes; a person must review the frames and sign `reviewed_by`. Agent-looking
names are rejected, like every other human gate.

## Rubric (0–10; every axis must be ≥ 8)

| Axis | What “8” means |
|---|---|
| `text_overlap` | No text collides with faces, hands, captions, cards, or the bottom platform UI. Every box has breathing room. |
| `focus` | One focal object per screen; the eye has a clear reading order. No two elements fight for first place. |
| `pacing` | A new visual or a meaningful change every 2–4 seconds. No stretch that is only a static card. |
| `motion` | Named tokens only; no bounce, default fade, uniform linear slide, or inline easing. Motion has continuity and a reason. |
| `legibility` | 9:16 phone first: large type, high contrast, no more than two caption lines, safe margins. |
| `loop` | First/last frame, cuts, and beat boundaries do not jump. A loop or a replay does not flash. |
| `style_law` | Palette, line, type, camera, and character rules match the series lock; no new color/font/character. |
| `closure` | The video ends on the knowledge claim and the viewer action, not a production slate or a cast lineup. |
| `audio_alignment` | When audio exists: lines, beat hits, and captions agree. Silent demos score the visual beat grid and note “silent”. |

A score of 8 is “shippable after a small fix”; 10 is “nothing left to fix”. Do not average away a
3 in text overlap with a 10 in palette. Any axis below 8 blocks the pass.

## Process

1. `node studio/cli.mjs stills <episode-dir>` and/or `node studio/cli.mjs render <episode-dir> --mode draft --cut preview --review-only`.
2. Open the stills, `thumbs/`, and `contact_sheet.png`. Review at phone size, not only on a desktop monitor.
3. Fill `qc/director_review.json`: frame paths, nine scores, notes for every score below 9.
4. Fix the scenes; re-render the review sheets; re-score. Do not re-score the same frames after a text-only promise to fix.
5. `node studio/cli.mjs director-review <episode-dir>` → `DIRECTOR_REVIEW_OK`.
6. A person signs `reviewed_by` / `reviewed_at`. Then a full render can be considered.

This is a preflight, not a substitute for the human release signature. It is not yet wired as a hard
gate in `quality`; the CLI and the checkpoint table are the enforcement. If it becomes a hard gate,
the fixture and migration go in the same change.

## Template

`studio/templates/director_review.json` is copied by `init-episode`. The schema is
`storyweaver.director_review.v1`.
