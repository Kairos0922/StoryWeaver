# Experiment 001 — StoryWeaver Treatment Prompt

Use the following prompt with the same coding agent/model and renderer as the baseline.

> Create a 45–60 second 1280×720 educational explainer video from `experiments/001-source.md`.
>
> **Narration and captions are fixed experimental inputs. Do not rewrite, summarize, reorder, or regenerate the narration. Use the fixed narration script in the source verbatim and derive captions from that same script.**
>
> First construct a Semantic Model using `specs/semantic-model.schema.json`.
>
> Then map semantic relationships to visual structures using `specs/visual-grammar.md`. Every explanatory scene must declare the semantic references and visual rule it represents.
>
> Then construct a renderer-independent Scene Program using `specs/scene-program.schema.json`. Only after the Scene Program is complete should you implement it in Remotion.
>
> Use simple deterministic visual primitives where practical. Motion must communicate the semantic relationship rather than act as decoration. Keep one dominant explanatory purpose per scene.
>
> Do not introduce factual content that is absent from the source.
>
> Produce the complete renderable implementation. Do not spend effort on a custom rendering engine or unrelated infrastructure.
