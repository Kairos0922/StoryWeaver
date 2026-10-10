# Studio

系列成片的闸门、模板、lint、QC 和渲染合同。命令说明在仓库根目录 `README.md`。流程说明在 `docs/studio/pipeline.md`。

```text
studio/
  cli.mjs                 命令入口
  templates/              事实卡、Phase A、口播、指标
  lint/                   口播脚手架检查
  qc/                     清单与自动项
  contracts/              视觉合同、配音合同
  render/kit/             共享元件名，不是渲染器
  render/adapters/        Manim、Canvas、Remotion、HyperFrames、旧 SVG
```

一集的正文放在 `series/<series>/epNN/`，不放在这里。
