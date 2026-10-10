// Motion tokens. Scenes use these names; they do not write inline easing curves or durations.
// Every function here is a pure function of its inputs, so any frame can be seeked on its own.
// Rationale and the numbers table: docs/motion-tokens.md

// Five named cubic-bezier easings.
export const EASINGS = Object.freeze({
  outExpo: Object.freeze([0.16, 1, 0.3, 1]), // text and logo entrances
  outQuint: Object.freeze([0.22, 1, 0.36, 1]), // calm, premium entrances
  inOutQuart: Object.freeze([0.76, 0, 0.24, 1]), // travel across the frame, camera moves
  inExpo: Object.freeze([0.7, 0, 0.84, 0]), // fast exits
  outBack: Object.freeze([0.34, 1.56, 0.64, 1]), // playful pop; overshoots, so position and scale only
});

// Damping-ratio presets for springs. 1 = no overshoot.
export const DAMPING = Object.freeze({
  critical: 1.0,
  premium: 0.8,
  playful: 0.5,
  cartoon: 0.25,
});

// Durations in seconds. Convert to frames with toFrames.
export const DURATIONS = Object.freeze({
  uiFeedback: 0.15,
  uiMove: 0.35,
  heroReveal: 0.75,
});

// Stagger in seconds.
export const STAGGER = Object.freeze({
  letterFrames: 1,
  word: 0.09,
  listItem: 0.06,
});

// Exits are 40-50% shorter than the matching entrance.
export const EXIT_RATIO = Object.freeze({min: 0.5, max: 0.6, default: 0.55});

// Properties that must never overshoot.
export const NO_OVERSHOOT = Object.freeze(['opacity', 'color', 'backgroundColor', 'fill', 'stroke', 'filter']);

export function cubicBezier([x1, y1, x2, y2]) {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const sx = u => ((ax * u + bx) * u + cx) * u;
  const sy = u => ((ay * u + by) * u + cy) * u;
  const dx = u => (3 * ax * u + 2 * bx) * u + cx;
  return function ease(p) {
    if (p <= 0) return 0;
    if (p >= 1) return 1;
    let u = p;
    for (let i = 0; i < 8; i++) {
      const err = sx(u) - p;
      if (Math.abs(err) < 1e-7) return sy(u);
      const d = dx(u);
      if (Math.abs(d) < 1e-6) break;
      u -= err / d;
    }
    let lo = 0, hi = 1;
    u = p;
    for (let i = 0; i < 40; i++) {
      const x = sx(u);
      if (Math.abs(x - p) < 1e-7) break;
      if (x < p) lo = u; else hi = u;
      u = (lo + hi) / 2;
    }
    return sy(u);
  };
}

const compiled = {};
export function ease(name, p) {
  const curve = EASINGS[name];
  if (!curve) throw new Error(`Unknown easing token: ${name}`);
  compiled[name] ||= cubicBezier(curve);
  return compiled[name](p);
}

export function overshoots(name) {
  const curve = EASINGS[name];
  if (!curve) throw new Error(`Unknown easing token: ${name}`);
  return curve[1] > 1 || curve[3] > 1 || curve[1] < 0 || curve[3] < 0;
}

// Easing for a property. Overshooting curves are refused on opacity and color.
export function easingFor(property, name) {
  if (NO_OVERSHOOT.includes(property) && overshoots(name)) {
    throw new Error(`${name} overshoots; ${property} must not bounce. Use outQuint or outExpo.`);
  }
  return EASINGS[name];
}

// Closed-form damped spring from 0 to 1. t in seconds, freq in Hz (undamped natural frequency).
// No per-frame simulation: spring(t) depends only on t.
export function spring(t, zeta = DAMPING.premium, freq = 2) {
  if (!(zeta > 0)) throw new Error('damping ratio must be positive');
  if (t <= 0) return 0;
  const w = 2 * Math.PI * freq;
  if (Math.abs(zeta - 1) < 1e-9) return 1 - Math.exp(-w * t) * (1 + w * t);
  if (zeta < 1) {
    const wd = w * Math.sqrt(1 - zeta * zeta);
    return 1 - Math.exp(-zeta * w * t) * (Math.cos(wd * t) + ((zeta * w) / wd) * Math.sin(wd * t));
  }
  const s = Math.sqrt(zeta * zeta - 1);
  const r1 = -w * (zeta - s), r2 = -w * (zeta + s);
  return 1 - (r2 * Math.exp(r1 * t) - r1 * Math.exp(r2 * t)) / (r2 - r1);
}

// Spring for a property. Opacity and color are clamped to critical damping.
export function springFor(property, t, zeta = DAMPING.premium, freq = 2) {
  const z = NO_OVERSHOOT.includes(property) ? Math.max(1, zeta) : zeta;
  return spring(t, z, freq);
}

export function exitDuration(entrance, ratio = EXIT_RATIO.default) {
  if (ratio < EXIT_RATIO.min || ratio > EXIT_RATIO.max) {
    throw new Error(`exit ratio ${ratio} outside ${EXIT_RATIO.min}-${EXIT_RATIO.max} (exits are 40-50% shorter)`);
  }
  return entrance * ratio;
}

export function toFrames(seconds, fps = 30) {
  return Math.round(seconds * fps);
}

// Beat grid. Each beat is computed from time and rounded on its own; rounded values are never accumulated.
export function beatFrame(n, bpm, fps = 30) {
  if (!(bpm > 0) || !(fps > 0)) throw new Error('bpm and fps must be positive');
  return Math.round((n * 60 * fps) / bpm);
}

// Voice-driven grid: a cue at seconds -> frame, rounded per cue.
export function cueFrames(cueSeconds, fps = 30) {
  return cueSeconds.map(s => Math.round(s * fps));
}
