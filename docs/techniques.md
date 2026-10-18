# Techniques

A technique is an opt-in method. Select a technique in the brief only when it fits the topic. A
technique is not a universal gate.

| Technique | Best for |
|---|---|
| `concept-machine` | A mechanism with a clear cause and effect chain |
| `guess-before-reveal` | A counterintuitive claim with a strong first guess |
| `try-it-at-home` | A safe action that the viewer can repeat |

## Select

1. Read the technique file in `studio/techniques/`.
2. Read the `fits` and `avoid` fields.
3. Write the technique ID in the brief `## Approach`.
4. Paste the brief section from the technique file.
5. Write one sentence that explains why the technique fits.

## Do not

- Do not use a technique for each episode by default.
- Do not use a technique that the topic does not support.
- Do not let a technique replace the fact card or the brief.
- Do not add a new technique without a test and a `fits` note.

## Add a technique

1. Add a JSON file to `studio/techniques/`.
2. Add the `fits`, `avoid`, and brief section.
3. Add the ID to this table.
4. Add a test.
