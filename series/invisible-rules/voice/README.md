# 配音

这一系列采用 `studio/contracts/voice_contract.md`。

已经选定的是豆包 seed-tts-2.0-expressive，复盘称为 E3。用户否决过 ChatTTS 和 CosyVoice 的样音。试听笔记 `voice_tests/` 不在本仓库，不要凭印象重开一轮选型。

## 角色和音色（生产笔记）

来源：Kairos 在对话里指定，2026-10-10，从 EP02 起生效。EP01 的绑定没有记录，`ep01/lines.json` 保持 `binding: unrecorded`。

| 角色 | 音色 | 方向 |
|---|---|---|
| 阿规 | 解说小明 | 冷静，偶尔冷幽默 |
| 等等 | 少年梓辛 | 急，不耐烦，语速快 |
| 嘀嗒 | 知性灿灿 | 清脆，报数据 |

每句的语气说明写在该集 `lines.json` 的 `emotion` 字段。那是制作代理按台词写的草稿，合成的人可以改；它不是 EP01 的 `context_texts` 原文。

## 交接

配音在仓库外合成。合成的人按 `lines.json` 的 `file` 字段放文件：`<集>/audio/line_01.wav` 起，一句一个 WAV。WAV 不进 git。

本目录不放密钥，也不放调用脚本。工作室 CLI 不会请求配音接口。
