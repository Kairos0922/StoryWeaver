# Experiment Plan

## Research Question

Does explicit semantic-to-visual planning provide measurable value over direct agent-generated scene code?

## Experimental Groups

### Baseline

General coding agent → Remotion → Video

### Treatment

Semantic Model → Visual Grammar → Scene Program → Remotion → Video

Use the same source content, renderer, media constraints, and target duration.

## Test Set

Start with five knowledge topics representing:
1. causal explanation;
2. process explanation;
3. comparison;
4. quantitative change;
5. multi-step mechanism.

## Measurements

| Metric | Method |
|---|---|
| Content fidelity | factual and structural review |
| Explanatory clarity | blinded human evaluation |
| Visual relevance | scene-to-content annotation |
| Manual correction | tracked editing time |
| Production time | wall-clock measurement |
| Render cost | measured compute/API cost |
| Reproducibility | repeated builds from identical inputs |
| Batch consistency | repeated generation across topics |

## Controlled Variables

Keep constant where practical:
- source content;
- target duration;
- narration;
- caption text;
- renderer;
- output resolution;
- asset constraints;
- evaluation rubric.

## Decision Rule

Proceed if the treatment demonstrates a repeatable improvement on primary production metrics without disproportionate system complexity.

Do not proceed merely because one example looks better.

## Next Experiment

After the first controlled comparison, identify which semantic primitives contribute measurable value. Remove primitives that do not improve outcomes.
