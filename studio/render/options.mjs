// Render-time options shared by the CLI and the pipeline. Keep them pure so they can be tested
// without a browser or ffmpeg.
export const FPS_MIN = 1;
export const FPS_MAX = 60;
export const DEFAULT_FPS = 30;
export const MOTION_BLUR_MIN = 1;
export const MOTION_BLUR_MAX = 8;
export const DEFAULT_MOTION_BLUR = 1;

export function normalizeFps(value, fallback = DEFAULT_FPS) {
  const raw = value === undefined || value === null || value === '' ? fallback : Number(value);
  if (!Number.isFinite(raw)) throw new Error(`--fps must be a number (${FPS_MIN}–${FPS_MAX})`);
  const fps = Math.round(raw);
  if (fps < FPS_MIN || fps > FPS_MAX) throw new Error(`--fps must be ${FPS_MIN}–${FPS_MAX} (got ${value})`);
  return fps;
}

export function normalizeMotionBlur(value, fallback = DEFAULT_MOTION_BLUR) {
  const raw = value === undefined || value === null || value === '' ? fallback : Number(value);
  if (!Number.isFinite(raw)) throw new Error(`--motion-blur must be a number (${MOTION_BLUR_MIN}–${MOTION_BLUR_MAX})`);
  const samples = Math.round(raw);
  if (samples < MOTION_BLUR_MIN || samples > MOTION_BLUR_MAX) {
    throw new Error(`--motion-blur must be ${MOTION_BLUR_MIN}–${MOTION_BLUR_MAX} (got ${value})`);
  }
  return samples;
}

// Subframes are centred on t and span a half-frame shutter by default. This is motion blur, not
// a longer exposure: the frame still belongs to t, and every sample is a pure seek.
export function subframeTimes(t, fps, samples, shutterFraction = 0.5) {
  const n = Math.max(1, Math.round(samples));
  const time = Math.max(0, Number(t) || 0);
  if (n === 1) return [time];
  const span = Math.max(0, Number(shutterFraction) || 0) / Math.max(1, Number(fps) || 1);
  return Array.from({length: n}, (_, i) => Math.max(0, time + span * (i / (n - 1) - 0.5)));
}
