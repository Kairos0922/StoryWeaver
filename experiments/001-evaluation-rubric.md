# Experiment 001 — Evaluation Rubric

## Evaluation order

1. Verify both outputs pass the same technical acceptance bar.
2. Verify narration and captions are identical experimental inputs.
3. Measure objective production metrics.
4. Blind the two videos for human visual evaluation.
5. Record defects and correction actions separately from scores.

## Technical acceptance bar

Both outputs must have:
- valid MP4;
- 1280×720 resolution;
- 45–60 second duration;
- the exact fixed narration script;
- captions derived from the same script;
- no rendering defects;
- no missing or unintentionally overlapping scene content.

A failed technical acceptance bar is a defect, not a quality score.

## Primary measures

| Measure | Method |
|---|---|
| Content fidelity | Count factual errors, unsupported claims, and omitted primary claims |
| Explanatory clarity | Blind human rating, 1–5, using the same rubric |
| Visual relevance | Blind human rating, 1–5, for whether visuals clarify the narrated concept |
| Manual correction time | Minutes from first accepted render candidate to final accepted render |
| End-to-end production time | Wall-clock time from prompt start to final accepted render |

## Secondary measures

| Measure | Method |
|---|---|
| Render cost | Compute/API cost attributable to the experiment |
| Render time | Wall-clock time for final render |
| Reproducibility | Repeat final render from identical code/assets and compare file hash plus structural metadata |
| Batch consistency | Deferred to Experiments 002+ |

## Blinding

Rename outputs to neutral identifiers before human scoring. The evaluator should not know which output is baseline or treatment.

## Decision rule

Experiment 001 is a feasibility experiment, not a product verdict. Report every metric separately.

Do not claim a durable advantage from one example. A positive result means only that the hypothesis merits testing on additional topics. A negative or null result means the hypothesis needs revision or should be deprioritized.
