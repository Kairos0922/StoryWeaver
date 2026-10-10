Note: published EP01 v2 voice-over. Historical. Not a creative-brief script. Voice-over lint must fail. Spoken lines below stay in Chinese.

# Invisible Rules EP01 v2: why the elevator ignores you

- **One thing:** the elevator picks up people already going its way; it finishes that direction before it turns for you.
- **Three takeaways (historical; tips should have been cards):** ① press only the direction you need; ② do not press both (in the sim, those riders wait longer and slow others); ③ if the lobby asks for a floor first, take the car on the screen.
- **Cast:** 等等 (impatient stand-in) / 阿规 (rule) / 嘀嗒 (number).
- **Number sources:** 31.9s and 24.3s from `sim/results.json` (1 car, 120 people/hour, mean of 10 seeds); 7.5s and 1.2s from `sim/both_buttons.json` `paired_20pct.collective` (same passengers; 20% press both vs none; those riders only board their own direction).
- **Planned duration:** about 110–130s at 4.5–5 characters/s. That rate is now over the cap. Not measured.

---

**【0–3 秒 钩子】** 画面：等等站在电梯门口，上下两个按钮一起狂按，按钮灯一闪一闪。

> 等等：上下都按上，总有一部先来吧？
> 阿规：你这么按，模拟里平均要多等七秒半。
> 等等：……啊？

**【片名】** 看不见的规则 · 第1集 · 电梯为啥不理你

**【问题】** 画面：剖面图，5 楼站着等等，3 楼一部电梯往上开。

> 等等：早上八点，我在五楼，要下楼。电梯就在三楼，往上走，路过五楼——没停！门都没开！
> 阿规：它不是没看见你。它在守一条规矩。

**【规则】** 画面：阿规头顶的箭头朝上，楼层间亮出一条虚线“顺路线”。

> 阿规：一般的电梯，都守一句口诀：顺向截梯，反向不停。
> 阿规：说人话：电梯往上走，只捎往上的人。你要下楼？先等着。等它上到头、掉过头，再来接你。
> 等等：凭什么？我先按的！
> 嘀嗒：先按先接？我掐了表。
> 嘀嗒：一部电梯，一小时一百二十个人。谁先按就先接谁，平均每人等 31.9 秒。按顺路的规矩，24.3 秒。
> 阿规：顺路跑一趟，能捎上一串人。要是谁先按接谁，它就得上上下下来回折腾，谁都快不了。
> 等等：……行吧。它路过我不停，原来是在帮大家省时间。

画面字幕卡：**先来后到 31.9 秒　→　顺路接人 24.3 秒**

**【错误做法：上下都按】** 画面：等等又伸手去按两个按钮，被阿规的箭头挡住。

> 等等：那我上下都按。它往上走、路过我，总得停了吧？
> 阿规：会停。门一开，你不进。门一关，车里的人全陪你多等几秒。
> 嘀嗒：我又掐了表。还是这栋楼，假设每五个人里有一个上下都按，而且只坐自己方向的那趟。
> 嘀嗒：上下都按的人，自己平均多等 7.5 秒。老老实实按一个的人，也被拖慢了 1.2 秒。
> 等等：我图快，结果更慢，还连累别人？
> 阿规：你多按的那一下，等于叫电梯白跑一趟、白停一站。这笔账，大家一起付。

画面字幕卡：**上下都按：自己 +7.5 秒，别人 +1.2 秒（模拟）**

**【带走的三条】** 画面：阿规举牌，一条一条弹出来。

> 阿规：记住一件事就够了：电梯是顺路接人的。所以——
> 阿规：第一，要下楼就按下，要上楼就按上，只按一个。
> 阿规：第二，电梯路过你不停，别急，它掉头就来。
> 阿规：第三，有的写字楼在门口让你先输楼层，屏幕会告诉你坐哪一部。照着去就行。

**【结尾】**

> 等等：行，今天开始，一个按钮都不多按。
> 嘀嗒：我盯着表呢。对了，今天的数字都是简化模拟跑出来的，不是哪栋楼的实测。
> 阿规：下期：排一条长队，还是好几条短队？哪个更快？

---

## Self-check

Historical note: the author claimed there were no explainer clichés. The spoken lines still contain 说人话 / 记住一件事 / 所以—— / 第一，第二，第三. That is why this file is the lint counterexample.

- Mnemonic source: Kepu China https://cloud.kepuchina.cn/newSearch/imgText?id=6969144900050132992 and fact-card A2.
- Destination-control lobbies: fact-card A6.
- “Pressing both adds a wasted stop”: inferred from the mnemonic, plus informal posts (V2EX https://www.v2ex.com/t/1180312 ; https://blog.codingnow.com/2025/06/elevator.html ). On-screen seconds use only this episode’s sim and are labeled as such.
- Deliberately omitted: “pressing more times is faster/slower” (no source); multi-car dispatch (cut from v1).
- Soft wording: “a few extra seconds” for a wasted stop. The sim uses 5s dwell + 1s per passenger.
