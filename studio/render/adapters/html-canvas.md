# HTML Canvas 适配器

状态：成片未接线。只有送审静帧可用，见 `studio/render/kit/canvas/README.md`。静帧的安全区内边距写在单集 `render/stills.json` 里，是该集提案，不是系列合同。

EP01 用过浏览器逐帧。复盘的结论是那一集的页面不能复制到下一集。如果继续用 Canvas，场景只能调用 `studio/render/kit/` 的元件：大数字、对比条、印章、角色槽、卡片。

单集目录里的 `render/` 只放这一集的镜头参数。出现第二份完整 `index.html` 时间轴，就说明 kit 没有接上。

字幕安全区、嵌入字体、不用 emoji，按 `studio/contracts/visual_contract.md` 检查。具体像素内边距要等成片素材回到仓库再写死，不要先编一个。
