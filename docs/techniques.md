# Techniques

A technique is a method that helps some topics and hurts others. It is used where it fits best, never for its own sake. Universal gates apply to every episode; techniques apply only when chosen.

## Universal (every episode)

Quality standard (`docs/quality-standard.md`), series style lock (`docs/style-lock.md`), pace, text hold, render contract (`docs/render-contract.md`), glyph coverage, banned motion list, brief approval. Audience profiles (`studio/profiles/`) add gates that hold for every episode of that audience.

## Opt-in (chosen per episode)

| Id | Use when | Do not use when |
|---|---|---|
| `concept-machine` | The concept is a mechanism with moving parts; a physical analogy makes it visible | Feelings, habits, stories, definitions; the real object is already clear |
| `guess-before-reveal` | One answer the viewer can predict (often wrongly) | Open-ended topics; trick questions |
| `try-it-at-home` | A safe, cheap, quick household test exists | Only forced, risky, or costly activities exist |

The JSON file is the source of truth: `fits`, `avoid`, `brief_section`, `checks`.

## Choosing

Every brief has a required `## Approach`:

```markdown
## Approach

- Techniques: concept-machine
- Why: the rule is a hidden mechanism, and a moving machine makes its order visible.
```

`none` is a valid choice. Unknown ids, an empty list, or a missing why keep the brief at `BRIEF_INCOMPLETE`. For each chosen technique, paste its `brief_section.template` under its heading.

Checks with `stage: "brief"` run at `checkpoint <episode-dir> brief` and in QC item `techniques`; all checks, including `lines`-stage ones, run in `node studio/cli.mjs quality <episode-dir>` with source `technique:<id>`.

## Adding a technique

1. Add `studio/techniques/<id>.json` (schema `storyweaver.technique.v1`) with non-empty `fits` and `avoid`.
2. Reuse an existing check kind, or add one to `CHECKS` in `studio/techniques.mjs` with a test.
3. Add a row above. A method learned from outside material starts here, not as a universal gate; it becomes universal only after real episodes show it helps every topic.
