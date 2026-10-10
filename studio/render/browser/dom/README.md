# DOM stage, seek clock

The capture path has one clock: the pipeline’s `t`. GSAP, React, and Lottie read that time. They do not schedule frames.

Remotion, Motion, and Rive are inspirations, not dependencies. Do not install them. The primitives below are the pieces this repo actually runs.

## Stack

| Piece | Role |
|---|---|
| DOM / SVG | Type, layout, Lucide icons |
| GSAP | Motion, paused, seeked from `t` |
| `lottie-web` | One SVG flourish, `goToAndStop` only |
| Three.js | On demand, for a shot that sets `kind: "three"`. The title-card fixture does not |
| WebGL post | The existing grade, bloom, grain, and vignette |

## GSAP

```js
import {gsap} from 'gsap';

gsap.ticker.remove(gsap.updateRoot);
gsap.ticker.sleep();

const timeline = gsap.timeline({paused: true});
timeline.fromTo(node, {yPercent: 120}, {yPercent: 0, duration: 0.5}, 0.36);

function frame(t) {
  timeline.seek(t, false);
  // or timeline.totalProgress(t / timeline.duration(), false);
}
```

`installCaptureClock`, `createSeekTimeline`, `seekTimeline`, and `progressTimeline` in `gsap_clock.js` are that pattern. Importing GSAP arms its ticker. The installer removes the root listener, sleeps the ticker, and replaces `ticker.wake` with a no-op: `timeline.seek` would otherwise wake the ticker and ask for another frame.

Do not call the browser frame callback. Do not set CSS `transition` or `animation`. A second seek to the same `t` must repeat the picture.

## React primitives

`frame.jsx` is a thin stand-in for Remotion’s composition helpers. `FrameClock` is fed the pipeline `t` and the shot `fps`.

| Ours | Reads |
|---|---|
| `useFrame()` | Seconds, the pipeline `t` (local time inside a `Sequence`) |
| `useCurrentFrame()` | `round(t * fps)` |
| `Sequence` | Children stay mounted, hidden outside `[from, from + duration)` |
| `AbsoluteFill` | A layer that covers the stage |

`useFrame()` does not take a callback and does not subscribe to a refresh. The capture loop calls `seek(t)`, React commits with `flushSync`, then GSAP seeks, then Lottie seeks.

`Sequence` keeps children mounted so a GSAP timeline built on the first frame can still find its targets. Hiding is `visibility`, not a CSS animation.

## Lottie

`lottie.freeze()` plus `autoplay: false` and `goToAndStop(frame, true)`. Do not call `play()`. The title card maps the flourish sequence’s local time onto frames 0–45.

## Capture

`shot_preview.mjs` mounts the stage, seeks, snapshots `#sw-stage`, and hands the bitmap to `SWCompose.presentPicture`. That runs the shared WebGL post pass and, in draft, draws `Not human-reviewed`. ffmpeg encodes only when the command asks for a picture, not for `--review-only`.

The reference shot is `docs/demo/title-card/`. It is a tool fixture, not a series.
