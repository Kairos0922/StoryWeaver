# QC 清单

机器可读的项目在 `checklist.json`。`node studio/cli.mjs qc <episode-dir>` 会按这份目录打分。

自动项由文件内容决定。在单集的 `qc/checklist.json` 里把自动项改成 `pass` 不会生效。

人工项默认 `pending`。要算通过，必须同时写：

```json
"status": "pass",
"checked_by": "人名",
"evidence": "听了哪一段 / 看了哪张静帧"
```

没有 `checked_by` 的 `pass` 仍当作 `pending`。

`pending` 和 `fail` 都会挡住清单里 `blocks` 写明的阶段。ASR 分数、响度测量、完播率都不在这个仓库里自动生成。没有成片或后台导出时，对应项保持 `pending` 或留空，不要填一个看起来像测过的值。

响度目标 −16 LUFS 来自 EP01 复盘里的管线目标。它不是本仓库某条成片的测量结果。
