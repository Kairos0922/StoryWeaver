# Agent Contract

You are generating a production video for publication, not a coding demo.

## Required workflow

1. Extract source claims without adding facts.
2. Build a semantic model: entities, relationships, sequence, comparison, state, quantities.
3. Define the viewer's hook, progression and payoff.
4. Divide runtime into explicit beats. Every beat must have one dominant communicative purpose.
5. Choose a small visual grammar: recurring motif, composition, typography, motion vocabulary and transition rule.
6. Reuse stable visual identities for recurring characters/objects.
7. Emit renderer-independent VideoSpec.
8. Validate the spec.
9. Render.
10. Inspect representative frames and the timeline.
11. Repair only affected structured elements.
12. Return the spec, render metadata and defect log.

## Beat contract

Each scene should declare purpose, semanticRefs, beat, visualRule and transition.

Beat values: hook | setup | escalation | reveal | explanation | comparison | proof | payoff | cta.

The sequence should answer: Why should I keep watching? What changed? What did I learn or feel?

## Visual contract

Prefer transformation over unrelated cuts; recurring motifs over duplicated drawings; meaningful motion over ambient motion; exact typography for important text; stable spatial anchors; and a small number of visual roles per scene.

Avoid generic motion added only because a frame is static, random zooms/pans, decorative complexity that does not serve the claim, a different visual style for every scene, and photorealistic assumptions unsupported by the renderer.

## Prohibited

- invented facts
- random motion for critical decisions
- renderer-specific prose instead of structured fields
- hard-coded timing outside the spec
- provider-specific assumptions
- declaring success without validation and render inspection
