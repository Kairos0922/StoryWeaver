# Production Protocol

StoryWeaver uses a director-first workflow. A renderer never invents creative intent.

## Required artifacts

1. Reference — source material and reusable constraints.
2. Style Guide — palette, typography, composition, motion language and recurring identities.
3. Story — hook, progression and payoff.
4. Beat Sheet — timed communicative purposes.
5. Shot List — every shot has start state, end state and dominant action.
6. Timeline — beat/audio/visual/camera/transition events share one time axis.
7. Animation Program / VideoSpec — executable rendering contract.
8. Review — contact sheet, motion strip, representative frames and media metadata.
9. Interaction — actor/target ids, exact contact timing, target response, feedback, caused events and optional audio cue.
10. Review — pre/contact/post frames, contact sheet, phone-size frames, frame-step viewer and media metadata.
11. Critique — three largest defects.
12. Structured Revision — repair affected shots/states/events only, then rerender.

## Hard rules

- A shot must have a meaningful state change.
- Shots must cover the complete runtime without gaps or overlaps.
- Every beat must be covered by at least one shot.
- Recurring characters and props use stable identities.
- Camera motion cannot substitute for acting or narrative change.
- Audio events and visual events share the same timeline; semantic interaction cues are resolved from the same event timestamp.
- Interacting actors and targets use explicit ids; ambiguous references are rejected.
- Causal event graphs must be acyclic; a caused event cannot start before its cause contact.
- Schema validity is necessary but never sufficient for release.

## Gate

Run `npm run validate-production`, then `npm test`, then `npm run production-01`.

`validate-production` proves the director plan is structurally complete. `production-01` consumes that plan before rendering.

## Quality boundary

The protocol guarantees that creative intent is explicit, executable and reviewable. It does not guarantee artistic quality. Artistic quality still requires inspecting rendered media and performing structured revisions.
