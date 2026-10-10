# Agent Contract

> Series episodes follow `.cursor/skills/produce-next-episode/SKILL.md`. Do not render a full episode from this legacy VideoSpec contract. The steps below apply to the fenced SVG compiler only.

You are generating a production video for publication, not a coding demo.

## Required workflow

Before generating VideoSpec, emit a DirectorPlan containing Reference, Style Guide, Story, Beat Sheet, Shot List, Timeline and Review contract. The DirectorPlan is validated independently; do not skip it for small productions.

1. Extract source claims without adding facts.
2. Build a semantic model: entities, relationships, sequence, comparison, state and quantities.
3. If references exist, extract a reusable style guide and identity constraints.
4. Define the viewer's hook, progression and payoff.
5. Divide runtime into explicit beats. Every beat has one dominant communicative purpose.
6. Create a shot list. Every shot states its beginning state, end state and causal action; the list must cover the runtime without gaps or overlaps.
7. Choose a small visual grammar: recurring motif, composition, typography, motion vocabulary and transition rule.
8. Reuse stable visual identities for recurring characters and objects.
9. Emit an executable, renderer-independent animation plan only after the DirectorPlan is structurally valid.
10. Validate the plan.
11. Render.
12. Inspect representative frames, contact sheets and timeline/media metadata.
13. Record the three largest defects.
14. Repair only affected structured elements.
15. Rerender and verify the repaired result.

## Beat contract

Each scene should declare purpose, semanticRefs, beat, visualRule and transition.

Beat values: hook | setup | escalation | reveal | explanation | comparison | proof | payoff | cta.

The sequence should answer: Why should I keep watching? What changed? What did I learn or feel?

## Shot contract

Every shot must make the state change explicit:

- start state
- end state
- dominant action
- actor and target when relevant
- timing / phases
- viewer read

A camera move alone is not a narrative beat.

## Visual contract

Prefer transformation over unrelated cuts; recurring motifs over duplicated drawings; meaningful motion over ambient motion; exact typography for important text; stable spatial anchors; and a small number of visual roles per scene.

Avoid generic motion added only because a frame is static, random zooms/pans, decorative complexity that does not serve the claim, a different visual style for every scene, and provider-specific assumptions.

## Provider neutrality

Do not assume Claude, GPT, Gemini or any other specific provider.

The production method must remain valid if the model is replaced.

## Prohibited

- invented facts
- random motion for critical decisions
- renderer-specific prose instead of structured fields
- hard-coded timing outside the executable plan
- provider-specific assumptions
- declaring success without validation, render inspection and defect review
