# invisible-rules / ep02 · 一条长龙，还是三条短队

Phase A 已批（Kairos，2026-10-10：钩子 H1，只做横屏）。台词和音色已填进 `lines.json`。画面时间轴在 `render/scenes.json`，所有时刻都挂在台词上，换了 WAV 画面会跟着移。

| 文件 | 是什么 |
|---|---|
| `fact_card.md` | A 外部来源、B 模拟数字（每个上屏数字对应 `sim/results.json` 字段）、C 不能说的话 |
| `phase_a.md` | 已批准的导演提案。正文有哈希，改正文会让批准失效 |
| `script.md` / `lines.json` | 口播稿 / 逐句台词：说话人、音色、情绪提示、句后停顿、WAV 文件名 |
| `sim/queue_sim.py` → `sim/results.json` | 3 个收银台，一条队 vs 人人挑最短，20 个种子 |
| `render/stills.json` → `stills/*.png` | 四张送审静帧，用正式角色 rig 出图 |
| `render/scenes.json` | 全片时间轴：10 个场景，台词提示点、机位、转场、大数字、角色表情和动作、BGM 段落 |
| `preview/` | 无配音预览的封面和抽帧表（估算时长，不是成片） |
| `audio/line_XX.wav` | 配音，外部生成后放这里。不进 git |
| `out/<mode>/` | 渲染输出。不进 git |
| `qc/checklist.json` | 人工项。`render` 闸要 `ear_hook`、`stills_four`、`beat_clock`、`no_idle` 四项有 `checked_by` |

## 一次性准备（普通 Linux）

```bash
npm install
npx playwright install chromium        # 或者设 CHROME=/path/to/chrome
pip install numpy fonttools
sudo apt-get install -y ffmpeg fonts-noto-cjk fonts-noto-cjk-extra
```

字体由 `fc-match "Noto Sans CJK SC"` 找。找不到会直接报错，不会退回系统默认字体。要换字体文件，设 `SW_FONT_400`、`SW_FONT_500`、`SW_FONT_700`、`SW_FONT_900`（ttc 再加 `SW_FONT_<w>_INDEX`）。

## 1. 预览（不需要配音）

```bash
node studio/render/kit/canvas/build_episode.mjs series/invisible-rules/ep02 --mode preview
```

按每秒 4.2 字估算时长（`--rate` 可改），画面带「预览 · 估算时长 · 无配音」水印。只看节奏和画面，不能当成片。加 `--no-video` 只出封面、抽帧表和时间轴，几秒钟跑完。

## 2. 配音

按 `lines.json` 逐句生成 22 个 WAV，文件名 `line_01.wav` … `line_22.wav`，放进 `series/invisible-rules/ep02/audio/`。任何采样率、单声道或立体声都可以。音色和情绪见 `lines.json` 的 `voice`、`emotion` 和 `../voice/README.md`。句后停顿由管线按 `pause_after_s` 加，WAV 里不用留长静音。

## 3. 钩子样片（前 3 句，约 12–15 秒）

```bash
node studio/render/kit/canvas/build_episode.mjs series/invisible-rules/ep02 --mode hook
```

只读 `line_01`–`line_03`。出 `out/hook/invisible-rules_ep02_hook.mp4`。人听完，把结果写进 `qc/checklist.json` 的 `ear_hook`（`status`、`evidence`、`checked_by`）。

## 4. 成片前的人工检查

看 `stills/*.png`、`out/hook/` 和预览的 `contact_sheet.png`，在 `qc/checklist.json` 填 `stills_four`、`beat_clock`、`no_idle`。然后：

```bash
node studio/cli.mjs gate series/invisible-rules/ep02 render
```

## 5. 成片

```bash
node studio/render/kit/canvas/build_episode.mjs series/invisible-rules/ep02 --mode full
```

`render` 闸没开会以退出码 3 停下，并列出缺的人工项。缺 WAV 是退出码 4，节拍检查失败（超过 5 秒没有新画面）是退出码 5。

输出在 `out/full/`：

| 文件 | 内容 |
|---|---|
| `invisible-rules_ep02_full.mp4` | 1920×1080，30 fps，H.264 + AAC 48 kHz；烧录字幕，另带一条 mov_text 软字幕；右上角「AI 生成」，元数据 comment 也写了 |
| `cover.png` | 封面 |
| `contact_sheet.png` | 每 2.5 秒一帧的抽帧表 |
| `subtitles.srt` | 字幕 |
| `mix.wav` | 混音：人声每句按有声段 RMS 对齐到 −19 dBFS，BGM 自动闪避，再两遍 loudnorm 到 −16 LUFS / TP −1.5 |
| `timeline.json` | 每句起止、每个场景起止、音效点、节拍检查结果 |
| `render_report.json` | 闸状态、每个 WAV 的探测结果、字体来源和哈希、字形覆盖、响度实测、输出哈希 |

BGM 和音效都是 `studio/render/kit/audio/mix.py` 现场合成的（96 BPM，C–Am–F–G），没有外部音频素材。

## 改画面

只改 `render/scenes.json`。时刻写台词提示点：`L05`（句首）、`L05.end`、`L05@0.5`（句中一半）、`L05.end+0.3`，或者场景开始后的秒数。改完先跑 `--mode preview --no-video`，看日志里的 `longest gap` 和 `contact_sheet.png`。要看某几个时刻的大图，加 `--frames 12.5,40,61.2`，图写到 `out/<mode>/frames/`。
