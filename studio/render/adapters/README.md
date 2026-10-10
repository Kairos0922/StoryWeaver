# Render adapters

StoryWeaver does not write a physics engine, and it does not write a fresh Canvas page per episode. An adapter consumes a timeline that has already passed the checkpoints and draws the components named in `studio/render/kit/manifest.json`.

There is no declared default adapter. Choose one with four tests:

1. The same timeline renders the same pixels twice.
2. Text, caption safe areas, and embedded fonts can be checked.
3. Editing one beat does not require rewriting the episode page.
4. The license allows production use. Review the license before adding a dependency. Remotion stays out of `package.json` unless a later decision records a license conclusion.

HTML Canvas is wired (see the Invisible Rules examples). Wiring is not a bake-off. Do not announce a winner without a timed comparison.

| Adapter | Use |
|---|---|
| [HTML Canvas](html-canvas.md) | Shared `seek(t)` kit, Playwright stills and frames |
| [Manim](manim.md) | Numbers, axes, proof steps |
| [Remotion](remotion.md) | React timeline; not a core dependency |
| [HyperFrames](hyperframes.md) | Evaluate before adopting |

Deleted from this tree: the legacy VideoSpec → SVG path. Git history is the archive.
