# Render contract

A frame is a pure function of `t` and checked-in inputs. The contract records each render rule.
When you fix a render bug, add the rule and a lint test. Run
`node studio/cli.mjs render-contract`.

| # | Rule | Check |
|---|---|---|
| R1 | No wall clock in the capture path. No `Date.now()`, `new Date()`, or `performance.now()`. | lint `no-date` |
| R2 | No `requestAnimationFrame`. The pipeline seeks. Nothing plays. | lint `no-raf` |
| R3 | No `setTimeout`, `setInterval`, or `setImmediate`. | lint `no-timers` |
| R4 | No unseeded `Math.random()`. Use a seeded PRNG with a shot ID. | lint `no-unseeded-random` |
| R5 | No network request from the capture page. Load fonts and libraries from local files. | lint `no-network` |
| R6 | No CSS `transition`, `animation`, or `@keyframes`. | lint `no-css-motion` |
| R7 | Pin each dependency to an exact version. | lint `pinned-versions` |
| R8 | Create each GSAP timeline with `paused: true`. Move it only with `seek(t)` or `totalProgress`. | `gsap_clock.js`, tests |
| R9 | Wait for `document.fonts.ready` before the first capture. | doctor, pipeline |
| R10 | Animate `transform` and `opacity` only. Put resting text on whole pixels. | review |
| R11 | Use an easing curve, spring, or duration from `studio/motion/tokens.js` by name. | review |
| R12 | Use a closed-form spring. Do not simulate it frame by frame. | `tokens.js` |
| R13 | Compute a beat frame from time and round it for each beat. Do not add rounded values. | `beatFrame`, `cueFrames` |
| R14 | Deliver an H.264 High@4.1 file with a bitrate cap, AAC 48 kHz, faststart, and no soft subtitle track. | `build_episode.mjs`, test |
| R15 | `window.render(t)` draws and returns the frame at `t`. `window.seek(t)` is an alias. | BOOT, pipeline |
| R16 | Motion blur uses pure sub-seeks in a half-frame shutter and an average in the page. | `__frameBlur`, test |
| R17 | `--fps` defaults to 30 and accepts 1 to 60. `frames = round(duration * fps)`. | `options.mjs` |

## Capture path

The lint scans `studio/render/browser/dom/`, `compositor.js`, `post.js`, `three_layer.js`,
`studio/render/kit/canvas/kit.js`, `timeline.js`, and `studio/motion/tokens.js`.
Node-side drivers are outside the capture path. The lint ignores comments.

## Add a rule

1. Write the failure and the frame number.
2. Add a row to the table.
3. Add a rule to `studio/lint/render_contract.mjs` when a machine can match it.
4. Add a test.
5. Run `node studio/cli.mjs render-contract`.
