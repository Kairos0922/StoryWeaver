# HTML Canvas 适配器

状态：已接线，EP02 先用。入口和参数见 `studio/render/kit/canvas/README.md`。这不等于选定了默认适配器：其它适配器没有做可比较的耗时或画质测量。

EP01 用过浏览器逐帧，复盘的结论是那一集的页面不能复制到下一集。所以现在的做法是：

- 所有画法在 `studio/render/kit/canvas/kit.js`，单集只写参数：静帧在 `render/stills.json`，整片在 `render/scenes.json`。
- 时间不写死秒数，写台词提示点（`L05`、`L05.end`、`L05@0.5`）。秒数来自 WAV 时长，由 `build_episode.mjs` 解出来。
- 页面由 Playwright 驱动的 Chromium 逐帧调用 `window.__frame(t)` 出图，ffmpeg 编码。帧函数只依赖输入参数和 t，与模型无关。
- 字体按本集用字子集化后以 data URL 嵌入，缺字直接失败。
- 角色只从系列 rig 画，不在单集或 kit 里另画。

单集目录里出现第二份完整 `index.html` 时间轴，就说明 kit 没有接上。

字幕安全区、嵌入字体、不用 emoji，按 `studio/contracts/visual_contract.md` 检查。EP02 的安全区内边距（72 / 54 px）写在该集 `render/stills.json`，是该集提案，还不是系列合同。
