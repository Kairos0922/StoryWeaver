# Canvas 静帧 kit

送审用的静帧出图工具。只出 PNG，不出视频，不接时间轴，不碰配音。它不是选定的成片适配器，选型标准仍在 `../../adapters/README.md`。

```bash
node studio/render/kit/canvas/render_stills.mjs <episode-dir> [shot-id]
```

- 输入：`<episode-dir>/render/stills.json`。一集只写镜头参数：图层、机位、字幕、角标。
- 输出：`<episode-dir>/stills/<shot-id>.png`，尺寸取 `size`。
- 依赖：本机 Chrome（默认 `google-chrome-stable`，可用 `CHROME` 环境变量改）和 Noto Sans CJK SC。同一份参数、同一台机器、同一套字体，出图逐字节一致。换字体或换 Chrome 版本会有像素差。

`kit.js` 只放可复用的画法：背景、收银台类服务点、队列、剪影路人、角色占位、大数字、印章、标签、箭头、「正」字计数、分屏、字幕和 AI 标识。集里的文字和数字只出现在 `stills.json`，数字必须来自该集事实卡。

## 角色是占位

`ip/` 的精灵没有入库。kit 里的等等、阿规、嘀嗒是按角色分工画的占位造型，不是正式形象。姿势名（`basket`、`shock`、`stomp`、`point_camera` 等）是 kit 的参数，不是精灵表情 id。精灵入库后应替换 `character` 的画法，而不是在单集里另画一套。

## 不做的事

- 不在单集目录放整页 HTML。临时页面每次由 `render_stills.mjs` 生成在系统临时目录。
- 不把静帧当作 `stills_four` 闸已通过。人看过之后才写 `qc/checklist.json`。
