# Legacy SVG 适配器

状态：保留，只服务既有实验。

入口是 `node src/cli.js validate|render|inspect`。实现在 `src/renderers/svg.js`，用 resvg 把 SVG 光栅化，再用 FFmpeg 封装。热气球例子、method proof、production-01、t01 英语颜色实验都走这条路径。CI 继续跑它们，用来保证旧合同没有被这次改目录弄坏。

系列成片不要走这里。`src/cli.js render` 会在标准错误打一行 `[legacy]`，提醒闸门在 `node studio/cli.mjs`。

不要往 SVG 角色、道具或物理手感上加新能力来做《看不见的规则》。新的一集如果需要画面，先写 Phase A，再选 Manim、Canvas kit、Remotion 或 HyperFrames。迁移说明在 `docs/studio/migration.md`。
