# Visual Grammar

Visual Grammar maps semantic structures to reusable visual patterns. It is a planning layer, not a renderer.

## Initial Rules

| Semantic pattern | Visual pattern | Default motion | Primary purpose |
|---|---|---|---|
| cause → effect | causal chain | reveal left-to-right | make dependency explicit |
| multi-step process | staged sequence | progressive reveal | expose order and transformation |
| before → after | state transition | morph/replace | show change |
| comparison | aligned split view | synchronized reveal | reduce comparison cost |
| quantity over time | chart + highlighted delta | progressive draw | show magnitude/change |
| hierarchy | nested/stacked layout | parent-first reveal | show containment |
| definition + example | concept → concrete instance | zoom/focus | connect abstraction to experience |

## Constraints

1. One scene should have one dominant explanatory purpose.
2. Visual elements must correspond to semantic references.
3. Motion must communicate structure, not decorate it.
4. Prefer deterministic primitives over generated imagery when the concept is abstract.
5. A visual pattern may be rejected when it cannot represent the source relationship faithfully.
6. Renderer-specific implementation must remain outside this document.

## Applicability

These rules are hypotheses for Experiment 001. They are not yet a production-standard visual language.
