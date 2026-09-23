# Experiment 001 — StoryWeaver Treatment Prompt

Use the following prompt with the same coding agent/model and renderer.

> Create a 45–60 second 1280×720 educational explainer video from the supplied source text.
>
> First construct a Semantic Model using `specs/semantic-model.schema.json`.
>
> Then map semantic relationships to visual structures using the rules in `specs/visual-grammar.md`. Every explanatory scene must declare the semantic references and visual rule it represents.
>
> Then construct a renderer-independent Scene Program using `specs/scene-program.schema.json`. Only after the Scene Program is complete should you implement it in Remotion.
>
> Use simple deterministic visual primitives where practical. Motion must communicate the semantic relationship rather than act as decoration. Keep one dominant explanatory purpose per scene.
>
> Narration wording and caption timing must remain identical to the baseline. Do not introduce factual content that is absent from the source.
>
> Source material: `experiments/001-source.md`
