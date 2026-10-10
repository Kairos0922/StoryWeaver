# Render contract

Every frame is a pure function of `t` and checked-in inputs. The contract is the studio's memory: when a render bug is fixed, add the rule that would have prevented it here, and add a lint rule when it can be checked mechanically.

`node studio/cli.mjs render-contract` (also `npm run render-contract`; CI runs it through `npm test` in `tests/motion_lab.test.js`) enforces the mechanical rules.

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

## Capture path

The lint scans `studio/render/browser/dom/`, `compositor.js`, `post.js`, `three_layer.js`, `studio/render/kit/canvas/kit.js`, `timeline.js`, and `studio/motion/tokens.js`. Node-side drivers (logging elapsed time, spawning ffmpeg) are outside the capture path. Comments are ignored.

## Adding a rule

1. Write the failure with the frame number where it showed.
2. Add a row above.
3. If it can be matched in source, add it to `RULES` in `studio/lint/render_contract.mjs` with a test.
