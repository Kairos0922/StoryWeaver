# StoryWeaver Animation Architecture

## 1. Purpose

StoryWeaver is a deterministic code-video compiler. Its core unit is not a drawable Scene but a narrative Shot whose visual change is described by an explicit action timeline.

The production pipeline is:

Content → Story → Storyboard → VideoSpec → Animation Grammar → Renderer → FFmpeg → Review

## 2. Layer boundaries

### Content
Defines source material and semantic claims. It does not define animation.

### Story
Defines narrative intent: goal, obstacle, escalation, reveal, payoff.

### Storyboard
Defines the viewer experience: Shot purpose, viewer reads, key poses, events and timing, camera intent, transition, and audio timing.

### VideoSpec
The executable, renderer-independent representation of the storyboard.

A Shot contains: start/end, purpose/semanticRefs, reads, keyPoses, events, camera, transition, elements, captions/audio references.

### Animation Grammar
Converts semantic actions into deterministic motion.

Core character actions: lookAt, turn, walk, run, stop, crouch, reach, grab, lift, open, close, point, react, celebrate, drive.

Actions should normally expose the timing grammar:

anticipation → action → reaction → settle

Continuous actions such as walking/running may use a continuous phase.

### Character / Prop
Actors are stateful visual entities, not static SVG pictures.

Character state includes identity, pose, expression, gaze, gesture, and secondary motion.

### Renderer
Only translates VideoSpec + Animation Grammar into deterministic frames. The renderer must not invent narrative intent.

### FFmpeg
Only handles encoding and media composition.

### Review
Visual correctness is a first-class quality gate. Code/schema validity is necessary but not sufficient.

Review artifacts: key-pose sheet, contact sheet, motion strip, selected close-ups, audio timing report.

## 3. Shot design rule

Every shot must answer:

What changes between the beginning and the end of this shot?

A shot that only presents a static composition without a meaningful state change is not an animation shot.

## 4. Animation quality rules

1. Prefer causal action chains over independent motions.
2. Use anticipation before significant actions.
3. Use reaction after discoveries or impacts.
4. Use follow-through/settle instead of abruptly stopping motion.
5. Use camera movement to support attention, not to substitute for acting.
6. Keep character identity stable while allowing pose/expression changes.
7. Use secondary motion to keep the world alive.
8. Prefer fewer meaningful actions over many decorative effects.

## 5. Review loop

Generate → Render → Inspect → Diagnose → Modify → Render again.

The system is considered production-ready only when the rendered video, not merely its source JSON, passes review.
