# T01 — Milo's Color Hunt

## Experiment goal

Validate StoryWeaver on a real 4–6-year-old English-initiation animation rather than a coding demo.

## Learning design

- Target vocabulary: **red / blue / yellow**
- Sentence frame: **It's ___**
- Sequence: invitation → visual reveal → response pause → model sentence → spaced repetition → recall → payoff
- Runtime: 90 seconds
- Format: 1280×720, 30 fps
- Recurring character: `milo`

## Production path

`content-plan.json` → `src/compiler.js` → `video-spec.json` → `src/validate.js` → `src/render.js` → MP4 → GitHub Pages

Voice is generated during CI and muxed into the MP4 for this experiment.

## Acceptance

1. Content Plan compiles and validates.
2. Scene timeline has no gaps or overlaps.
3. All recurring character instances use `characterId: milo`.
4. Only the three target color words are introduced.
5. Question → response pause → model answer is represented for each color.
6. Representative frames are checked by the production workflow.
7. Final MP4 is playable and inspected by FFmpeg.
8. No P0/P1 defects remain before the experiment is marked complete.

## Known experiment limitation

The voice uses a deterministic local TTS engine in CI. This validates timing and audio integration, not final voice acting quality. A later experiment can compare child-friendly voices separately.
