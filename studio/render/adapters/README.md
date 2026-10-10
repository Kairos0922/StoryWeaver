# Render pipeline

StoryWeaver renders in the browser and encodes with ffmpeg. It does not write a physics engine, and it does not write a fresh page per episode. Episodes pass parameters to the shared kit.

The contract:

1. The same timeline renders the same pixels twice.
2. Text, caption safe areas, and embedded fonts can be checked.
3. Editing one beat does not require rewriting the episode page.
4. The license of every dependency allows production use. Three.js is the only 3D library.

| Piece | Role |
|---|---|
| [Browser pipeline](html-canvas.md) | Canvas 2D, SVG/DOM, and Three.js layers, then one WebGL post pass |
| `studio/render/kit/manifest.json` | Component names the kit can draw |
| `studio/render/browser/presets.json` | Color grade, bloom, grain, and vignette |

Run `node studio/cli.mjs render <episode-dir> --mode draft`. Doctor must pass first.
