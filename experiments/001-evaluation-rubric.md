# Experiment 001 — Evaluation Rubric

## Primary measures

| Measure | Method |
|---|---|
| Content fidelity | Count factual errors, unsupported claims, and omitted primary claims |
| Explanatory clarity | Blind human rating, 1–5, using the same rubric for both outputs |
| Visual relevance | Blind human rating, 1–5, for whether visuals clarify the narrated concept |
| Manual correction time | Minutes required to reach the predefined acceptance bar |
| End-to-end production time | Minutes from prompt start to accepted render |

## Secondary measures

| Measure | Method |
|---|---|
| Render cost | Compute/API cost attributable to the experiment |
| Render time | Wall-clock time for final render |
| Reproducibility | Re-run from identical inputs and compare output hashes and structural metadata |
| Batch consistency | Repeat the same workflow on additional source topics after Experiment 001 |

## Blinding

The evaluator should not know which output is baseline or treatment during clarity/relevance scoring.

## Acceptance bar

Both outputs must first satisfy the same minimum technical requirements: valid MP4, target duration, readable captions, synchronized narration, and no rendering defects.

Experiment 001 is exploratory. No arbitrary composite score or single "winner" is defined in advance. The result should report each measure separately and determine whether the treatment shows a repeatable advantage worth testing on additional topics.
