# Render contract

Every frame is a pure function of `t` and checked-in inputs. The contract is the studio's memory: when a render bug is fixed, add the rule that would have prevented it here, and add a lint rule when it can be checked mechanically.

`node studio/cli.mjs render-contract` (also `npm run render-contract`; CI runs it as its own step) enforces the mechanical rules.

## Rules

| # | Rule | Enforced by |
|---|---|---|
| R1 | No wall clock in the capture path: no `Date.now()`, `new Date()`, `performance.now()`. | lint `no-date` |
| R2 | No browser frame callback: no `requestAnimationFrame`. The pipeline seeks; nothing plays. | lint `no-raf` |
| R3 | No timers: no `setTimeout`, `setInterval`, `setImmediate`. | lint `no-timers` |
| R4 | No unseeded randomness: no `Math.random()`. Use a seeded PRNG keyed by shot id. | lint `no-unseeded-random` |
| R5 | No network requests from the capture page. Fonts and libraries load from local files. | lint `no-network` |
| R6 | No CSS `transition`, `animation`, or `@keyframes`. | lint `no-css-motion` |
| R7 | Dependencies are pinned to exact versions in `package.json`. Parameter names change between versions (three r160 `TextGeometry` takes `height`; `depth` silently falls back to 50). | lint `pinned-versions` |
| R8 | GSAP timelines are created `paused: true` and moved only by `seek(t)` / `totalProgress`. | `gsap_clock.js`, tests |
| R9 | Wait for `document.fonts.ready` before the first capture; fonts use `font-display: block`. | doctor, pipeline |
| R10 | Animate `transform` and `opacity` only. Resting text sits on whole pixels. | review |
| R11 | Easing curves, springs, and durations come from `studio/motion/tokens.js` by name. | review, `docs/motion-tokens.md` |
| R12 | Springs are closed-form (`spring(t, zeta, freq)`), never simulated frame by frame. | `tokens.js` |
| R13 | Beat or cue frames are computed from time and rounded per beat; never add rounded values. | `beatFrame`, `cueFrames` |
| R14 | Deliverable mp4: H.264 High@4.1, bitrate capped (`DELIVERY_VIDEO`: maxrate 5.5 Mbps), AAC 48 kHz, faststart, no soft subtitle track (captions burned in plus a sidecar `.srt`). EP03 v2 shipped 8.5 Mbps with a `mov_text` track and stalled after the opening on the user's players. | `build_episode.mjs`, test `delivery_profile` |
| R15 | `window.render(t)` draws and returns the frame at `t`; `window.seek(t)` is an alias. It is the only external frame entry point. | `build_episode.mjs` BOOT, pipeline |
| R16 | Motion blur is pure sub-seeks centred on `t` inside a half-frame shutter, averaged in-page. `--motion-blur 1–8`; no CSS/timer path. | `build_episode.mjs` `__frameBlur`, `tests/render_options.test.js` |
| R17 | `--fps` defaults to 30 and accepts 1–60 (30/60 are the common choices). `frames = round(duration * fps)`; the same fps feeds ffmpeg and the determinism sample. | `studio/render/options.mjs`, render report |

## Capture path

The lint scans `studio/render/browser/dom/`, `compositor.js`, `post.js`, `three_layer.js`, `studio/render/kit/canvas/kit.js`, `timeline.js`, and `studio/motion/tokens.js`. Node-side drivers (logging elapsed time, spawning ffmpeg) are outside the capture path. Comments are ignored.

## Adding a rule

1. Write the failure with the frame number where it showed.
2. Add a row above.
3. If it can be matched in source, add it to `RULES` in `studio/lint/render_contract.mjs` with a test.
