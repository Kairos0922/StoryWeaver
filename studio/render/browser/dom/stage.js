import {createElement} from 'react';
import {flushSync} from 'react-dom';
import {createRoot} from 'react-dom/client';
import {FrameClock} from './frame.jsx';
import {applyFrameTime, installCaptureClock} from './gsap_clock.js';
import {seekFlourish} from './lottie_seek.js';
import {TitleCard, buildTitleTimeline} from './title_card.jsx';

export function createStageController() {
  let root = null;
  let timeline = null;
  let stage = null;
  let fps = 30;

  function seek(t) {
    if (!root || !stage) throw new Error('kinetic stage is not mounted');
    const started = globalThis.__rafCalls || 0;
    flushSync(() => {
      root.render(createElement(FrameClock, {t, fps}, createElement(TitleCard)));
    });
    const shot = globalThis.__shot;
    if (!timeline) timeline = buildTitleTimeline(stage, shot);
    const playhead = applyFrameTime(timeline, t);
    const flourish = stage.querySelector('[data-lottie="flourish"]');
    const frame = flourish ? Number(flourish.dataset.frame || 0) : 0;
    if (flourish) seekFlourish(flourish, frame);
    installCaptureClock();
    const motion = stage.querySelector('[data-k="seek"], [data-word="seek"]') || stage;
    const computed = getComputedStyle(motion);
    return {
      t,
      frame,
      currentFrame: flourish ? Number(flourish.dataset.currentFrame || 0) : 0,
      gsapTime: playhead.time,
      totalProgress: playhead.totalProgress,
      paused: timeline.paused(),
      duration: timeline.duration(),
      text: stage.innerText,
      lottieHtml: flourish ? flourish.innerHTML.length : 0,
      rafDuringSeek: (globalThis.__rafCalls || 0) - started,
      transitionDuration: computed.transitionDuration,
      animationName: computed.animationName,
      three: typeof globalThis.THREE !== 'undefined',
    };
  }

  return {
    mount(element, spec = {}) {
      stage = element;
      fps = spec.fps || 30;
      root = createRoot(element);
      return seek(0);
    },
    seek,
  };
}
