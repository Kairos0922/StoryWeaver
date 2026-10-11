// Scene timeline for the canvas kit. Two pure steps, shared by Node (build, lint, tests) and the page:
//   resolveScenes(doc, timing)  cue strings -> absolute seconds, plus visible-change and SFX events
//   shotAt(resolved, timing, t) one frame: the shot(s) the kit should draw at time t
// Cues: L05 (line start), L05.end, L05@0.5 (fraction of the line), start / end (scene bounds),
// any of these with +/- seconds (L05.end+0.3), or a number of seconds after scene start.
// A layer animates a number only when `count` is an object; queue_line keeps `count` as its head count.
(function (root) {
  'use strict';

  const CUE = /^(L\d{2}(?:\.end|\.start|@\d*\.?\d+)?|start|end)\s*(?:([+-])\s*(\d*\.?\d+))?$/;

  function cueTime(cue, scope, timing, where) {
    if (typeof cue === 'number') return scope.start + cue;
    const m = String(cue).trim().match(CUE);
    if (!m) throw new Error(`Bad cue "${cue}" in ${where}`);
    let base;
    const head = m[1];
    if (head === 'start') base = scope.start;
    else if (head === 'end') base = scope.end;
    else {
      const id = head.slice(0, 3);
      const line = timing.lines[id];
      if (!line && timing.partial) return Infinity;
      if (!line) throw new Error(`Cue "${cue}" in ${where} names ${id}, which is not in this cut`);
      if (head.endsWith('.end')) base = line.end;
      else if (head.includes('@')) base = line.start + (line.end - line.start) * Number(head.split('@')[1]);
      else base = line.start;
    }
    const off = m[3] ? Number(m[3]) * (m[2] === '-' ? -1 : 1) : 0;
    return base + off;
  }

  const EASE = {
    linear: p => p,
    step: p => (p > 0 ? 1 : 0),
    in: p => p * p * p,
    out: p => 1 - Math.pow(1 - p, 3),
    inout: p => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2),
    back: p => {
      const c1 = 1.70158, c3 = c1 + 1;
      return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2);
    },
    elastic: p => (p === 0 || p === 1 ? p : Math.pow(2, -10 * p) * Math.sin((p * 10 - 0.75) * (2 * Math.PI) / 3) + 1),
  };

  function clamp(v, a = 0, b = 1) {
    return Math.max(a, Math.min(b, v));
  }

  function lerp(a, b, p) {
    if (typeof b === 'number' && typeof a === 'number') return a + (b - a) * p;
    if (Array.isArray(b) && Array.isArray(a) && a.length === b.length) return b.map((v, i) => lerp(a[i], v, p));
    if (b && typeof b === 'object' && !Array.isArray(b) && a && typeof a === 'object' && !Array.isArray(a)) {
      const out = Object.assign({}, a);
      for (const k of Object.keys(b)) out[k] = lerp(a[k], b[k], p);
      return out;
    }
    return p > 0 ? b : a;
  }

  const META_KEYS = new Set(['at', 'dur', 'ease', 'sfx']);
  const AUTO_SFX = {kinetic_number: 'thump', stamp: 'stamp', card: 'pop', tag: 'pop', mystery_box: 'pop'};
  const TRANSITION_SFX = {whip: 'whoosh', wipe: 'whoosh', push: 'whoosh', zoom: 'whoosh', iris: 'pop', flash: 'ding'};

  // ---------- build time ----------

  function resolveScenes(doc, timing) {
    const events = [];
    const sfx = [];
    const scenes = doc.scenes.map(s => Object.assign({}, s));
    scenes.forEach((s, i) => {
      s.start = i === 0 ? 0 : cueTime(s.from, {start: 0, end: timing.duration}, timing, `scene ${s.id}.from`);
    });
    const keep = scenes.filter(s => s.start < timing.duration - 1e-6);
    keep.forEach((s, i) => {
      s.end = i + 1 < keep.length ? keep[i + 1].start : timing.duration;
      if (!(s.end > s.start)) throw new Error(`Scene ${s.id} has no duration (${s.start.toFixed(2)}–${s.end.toFixed(2)} s)`);
    });
    keep.forEach((s, i) => {
      const where = `scene ${s.id}`;
      const scope = {start: s.start, end: s.end};
      const at = (cue, w) => cueTime(cue, scope, timing, `${where} ${w}`);
      const mark = (t, what) => {
        if (t >= s.start - 1e-6 && t <= s.end + 1e-6) events.push({t, what, scene: s.id});
      };
      mark(s.start, 'scene');
      if (s.transition && i > 0) {
        const ty = s.transition.type;
        if (TRANSITION_SFX[ty] && s.transition.sfx !== false) sfx.push({t: s.start, sfx: s.transition.sfx || TRANSITION_SFX[ty]});
      }
      if (s.camera_key) {
        s.camera_key = s.camera_key.map(k => Object.assign({}, k, {at: at(k.at, 'camera_key')}));
        s.camera_key.forEach(k => mark(k.at, 'camera'));
      }
      if (s.camera_hits) {
        s.camera_hits = s.camera_hits.map(k => Object.assign({}, k, {at: at(k.at, 'camera_hits')}));
        s.camera_hits.forEach(k => mark(k.at, 'camera'));
      }
      for (const e of s.events || []) {
        const t = at(e.at, 'events');
        sfx.push(Object.assign({}, e, {t}));
        mark(t, 'sfx');
      }
      delete s.events;
      if (s.chips) s.chips = s.chips.map(c => resolveWindow(c, at, mark, 'chip'));
      const walk = (layers, path) => layers.map((L, j) => resolveLayer(L, at, mark, sfx, `${path}[${j}]`));
      s.layers = walk(s.layers || [], 'layers');
      s.overlay = walk(s.overlay || [], 'overlay');
    });
    events.sort((a, b) => a.t - b.t);
    sfx.sort((a, b) => a.t - b.t);
    return {scenes: keep, events, sfx};
  }

  function resolveWindow(o, at, mark, what) {
    const out = Object.assign({}, o);
    if (o.show) {
      out.show = [at(o.show[0], `${what}.show`), at(o.show[1], `${what}.show`)];
      mark(out.show[0], what);
    }
    return out;
  }

  function resolveLayer(L, at, mark, sfx, where) {
    const out = Object.assign({}, L);
    const autoSfx = L.sfx === false ? null : L.sfx || AUTO_SFX[L.type];
    if (L.show) {
      out.show = [at(L.show[0], `${where}.show`), at(L.show[1], `${where}.show`)];
      mark(out.show[0], `${L.type} show`);
      mark(out.show[1], `${L.type} hide`);
    }
    if (L.enter) {
      out.enter = Object.assign({dur: 0.35, fx: 'pop'}, L.enter, {at: at(L.enter.at, `${where}.enter`)});
      mark(out.enter.at, `${L.type} enter`);
      if (autoSfx) sfx.push({t: out.enter.at, sfx: autoSfx});
    }
    if (L.exit) {
      out.exit = Object.assign({dur: 0.25, fx: 'pop'}, L.exit, {at: at(L.exit.at, `${where}.exit`)});
      mark(out.exit.at, `${L.type} exit`);
    }
    if (L.count && typeof L.count === 'object') {
      out.count = Object.assign({dur: 0.8, from: 0, decimals: 0, fmt: '{v}'}, L.count, {at: at(L.count.at, `${where}.count`)});
      mark(out.count.at, 'count');
      if (L.count.sfx !== false) sfx.push({t: out.count.at, sfx: 'count', dur: out.count.dur});
    }
    if (L.key) {
      out.key = L.key.map(k => Object.assign({}, k, {at: at(k.at, `${where}.key`)})).sort((a, b) => a.at - b.at);
      for (const k of out.key) {
        mark(k.at, `${L.type} key`);
        if (k.sfx) sfx.push({t: k.at, sfx: k.sfx});
      }
    }
    if (L.camera_key) {
      out.camera_key = L.camera_key.map(k => Object.assign({}, k, {at: at(k.at, `${where}.camera_key`)}));
      out.camera_key.forEach(k => mark(k.at, 'panel camera'));
    }
    if (L.seq) {
      // Frame sequence: data-driven playback (simulation output, recorded tracks). Each frame is a
      // partial layer merged over the base layer; time maps to frame by fps, clamped at both ends.
      if (!Array.isArray(L.seq.frames) || !L.seq.frames.length) throw new Error(`Empty seq.frames in ${where}`);
      out.seq = Object.assign({fps: 30, lerp: false, wrap: []}, L.seq, {at: at(L.seq.at ?? 'start', `${where}.seq`)});
      mark(out.seq.at, `${L.type} seq`);
    }
    if (L.layers) out.layers = L.layers.map((c, j) => resolveLayer(c, at, mark, sfx, `${where}.layers[${j}]`));
    return out;
  }

  // Interpolate two frames; keys listed in `wrap` are periodic in [0,1) and take the short way round.
  function lerpFrame(a, b, p, wrap) {
    if (typeof a === 'number' && typeof b === 'number') return a + (b - a) * p;
    if (Array.isArray(a) && Array.isArray(b) && a.length === b.length) return a.map((v, i) => lerpFrame(v, b[i], p, wrap));
    if (a && b && typeof a === 'object' && typeof b === 'object') {
      const out = Object.assign({}, a);
      for (const k of Object.keys(b)) {
        if (wrap.includes(k) && typeof a[k] === 'number' && typeof b[k] === 'number') {
          let d = b[k] - a[k];
          d -= Math.round(d);
          out[k] = ((a[k] + d * p) % 1 + 1) % 1;
        } else out[k] = lerpFrame(a[k], b[k], p, wrap);
      }
      return out;
    }
    return p < 0.5 ? a : b;
  }

  function seqFrame(seq, t) {
    const n = seq.frames.length;
    const x = Math.max(0, Math.min(n - 1, (t - seq.at) * seq.fps));
    const i = Math.floor(x);
    if (!seq.lerp || i >= n - 1 || x === i) return seq.frames[i];
    return lerpFrame(seq.frames[i], seq.frames[i + 1], x - i, seq.wrap || []);
  }

  // Longest stretch without a new visible event. Continuous idle motion does not count.
  function beatClock(events, duration, opts) {
    const warn = opts?.warn_s ?? 2.5;
    const fail = opts?.fail_s ?? 5;
    const times = [0, ...events.map(e => e.t).filter(t => t >= 0 && t <= duration), duration].sort((a, b) => a - b);
    const gaps = [];
    for (let i = 1; i < times.length; i++) {
      const g = times[i] - times[i - 1];
      if (g > warn + 1e-6) gaps.push({from: +times[i - 1].toFixed(3), to: +times[i].toFixed(3), gap: +g.toFixed(3), level: g > fail ? 'fail' : 'warn'});
    }
    let max = 0;
    for (let i = 1; i < times.length; i++) max = Math.max(max, times[i] - times[i - 1]);
    return {warn_s: warn, fail_s: fail, max_gap_s: +max.toFixed(3), events: events.length, gaps, ok: !gaps.some(g => g.level === 'fail')};
  }

  // ---------- render time ----------

  function applyKeys(base, keys, t) {
    const out = Object.assign({}, base);
    for (const k of keys || []) {
      if (t < k.at) break;
      const dur = k.dur ?? 0.35;
      const p = dur > 0 ? clamp((t - k.at) / dur) : 1;
      const e = (EASE[k.ease || 'out'] || EASE.out)(p);
      for (const prop of Object.keys(k)) {
        if (META_KEYS.has(prop)) continue;
        const to = k[prop];
        if (typeof to === 'string' || typeof to === 'boolean' || to === null) {
          if (out[prop] !== to) {
            out[`${prop}_prev`] = out[prop];
            out[`${prop}_age`] = t - k.at;
          }
          out[prop] = to;
        } else {
          out[prop] = lerp(out[prop], to, e);
        }
      }
    }
    return out;
  }

  function enterFx(out, fx, p, sign) {
    const e = EASE.out(p);
    if (out.type === 'kinetic_number' || out.type === 'stamp' || out.type === 'bar_compare') {
      if (sign > 0 && out.progress == null) out.progress = p;
      if (sign < 0) out.fx_alpha = 1 - p;
      return;
    }
    if (fx === 'fade') out.fx_alpha = sign > 0 ? p : 1 - p;
    else if (fx === 'pop') out.fx_scale = sign > 0 ? Math.max(0, EASE.back(p)) : 1 - EASE.in(p);
    else if (fx === 'drop') {
      out.fx_dy = sign > 0 ? -(1 - EASE.back(p)) * 700 : EASE.in(p) * 700;
    } else if (fx.startsWith('slide')) {
      const d = {slide_l: [-1, 0], slide_r: [1, 0], slide_u: [0, -1], slide_d: [0, 1]}[fx] || [1, 0];
      const k = sign > 0 ? 1 - e : EASE.in(p);
      out.fx_dx = d[0] * 1200 * k;
      out.fx_dy = d[1] * 900 * k;
    }
  }

  function layerAt(L, t, ctx) {
    if (L.show && (t < L.show[0] || t >= L.show[1])) return null;
    if (L.enter && t < L.enter.at) return null;
    if (L.exit && t >= L.exit.at + L.exit.dur) return null;
    let out = applyKeys(L, L.key, t);
    delete out.key;
    if (L.seq) {
      Object.assign(out, seqFrame(L.seq, t));
      delete out.seq;
    }
    if (L.enter && t < L.enter.at + L.enter.dur) enterFx(out, L.enter.fx, clamp((t - L.enter.at) / L.enter.dur), 1);
    if (L.exit && t >= L.exit.at) enterFx(out, L.exit.fx, clamp((t - L.exit.at) / L.exit.dur), -1);
    if (L.count && typeof L.count === 'object') {
      const c = L.count;
      const p = EASE.out(clamp((t - c.at) / c.dur));
      const v = c.from + (c.to - c.from) * (t < c.at ? 0 : p);
      out.text = c.fmt.replace('{v}', v.toFixed(c.decimals));
    }
    if (out.type === 'character') {
      out.t = t;
      const who = ctx.speakers[out.id];
      if (out.talk == null) out.talk = ctx.talk(who, t);
    }
    if (out.camera_key) out.camera = applyKeys(out.camera || {}, out.camera_key, t);
    if (out.layers) out.layers = out.layers.map(c => layerAt(c, t, ctx)).filter(Boolean);
    return out;
  }

  function cameraAt(scene, t) {
    const cam = applyKeys(Object.assign({x: 960, y: 540, zoom: 1, rot: 0, shake: 0}, scene.camera || {}), scene.camera_key, t);
    const drift = cam.drift ?? 1;
    const u = t - scene.start;
    cam.x += Math.sin(u * 0.53 + 1.1) * 7 * drift;
    cam.y += Math.cos(u * 0.41 + 0.3) * 4 * drift;
    cam.zoom *= 1 + Math.sin(u * 0.37) * 0.006 * drift;
    for (const h of scene.camera_hits || []) {
      if (t < h.at) continue;
      const p = clamp((t - h.at) / (h.dur ?? 0.45));
      const k = (1 - p) * (1 - p);
      cam.zoom *= 1 + (h.zoom ?? 0) * k;
      cam.rot += (h.rot ?? 0) * k;
      cam.shake += (h.shake ?? 0) * k;
    }
    if (cam.shake > 0.01) cam.seed = Math.floor(t * 30) + 1;
    return cam;
  }

  function lineAt(timing, t) {
    for (const l of timing.order) {
      const line = timing.lines[l];
      if (t >= line.start && t < line.sub_end) return line;
    }
    return null;
  }

  function talkFor(timing, who, t) {
    for (const id of timing.order) {
      const l = timing.lines[id];
      if (l.speaker !== who || t < l.start || t >= l.end) continue;
      const env = l.env;
      if (!env || !env.length) return 0;
      const i = Math.floor((t - l.start) * (timing.env_fps || 30));
      return env[Math.max(0, Math.min(env.length - 1, i))];
    }
    return 0;
  }

  function shotFor(scene, t, timing, doc) {
    const ctx = {speakers: doc.speakers || {}, talk: (who, tt) => talkFor(timing, who, tt)};
    const shot = {
      id: scene.id,
      t,
      camera: cameraAt(scene, t),
      layers: scene.layers.map(L => layerAt(L, t, ctx)).filter(Boolean),
      overlay: scene.overlay.map(L => layerAt(L, t, ctx)).filter(Boolean),
      chips: (scene.chips || []).filter(c => !c.show || (t >= c.show[0] && t < c.show[1])),
    };
    if (scene.footnote) shot.footnote = scene.footnote;
    if (scene.stack) shot.stack = scene.stack;
    if (scene.post) shot.post = scene.post;
    return shot;
  }

  function shotAt(resolved, timing, t, doc) {
    const scenes = resolved.scenes;
    let i = scenes.findIndex(s => t >= s.start && t < s.end);
    if (i < 0) i = t < scenes[0].start ? 0 : scenes.length - 1;
    const scene = scenes[i];
    const main = shotFor(scene, t, timing, doc);
    const line = lineAt(timing, t);
    if (line && scene.subtitle !== false) {
      const a = clamp((t - line.start) / 0.12) * clamp((line.sub_end - t) / 0.12);
      main.subtitle = {speaker: line.speaker, text: line.text, alpha: a};
    }
    const tr = scene.transition;
    if (tr && i > 0 && t < scene.start + (tr.dur ?? 0.35)) {
      return {shot: main, prev: shotFor(scenes[i - 1], t, timing, doc), transition: {type: tr.type, p: (t - scene.start) / (tr.dur ?? 0.35), dir: tr.dir, at: tr.at}};
    }
    return {shot: main};
  }

  root.SWTimeline = {cueTime, resolveScenes, beatClock, shotAt, applyKeys, lerp, EASE, seqFrame, lerpFrame};
})(typeof window !== 'undefined' ? window : globalThis);
