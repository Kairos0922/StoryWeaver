// Time helpers for the DOM stage. They are pure: the same t always returns the same frame.
// Sequence windows are half-open [from, from + duration). A null duration stays open until the shot ends.

export function frameIndex(t, fps = 30) {
  const rate = Number(fps);
  if (!(rate > 0)) throw new Error('fps must be positive');
  const frame = Math.round(Number(t) * rate);
  return frame < 0 ? 0 : frame;
}

export function localWindow(t, from = 0, duration = null) {
  const local = Number(t) - Number(from);
  const open = duration == null || local < Number(duration) - 1e-9;
  const active = local >= -1e-9 && open;
  return {active, local: active ? Math.max(0, local) : 0};
}
