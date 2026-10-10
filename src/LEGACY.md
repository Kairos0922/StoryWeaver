# Legacy SVG compiler

`src/` is the original StoryWeaver path: a VideoSpec JSON file is validated, drawn as SVG, rasterized with resvg, and packed with FFmpeg. It includes acting, motion and contact so an experiment can render without a browser.

That path stays so existing experiments and CI keep running:

- `examples/hot-air-balloon.json`
- `experiments/method-proof`
- `experiments/production-01-ai-video-is-not-ppt`
- `experiments/t01-english-colors`

Series episodes do not start here. 《看不见的规则》 and later series go through `studio/` gates. See `docs/studio/migration.md`.

Do not add episode scenes, Chinese explainers, or new physics props to this compiler. A new visual need belongs in a render adapter after Phase A is approved.
