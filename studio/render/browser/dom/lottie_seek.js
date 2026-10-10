// One Lottie flourish, SVG renderer, seeked with goToAndStop.
// freeze() keeps the player from scheduling a playback loop.
// autoplay stays off. Nothing in this file calls play().

import lottie from 'lottie-web/build/player/lottie_svg.js';
import flourish from './flourish.json';

lottie.freeze();

const cache = new WeakMap();

export function seekFlourish(container, frame) {
  if (!container) return null;
  let anim = cache.get(container);
  if (!anim) {
    anim = lottie.loadAnimation({
      container,
      renderer: 'svg',
      loop: false,
      autoplay: false,
      animationData: flourish,
      rendererSettings: {
        preserveAspectRatio: 'xMidYMid meet',
        progressiveLoad: false,
        hideOnTransparent: true,
      },
    });
    anim.pause();
    anim.setSubframe(false);
    cache.set(container, anim);
  }
  const next = Math.max(0, Math.min(45, Math.round(Number(frame) || 0)));
  anim.goToAndStop(next, true);
  return anim;
}
