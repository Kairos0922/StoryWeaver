# System Architecture

StoryWeaver is a production compiler for short-form programmatic video. The recent Opus 5.5 examples change the emphasis: the winning artifact is not “code that draws things”; it is a finished visual narrative whose visual form is tightly coupled to the idea being communicated. Public examples include frame-by-frame JavaScript animation, music + art generated as code, pixel/riso-like animation, and agentic production workflows. These are evidence about capability and audience interest, not proof of universal performance. citeturn0search1turn0search2

## Pipeline

Source Content → Semantic Model → Story / Beat Plan → Visual Strategy → renderer-neutral VideoSpec → validate → deterministic render → inspect → MP4

## Layer boundaries

| Layer | Responsibility | Model dependency |
|---|---|---|
| Content | claims, entities, sequence, quantities, source traceability | model optional |
| Story | hook, beats, reveal order, pacing, ending | model useful |
| Visual strategy | visual metaphor, recurring motifs, composition, motion semantics | model useful |
| VideoSpec | typed, renderer-neutral implementation contract | model output |
| Renderer | geometry, timing, animation, transitions, rasterization, encoding | none |
| QA | schema, timeline, media inspection, representative frames | none |

The model must decide what the viewer should understand and see. The renderer must decide how that plan becomes pixels deterministically.

## Production principles

1. Artifact first: optimize for publishable media, not technical novelty.
2. Visual form follows meaning: motion should reveal, compare, transform, establish causality, or create a deliberate narrative beat.
3. Hook → progression → payoff: a scene list is not enough; the plan must contain an intentional viewing arc.
4. Stable visual grammar: reuse motifs, characters, typography and spatial conventions instead of redrawing them independently per scene.
5. Renderer-neutral contract: models emit structured intent and geometry, never renderer-specific prose.
6. Deterministic revision: a small content change should produce a localized diff.
7. Cost-aware intelligence: frontier models handle story/visual strategy and difficult repair; cheaper models handle constrained transformations; deterministic code handles everything mechanical.
8. Validation before aesthetics: a beautiful invalid video is a failed production artifact.

## Why programmatic rendering

Programmatic video is particularly suitable when content benefits from exact text, repeated geometry, synchronized timing, editable scenes, deterministic comparison, and cheap revisions. Public Opus 5.5 examples reinforce this direction: frame count does not itself require a separate LLM call when the model writes reusable drawing code; cost is driven more by the code/planning loop than by rendering every frame. citeturn0reddit6

It is not the default solution for photorealistic acting, natural human motion, or arbitrary cinematic footage.
