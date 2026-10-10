# 从 SVG 编译器迁到工作室

## 决定

2026-10-10：系列成片改走闸门。StoryWeaver 负责选题之后的事实卡、Phase A、口播 lint、QC 和批量生产的合同。画面交给现成渲染器的适配器。

证据是 EP01 复盘（`docs/studio/ep01-retrospective.md`）。v1 在没有分镜闸的情况下做完了整片，v2 把脚本、声音和画面几乎重做了一遍。同一时期，仓库里的 SVG 编译器把力气花在角色表演、接触和镜头上。那份编译器能稳定画出实验片，但它不是《看不见的规则》缺的那一层。

## 留下的路径

这些文件继续工作，CI 继续跑：

- `src/cli.js`、`src/renderers/svg.js`、`src/compiler.js`
- `examples/hot-air-balloon.json`
- `experiments/method-proof`
- `experiments/production-01-ai-video-is-not-ppt`
- `experiments/t01-english-colors`
- `specs/` 里的 VideoSpec 合同

`node src/cli.js render` 仍会产出实验 MP4。它在标准错误打印一行 `[legacy]`。说明见 `src/LEGACY.md` 和 `studio/render/adapters/legacy-svg.md`。

没有删这些目录。删掉会让已经通过的实验和测试失去对照，也让「以前为什么这样做」没处可查。

## 不再加的东西

不要为系列成片扩展 SVG 道具、物理手感或新的 VideoSpec 场景类型。不要把电梯、角色口播或事实卡塞进 `examples/*.json` 再渲一遍。

EP01 那种单集 Canvas 页面也不要再复制。共享元件只有名字和规则，在 `studio/render/kit/`。Manim、HTML Canvas、Remotion、HyperFrames 都还没安装。Remotion 仍然不是核心依赖，原因写在 `docs/11-technology-stack.md`。

## 新的一集走哪里

```text
series/<series>/epNN/fact_card.md
series/<series>/epNN/phase_a.md
series/<series>/epNN/script.md
        │
        ▼
node studio/cli.mjs gate <dir> phase-a
        │  等人批准
        ▼
hook sample → stills → adapter → qc → 人点发布 → post/metrics.md
```

旧文档 `docs/agent-contract.md`、`docs/architecture.md`、`tasks/production-task-list.md` 里的 VideoSpec 步骤只约束遗留实验。系列成片以本目录和 `.cursor/skills/produce-next-episode/SKILL.md` 为准。
