# Canvas kit

同一个帧函数出静帧、抽帧表和整片。场景只写参数，画法都在 `kit.js`。

| 文件 | 作用 |
|---|---|
| `kit.js` | 元件画法：背景、服务点、队列、剪影路人、角色（读系列 rig）、大数字、印章、卡片、对比条、秒表、问号盒、标签、箭头、「正」字计数、分屏、HUD（字幕、AI 标识、角标、片尾小字）、转场 |
| `timeline.js` | 台词提示点 → 秒；关键帧插值；入场 / 出场；机位推拉和冲击；节拍检查；某一时刻该画哪一镜 |
| `runtime.mjs` | Playwright 启动 Chromium，嵌入子集化字体，生成临时页面 |
| `render_stills.mjs` | `<ep>/render/stills.json` → `<ep>/stills/*.png` |
| `build_episode.mjs` | `<ep>/render/scenes.json` + `lines.json` + WAV → 时间轴、封面、抽帧表、混音、mp4 |
| `../audio/audio_probe.py` | 用 ffmpeg 解码 WAV，量时长、电平、首尾静音、口型包络 |
| `../audio/mix.py` | 人声电平对齐、自合成 BGM 和音效、闪避 |
| `../fonts/subset_fonts.py` | 按本集用到的字子集化 Noto Sans CJK SC 四个字重，缺字直接失败 |

```bash
node studio/render/kit/canvas/render_stills.mjs <episode-dir> [shot-id]
node studio/render/kit/canvas/build_episode.mjs <episode-dir> --mode preview|hook|full \
  [--rate 4.2] [--workers N] [--audio-dir DIR] [--out DIR] [--no-video] [--frames t1,t2] [--crf 18]
```

依赖：Node 24、`npm install` 装的 Playwright（`npx playwright install chromium`，或用 `CHROME` 指定本机 Chrome）、Python 3 + numpy + fontTools、ffmpeg、`fonts-noto-cjk`。不需要网络，不调用任何模型或 TTS。

## 时间从哪来

- `preview`：按字数估算（默认每秒 4.2 字），带水印，不做响度归一。只用来看节奏。
- `hook`：前 `hook_lines` 句（默认 3）的 WAV。要 `hook-sample` 闸开着。
- `full`：全部 WAV。要 `render` 闸开着，也就是 `qc/checklist.json` 里人工项有人签。

每句起点 = 上一句终点 + `pause_after_s` + `holds[上一句]`。场景、关键帧、音效、BGM 段落都写成台词提示点，WAV 换了画面跟着动。同样的输入（参数、WAV、字体、Chromium 版本），帧逐字节一致；换 Chromium 或字体版本会有像素差。

## 角色

角色只从系列 rig 画：`series/<series>/ip/sprites/rig.json`，由 `ip/build_rig.py` 从原始 SVG 生成。表情 id 是 rig 里冻结的那几个；`gesture` 是 kit 的手臂姿势（`point`、`press`、`hold_sign`、`cover_eyes` 等，见 `SWKit.gestures`）。角色说话时嘴和身体跟着该句的音量包络动；不说话也有呼吸、眨眼、晃动。不要在单集里另画一套角色。

## 不做的事

- 不在单集目录放整页 HTML。页面每次生成在系统临时目录。
- 不把静帧、预览或抽帧表当作人工检查已通过。人看过之后才写 `qc/checklist.json`。
- 不下载 BGM 或音效素材。
