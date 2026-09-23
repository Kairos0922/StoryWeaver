# Experiment 001 — Source Material

## Research question

Can an explicit semantic-to-visual planning layer produce a more faithful and explainable programmatic explainer than a general coding-agent baseline using the same renderer?

## Fixed narration script

**为什么热气球能升起来？**

热气球升空的关键，不是“气球里面有向上的力”，而是空气的浮力。

地球上的空气虽然看不见，但它有重量。周围的空气会对被它包围的物体产生浮力。浮力大小与物体排开的空气重量有关。

热气球下方的燃烧器加热气囊里的空气。空气受热后会膨胀，在气囊体积基本不变的情况下，气囊内部空气的密度会降低。因此，同样大小的气囊，里面装着的空气比周围冷空气更轻。

当气囊、吊篮和乘员的总重量小于周围空气对气囊产生的浮力时，热气球就会获得向上的净力并上升。

升空后，飞行员可以调节加热程度。加热增强时，气囊内空气通常更热、更轻，热气球的净升力会增大；停止加热后，空气逐渐冷却，净升力减弱，热气球可以下降。

这个过程可以概括为：

**加热空气 → 空气密度降低 → 气囊内空气质量减少 → 浮力超过总重量 → 热气球上升。**

## Production constraints

- Target duration: 45–60 seconds
- Output: 16:9 MP4
- Narration: use the fixed narration script above verbatim in both groups
- Captions: derive from the same fixed narration script and use the same timing source in both groups
- Renderer: same Remotion version and configuration
- Resolution: 1280×720
- No external generative video model
- Assets: deterministic primitives where practical
- Do not add factual claims absent from the source
