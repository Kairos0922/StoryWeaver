// Capture clock for GSAP.
//
// The pipeline owns time. A timeline is created paused and is never played.
// Each frame calls seek(t) or totalProgress with the external frame time.
// Importing GSAP arms its ticker; installCaptureClock removes that listener and
// sleeps the ticker so it cannot schedule another frame. Call it again after
// building or seeking in case a tween woke the ticker.
//
// Do not call the browser frame callback, and do not put transitions in CSS.
// Pattern and worked example: studio/render/browser/dom/README.md

import {gsap} from 'gsap';

export function installCaptureClock() {
  gsap.ticker.remove(gsap.updateRoot);
  gsap.ticker.sleep();
  gsap.ticker.lagSmoothing(0);
  // seek() calls totalTime(), which wakes the ticker. A capture page must not arm it.
  gsap.ticker.wake = function captureWake() {};
}

installCaptureClock();

export function createSeekTimeline(build, vars = {}) {
  if (vars.paused === false) {
    throw new Error('Capture timelines are created paused. Drive them from the pipeline time.');
  }
  installCaptureClock();
  const timeline = gsap.timeline({...vars, paused: true});
  build(timeline);
  if (!timeline.paused()) timeline.pause();
  installCaptureClock();
  return timeline;
}

export function seekTimeline(timeline, t) {
  installCaptureClock();
  if (!timeline.paused()) timeline.pause();
  timeline.seek(t, false);
  installCaptureClock();
  return timeline.time();
}

export function progressTimeline(timeline, progress) {
  installCaptureClock();
  if (!timeline.paused()) timeline.pause();
  timeline.totalProgress(progress, false);
  installCaptureClock();
  return timeline.totalProgress();
}

export function applyFrameTime(timeline, t) {
  const time = seekTimeline(timeline, t);
  return {time, totalProgress: timeline.totalProgress()};
}
