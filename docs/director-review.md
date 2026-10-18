# Director review

A full encode costs time. Before the full encode, look at the stills, the shot thumbnails, and the
contact sheet. Fix each score below 8.

`node studio/cli.mjs director-review <episode-dir>` checks `qc/director_review.json`. An AI can
draft the scores and notes. A person must review the frames and sign `reviewed_by`. The tool rejects
a signer name that looks like an agent.

## Rubric

| Axis | Score 8 |
|---|---|
| `text_overlap` | No text hits a face, a hand, a caption, a card, or the platform UI |
| `focus` | One focal object for each screen. The reading order is clear |
| `pacing` | A new visual or a real change every 2 to 4 seconds |
| `motion` | Named tokens. No bounce, default fade, linear slide, or inline value |
| `legibility` | Phone first. Large type, high contrast, two caption lines at most |
| `loop` | No jump at the first frame, the last frame, a cut, or a beat |
| `style_law` | Palette, line, type, camera, and characters match the lock |
| `closure` | The end gives the claim and the action. No production slate or cast page |
| `audio_alignment` | Lines, beats, and captions agree. A silent demo notes "silent" |

A score of 8 is "ship after a small fix". A score of 10 is "nothing left to fix". Do not average a
low score with a high score. Any axis below 8 blocks the pass.

## Process

1. Run `stills <episode-dir>`.
2. Run `render <episode-dir> --mode draft --cut preview --review-only`.
3. Open the stills, the `thumbs/` folder, and `contact_sheet.png`. Check at phone size.
4. Fill `qc/director_review.json` with the frame paths, nine scores, and notes.
5. Fix the scene. Re-render the review sheets. Re-score. Do not re-score the same frames.
6. Run `director-review <episode-dir>` until you see `DIRECTOR_REVIEW_OK`.
7. A person signs `reviewed_by` and `reviewed_at`. Then you can plan the full render.

The review is a preflight. It is not the release signature. It is not a hard gate in `quality` yet.
The command and the checkpoint table enforce it. If it becomes a hard gate, add the fixture and the
migration in the same change.

## Template

`studio/templates/director_review.json` holds the template. `init-episode` copies it. The schema is
`storyweaver.director_review.v1`.
