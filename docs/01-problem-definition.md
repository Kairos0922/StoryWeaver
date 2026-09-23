# Problem Definition

## User Problem

The target user has structured information that should become a short explanatory video but does not want to manually design every scene, animation, camera movement, caption, and timing relationship.

Desired properties:
- understandable visual explanation;
- predictable structure;
- repeatable rendering;
- low marginal cost;
- efficient iteration;
- parameterization;
- batch generation.

## Why Generative Video Is Not the Default Solution

Generative video is optimized for unconstrained visual synthesis. Knowledge videos frequently require exact relationships, stable terminology, controlled timing, repeatable layouts, and deterministic edits.

The project does not assume generative video is universally unsuitable. It targets cases where structural control has higher value than unconstrained visual realism.

## Problem Decomposition

| Problem | Required capability |
|---|---|
| Content is difficult to translate into visuals | Semantic and visual planning |
| Similar concepts require repeated patterns | Reusable visual grammar |
| Timing changes are expensive | Explicit timeline |
| Captions and narration drift | Time-based synchronization |
| Visual edits cause unintended changes | Deterministic scene program |
| Large batches require consistency | Parameterized rendering |

## Non-Goals

The MVP does not attempt to solve:
- photorealistic character performance;
- open-ended cinematic direction;
- fully autonomous production for arbitrary genres;
- universal visual understanding;
- replacement of professional video editing software.
