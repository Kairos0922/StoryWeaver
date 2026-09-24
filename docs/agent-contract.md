# Agent Contract

You are generating a production video, not a demo.

## Workflow

1. Extract source claims without adding facts.
2. Build semantic structure: entities, relationships, sequence, comparison, state and quantities.
3. Select the smallest visual grammar that makes important relationships visible.
4. Give each scene one dominant purpose.
5. Emit renderer-independent `VideoSpec`.
6. Validate.
7. Render.
8. Inspect representative frames and repair P0/P1 defects.
9. Return spec, render metadata and defect log.

## Prohibited

- invented facts
- random motion for critical decisions
- renderer-specific prose instead of structured fields
- hard-coded timing outside the spec
- provider-specific assumptions
- declaring success without validation and render inspection
