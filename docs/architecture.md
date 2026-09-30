# StoryWeaver Production Architecture

## 1. Purpose

StoryWeaver is a model-agnostic code-video production system. Its job is to make an Agent's creative work repeatable, inspectable and renderable; it is not a renderer disguised as a creative system.

The production pipeline is:

Reference → Style Guide → Story → Beat Sheet → Shot List → Animation Program / VideoSpec → Deterministic Render → Review → Critique → Structured Revision → Render

A model provider may change. The production contract remains stable.

## 2. Layer boundaries

### Reference
Optional source material that establishes visual or product truth. The system extracts reusable style and identity constraints instead of copying a provider-specific prompt.

### Story
Defines the viewer promise, goal, obstacle, escalation, reveal and payoff.

### Storyboard
Defines beat timing, shot purpose, viewer reads, key poses, causal actions, camera intent, transition and audio timing.

### Animation Program / VideoSpec
The executable representation of the storyboard. It must expose state changes and timing explicitly enough for deterministic rendering and targeted repair.

VideoSpec is an execution contract, not the place where creative intent is invented.

### Animation Runtime
Provides reusable semantic motion primitives and deterministic state evaluation. Characters, props, cameras and interactions share one time axis. Interaction contracts resolve contact timing, target response, feedback, causal handoff and semantic audio cues.

### Animation Grammar
Provides reusable semantic motion primitives such as lookAt, turn, walk, run, reach, grab, lift, open, close, point, react, celebrate and drive.

### Renderer
Only translates the executable plan into deterministic frames. It must not invent narrative intent.

### Review
Review is part of production, not a postscript.

Required loop:

Generate → Render → Inspect → Diagnose → Modify → Render again

Interaction review additionally checks the frame immediately before contact, the contact frame and the first response frames.

Review artifacts include key-pose sheets, contact sheets, motion strips, selected close-ups and media metadata.

## 3. Model portability

StoryWeaver does not require Claude Opus 5.5 or any other specific model.

The model is responsible for:
- source understanding;
- story and visual decisions;
- storyboard creation;
- animation-program generation;
- diagnosis and revision.

StoryWeaver is responsible for:
- stable contracts;
- validation;
- deterministic rendering;
- media inspection;
- review artifacts;
- reproducible revision.

A provider-specific workflow may be used as an experiment, but provider-specific assumptions must not leak into the core architecture.

## 4. Shot design rule

Every shot must answer:

What changes between the beginning and the end of this shot?

A shot that only presents a static composition without a meaningful state change is not an animation shot.

## 5. Animation quality rules

1. Prefer causal action chains over independent motions.
2. Use anticipation before significant actions.
3. Use reaction after discoveries or impacts.
4. Use follow-through/settle instead of abrupt stops.
5. Use camera movement to support attention, not to substitute for acting.
6. Keep character/object identity stable while state changes.
7. Use secondary motion to keep the world alive.
8. Prefer fewer meaningful actions over decorative effects.

## 6. Production quality gate

A source file passing schema validation is not sufficient.

A production candidate must also:
1. render successfully;
2. pass media inspection;
3. produce review artifacts;
4. record diagnosed defects;
5. apply structured repairs;
6. rerender successfully.

The Method Proof under experiments/method-proof is the canonical small-scale demonstration of this loop.
