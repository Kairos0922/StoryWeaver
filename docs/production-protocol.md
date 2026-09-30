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
8. Interaction — actor/target ids, exact contact timing, target response, feedback, caused events and optional audio cue.
9. Review — contact sheet, motion strip, representative frames and media metadata.
10. Critique — three largest defects.
11. Structured Revision — repair affected shots/states/events only, then rerender.

## Hard rules

- A shot must have a meaningful state change.
- Shots must cover the complete runtime without gaps or overlaps.
- Every beat must be covered by at least one shot.
- Recurring characters and props use stable identities.
- Camera motion cannot substitute for acting or narrative change.
- Audio events and visual events share the same timeline; semantic interaction cues are resolved from the same event timestamp.
- Interacting actors and targets use explicit ids; ambiguous references are rejected.
- Causal event graphs must be acyclic; a caused event cannot start before its cause contact.
- Character and prop elements that participate in production are explicitly identified.
- Schema validity is necessary but never sufficient for release.
- Production review artifacts are part of the release gate.

## Gate

Run:

    npm run quality
    npm run method-proof
    npm run production-01

`quality` covers the automated contract suite, canonical validation and DirectorPlan validation. `method-proof` covers the repair loop. `production-01` performs an actual render, media inspection, interaction checks and review-artifact hard gates.

## Quality boundary

The protocol guarantees that creative intent is explicit, executable and reviewable. It does not guarantee artistic quality. Artistic quality still requires inspecting rendered media and performing structured revisions.
