# {{series}}

This directory is a series workspace. It is not part of the knowledge-video-studio tool repository. It can be its own git repository.

Episodes are folders named `ep01`, `ep02`, and so on. Create the next one from the tool checkout:

```bash
node studio/cli.mjs init-episode <this-directory> epNN
```

The video language is set per episode in `brief.md` and `lines.json`. A blank `post/metrics.md` on the previous episode blocks the next one. Do not invent playback numbers.

Do not copy approval fields or checklist signatures from the tool’s test fixture.
