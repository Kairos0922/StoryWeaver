# T01 — Milo's Color Hunt

## Experiment goal

Validate StoryWeaver on a **story-driven English immersion animation for Chinese children ages 4–6**.

This is not a lesson UI and not a flashcard exercise. The child follows Milo's goal, search, false leads, discovery and payoff; English is embedded in the action.

## Story

Milo's little car is missing.

1. Milo searches the playroom.
2. A **red ball** is a false lead.
3. A **blue box** is empty.
4. A **yellow umbrella** points the story outside.
5. Milo follows little wheel tracks.
6. He finds another red-ball clue.
7. His **red car** is finally found under the yellow umbrella.
8. Milo drives away: "Let's go!"

Target language is intentionally limited to **red / blue / yellow** and the natural phrase **"It's ___."**

## Production

The renderer caches identical raster frames, so static story beats do not require one Resvg rasterization per 30fps frame.

`content-plan.json` → `VideoSpec` → validation → deterministic SVG renderer → FFmpeg → MP4

Audio is part of the production artifact:
- English story dialogue
- low-volume musical bed
- discovery / movement SFX
- final AAC audio stream

## Acceptance

1. The story is understandable without English audio.
2. There is a character goal, search, escalation, reveal and payoff.
3. No lesson-card sequence, explicit recall screen or "say it" prompt.
4. Target colors occur as story objects and dialogue, not isolated flashcards.
5. Milo remains visually consistent.
6. Final MP4 is 1280×720, 30 fps, 90 seconds.
7. Final MP4 contains an AAC audio stream with non-silent dialogue.
8. The published experiment page contains **only the video player**; Canvas interaction is not the deliverable.

9. Final media is decoded by FFmpeg before the experiment is accepted.

## Important limitation

The CI voice is deterministic `espeak-ng`. It validates the complete audio pipeline and timing, but it is **not** considered production-grade character voice acting. Voice quality is a separate future experiment; T01 must not hide this limitation.
