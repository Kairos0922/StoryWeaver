# 角色

三个人跨集复用。分工来自 EP01 剧本和复盘：

| 名字 | 作用 |
|---|---|
| 等等 | 嘴替。提问、犯错、不服。被说服前要停一下 |
| 阿规 | 讲规则。不念「第一、第二、第三」 |
| 嘀嗒 | 报数。一次只报一个数 |

第三个角色的正式写法是「嘀嗒」（设定稿标注 Dī Dā）。对话里写成「嘟嗒」的指的是同一个角色。

## 精灵

设定稿由 Kairos 提供，2026-10-10 入库，放在 `sprites/src/`：

| 文件 | 内容 |
|---|---|
| `sprites/src/lineup.svg` | 三人阵容和相对比例（等等 1.0、阿规 1.0、嘀嗒 0.95） |
| `sprites/src/agui.svg` | 阿规：主图、四个表情、动作「头顶箭头翻转=换方向」 |
| `sprites/src/dengdeng.svg` | 等等：主图、四个表情、动作「恍然大悟（原地蹦起）」 |
| `sprites/src/dida.svg` | 嘀嗒：主图、四个表情、动作「超时报警」 |

`build_rig.py` 把设定稿拆成带角色标签的图元，写进 `sprites/rig.json`：腿、脚、手臂（肩、肘控制点、手）、手持道具（等等的手机、嘀嗒的红色指针）、每个表情的整颗头，以及眼、眉、嘴、腮红、汗滴、头发、箭头、腰带、刻度、按钮这些可动部件。脚本不画新形状；稿子里有一个图元分不出角色，构建就失败。

```bash
python3 series/invisible-rules/ip/build_rig.py          # 改了设定稿之后重建
python3 series/invisible-rules/ip/build_rig.py --check  # 检查 rig.json 是否过期
```

共享 kit 的 `character` 组件只从 `rig.json` 画角色（`studio/render/kit/canvas/README.md`）。

## 表情枚举（已冻结）

id 一经入库只增不改。中文名照抄设定稿。

| 角色 | id（设定稿标签） | 默认 |
|---|---|---|
| 阿规 `agui` | `neutral`（主图）、`smug`（得意）、`surprised`（惊讶）、`serious`（较真）、`wink`（眨眼） | `neutral` |
| 等等 `dengdeng` | `daily`（日常）、`anxious`（着急）、`aha`（恍然）、`happy`（开心） | `anxious`（与主图相同） |
| 嘀嗒 `dida` | `serious`（认真）、`smug`（得意）、`doubt`（怀疑）、`alarm`（超时！） | `serious`（与主图相同） |

阿规的「惊讶」在稿子里箭头朝下。rig 把箭头单独拿出来，表情只带一个默认 `arrow_flip: 1`，镜头里可以随时翻。

可动部件和对应的设定稿说明：

- 阿规：屏幕脸换表情；箭头翻转（`arrow_flip`）和转向（`arrow_rot`）；虚线腰带流动。
- 等等：蛋形身体挤压回弹（`squash`、`hop`）；头顶毛随情绪抖（`jitter`）。
- 嘀嗒：表针眉毛转动（`brow`）；刻度当进度条（`ticks`）；顶部按钮可按（`press`）。

新增第四个角色之前先改系列说明。不要在单集脚本里临时加一个旁白人格。
