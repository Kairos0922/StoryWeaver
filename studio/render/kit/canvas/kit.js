// Shared Canvas kit. Pure drawing: (ctx, shot, spec) -> pixels. No clock, no Math.random.
// Episodes pass declarative layers; this file must not hold episode text or numbers.
(function (root) {
  'use strict';

  const TAU = Math.PI * 2;
  const DEG = Math.PI / 180;

  function rng(seed) {
    let s = (seed >>> 0) || 1;
    return () => {
      s ^= s << 13; s >>>= 0;
      s ^= s >>> 17;
      s ^= s << 5; s >>>= 0;
      return s / 4294967296;
    };
  }

  function ease(p) {
    const c1 = 1.70158, c3 = c1 + 1;
    return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2);
  }

  function rr(ctx, x, y, w, h, r) {
    const q = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + q, y);
    ctx.arcTo(x + w, y, x + w, y + h, q);
    ctx.arcTo(x + w, y + h, x, y + h, q);
    ctx.arcTo(x, y + h, x, y, q);
    ctx.arcTo(x, y, x + w, y, q);
    ctx.closePath();
  }

  function font(spec, weight, size) {
    return `${weight} ${size}px ${spec.fonts.family}`;
  }

  function col(spec, name, fallback) {
    if (!name) return fallback;
    return spec.palette[name] || name;
  }

  function inked(ctx, spec, fill, width) {
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.lineWidth = width ?? 6;
    ctx.strokeStyle = spec.palette.ink;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.stroke();
  }

  function applyCamera(ctx, cam, w, h) {
    const c = Object.assign({x: w / 2, y: h / 2, zoom: 1, rot: 0, shake: 0, seed: 7}, cam || {});
    const r = rng(c.seed);
    const sx = (r() - 0.5) * 2 * c.shake;
    const sy = (r() - 0.5) * 2 * c.shake;
    ctx.translate(w / 2 + sx, h / 2 + sy);
    ctx.rotate(c.rot * DEG);
    ctx.scale(c.zoom, c.zoom);
    ctx.translate(-c.x, -c.y);
  }

  function shadowEllipse(ctx, spec, x, y, rx, ry) {
    ctx.save();
    ctx.fillStyle = spec.palette.shadow;
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  // ---------- environment ----------

  function backdrop(ctx, L, spec, W, H) {
    const p = spec.palette;
    const horizon = L.horizon ?? 300;
    const g = ctx.createLinearGradient(0, 0, 0, horizon);
    g.addColorStop(0, col(spec, L.wall_top, p.wall_top));
    g.addColorStop(1, col(spec, L.wall, p.wall));
    ctx.fillStyle = g;
    ctx.fillRect(-W, -H, W * 3, horizon + H);
    ctx.fillStyle = col(spec, L.floor, p.floor);
    ctx.fillRect(-W, horizon, W * 3, H * 3);
    ctx.fillStyle = p.floor_line;
    ctx.fillRect(-W, horizon, W * 3, 8);
    for (const s of L.shelves || []) {
      ctx.save();
      ctx.globalAlpha = 0.55;
      rr(ctx, s.x, horizon - s.h, s.w, s.h, 10);
      ctx.fillStyle = p.shelf;
      ctx.fill();
      for (let row = 1; row < 4; row++) {
        const y = horizon - s.h + (s.h / 4) * row;
        ctx.fillStyle = p.shelf_line;
        ctx.fillRect(s.x + 8, y, s.w - 16, 6);
        const r = rng(s.x * 31 + row);
        for (let x = s.x + 14; x < s.x + s.w - 30; x += 26 + r() * 18) {
          const bh = 18 + r() * 26;
          ctx.fillStyle = [p.goods_a, p.goods_b, p.goods_c][Math.floor(r() * 3)];
          rr(ctx, x, y - bh, 18 + r() * 10, bh, 4);
          ctx.fill();
        }
      }
      ctx.restore();
    }
    for (const sign of L.signs || []) {
      ctx.save();
      ctx.strokeStyle = p.ink;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(sign.x - 30, -H);
      ctx.lineTo(sign.x - 30, sign.y - 34);
      ctx.moveTo(sign.x + 30, -H);
      ctx.lineTo(sign.x + 30, sign.y - 34);
      ctx.stroke();
      rr(ctx, sign.x - 46, sign.y - 36, 92, 72, 16);
      inked(ctx, spec, col(spec, sign.color, p.navy), 5);
      ctx.fillStyle = p.white;
      ctx.font = font(spec, 900, 46);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(sign.text, sign.x, sign.y + 2);
      ctx.restore();
    }
  }

  function lane(ctx, L, spec) {
    const p = spec.palette;
    ctx.save();
    ctx.fillStyle = col(spec, L.color, p.lane);
    rr(ctx, L.x0, L.y - L.h / 2, L.x1 - L.x0, L.h, L.h / 2);
    ctx.fill();
    ctx.setLineDash([22, 18]);
    ctx.lineWidth = 4;
    ctx.strokeStyle = p.lane_edge;
    ctx.beginPath();
    ctx.moveTo(L.x0 + 30, L.y + L.h / 2 - 6);
    ctx.lineTo(L.x1 - 30, L.y + L.h / 2 - 6);
    ctx.stroke();
    ctx.restore();
  }

  function servicePoint(ctx, L, spec) {
    const p = spec.palette;
    const s = L.scale ?? 1;
    ctx.save();
    ctx.translate(L.x, L.y);
    ctx.scale(s, s);
    shadowEllipse(ctx, spec, 0, 6, 130, 16);
    rr(ctx, -110, -110, 220, 116, 16);
    inked(ctx, spec, p.navy, 6);
    rr(ctx, -118, -128, 236, 30, 10);
    inked(ctx, spec, p.counter_top, 5);
    rr(ctx, -40, -196, 80, 56, 8);
    inked(ctx, spec, p.screen, 5);
    ctx.fillStyle = p.ink;
    ctx.fillRect(-6, -142, 12, 16);
    const light = L.light || 'off';
    const lampColor = light === 'green' ? p.green : light === 'red' ? p.red : p.lamp_off;
    ctx.strokeStyle = p.ink;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(84, -128);
    ctx.lineTo(84, -236);
    ctx.stroke();
    if (light !== 'off') {
      ctx.save();
      ctx.globalAlpha = 0.28;
      ctx.fillStyle = lampColor;
      ctx.beginPath();
      ctx.arc(84, -254, 48, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
    ctx.beginPath();
    ctx.arc(84, -254, 24, 0, TAU);
    inked(ctx, spec, lampColor, 5);
    if (L.label) {
      ctx.fillStyle = p.white;
      ctx.font = font(spec, 900, 40);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(L.label, 0, -52);
    }
    ctx.restore();
  }

  // ---------- people ----------

  function carry(ctx, spec, kind, x, y, s) {
    const p = spec.palette;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    if (kind === 'bottle') {
      rr(ctx, -9, -44, 18, 44, 6);
      inked(ctx, spec, p.water, 4);
      rr(ctx, -6, -54, 12, 12, 3);
      inked(ctx, spec, p.teal, 4);
    } else if (kind === 'basket' || kind === 'basket_full') {
      const r = rng(97);
      if (kind === 'basket_full') {
        for (let i = 0; i < 7; i++) {
          const bx = -46 + i * 14 + r() * 4;
          const bh = 14 + r() * 20;
          rr(ctx, bx, -24 - bh, 18, bh + 6, 4);
          inked(ctx, spec, [p.goods_a, p.goods_b, p.goods_c, p.yellow][i % 4], 3);
        }
      }
      ctx.beginPath();
      ctx.moveTo(-58, -26);
      ctx.lineTo(58, -26);
      ctx.lineTo(46, 20);
      ctx.lineTo(-46, 20);
      ctx.closePath();
      inked(ctx, spec, p.red, 5);
      ctx.strokeStyle = p.white;
      ctx.lineWidth = 3;
      for (let i = -34; i <= 34; i += 17) {
        ctx.beginPath();
        ctx.moveTo(i, -18);
        ctx.lineTo(i * 0.85, 12);
        ctx.stroke();
      }
    } else if (kind === 'cart') {
      const r = rng(41);
      for (let i = 0; i < 6; i++) {
        rr(ctx, -44 + i * 15, -64 - r() * 22, 16, 40, 4);
        inked(ctx, spec, [p.goods_a, p.goods_b, p.goods_c][i % 3], 3);
      }
      ctx.beginPath();
      ctx.moveTo(-62, -40);
      ctx.lineTo(56, -40);
      ctx.lineTo(44, 10);
      ctx.lineTo(-50, 10);
      ctx.closePath();
      inked(ctx, spec, p.lamp_off, 5);
      ctx.strokeStyle = p.ink;
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(56, -40);
      ctx.lineTo(76, -64);
      ctx.moveTo(-44, 10);
      ctx.lineTo(-44, 34);
      ctx.lineTo(40, 34);
      ctx.stroke();
      for (const wx of [-36, 32]) {
        ctx.beginPath();
        ctx.arc(wx, 40, 9, 0, TAU);
        inked(ctx, spec, p.ink, 2);
      }
    } else if (kind === 'box') {
      rr(ctx, -26, -42, 52, 44, 6);
      inked(ctx, spec, p.box, 4);
      ctx.fillStyle = p.ink;
      ctx.font = font(spec, 900, 30);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('?', 0, -19);
    }
    ctx.restore();
  }

  function person(ctx, spec, o, frame) {
    const p = spec.palette;
    const s = o.scale ?? 1;
    const fill = col(spec, o.color, p.crowd);
    const t = o.t ?? frame?.t ?? 0;
    const ph = ((o.x ?? 0) * 0.013 + (o.y ?? 0) * 0.007) % 1;
    const walking = o.pose === 'walk' || o.moving;
    const bob = walking ? -Math.abs(Math.sin(t * TAU * 2.2 + ph * TAU)) * 9 : Math.sin(t * TAU * 0.6 + ph * TAU) * 1.5;
    ctx.save();
    ctx.translate(o.x, o.y);
    ctx.scale(s, s);
    ctx.globalAlpha *= o.alpha ?? 1;
    shadowEllipse(ctx, spec, 0, 4, 40, 9);
    ctx.translate(0, bob);
    const tilt = (walking ? -6 : 0) * (o.facing ?? -1);
    ctx.rotate(tilt * DEG);
    rr(ctx, -30, -118, 60, 118, 28);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, -146, 26, 0, TAU);
    ctx.fill();
    const f = o.facing ?? -1;
    if (o.pose === 'wave') {
      const sw = Math.sin(t * TAU * 2.4) * 10;
      ctx.strokeStyle = fill;
      ctx.lineWidth = 16;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-f * 20, -96);
      ctx.lineTo(-f * 52, -150);
      ctx.lineTo(-f * (46 + sw), -196);
      ctx.stroke();
      ctx.strokeStyle = p.ink;
      ctx.lineWidth = 4;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.arc(-f * (46 + sw), -196, 34 + i * 14, (-f > 0 ? -0.9 : Math.PI - 0.1), (-f > 0 ? 0.1 : Math.PI + 0.9));
        ctx.globalAlpha = (o.alpha ?? 1) * (0.7 - i * 0.2);
        ctx.stroke();
      }
      ctx.globalAlpha = o.alpha ?? 1;
    }
    if (o.carry) carry(ctx, spec, o.carry, f * 28, -60, 0.9);
    if (o.number != null) {
      ctx.rotate(-tilt * DEG);
      rr(ctx, -24, -222, 48, 40, 12);
      inked(ctx, spec, col(spec, o.number_color, p.white), 4);
      ctx.fillStyle = p.ink;
      ctx.font = font(spec, 900, 28);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(o.number), 0, -201);
    }
    ctx.restore();
  }

  // Slot k sits at offset + k * spacing along the polyline. Slots before the start have left the queue.
  function polyPoints(points, spacing, count, offset) {
    const segs = [];
    let total = 0;
    for (let i = 1; i < points.length; i++) {
      const [x0, y0] = points[i - 1];
      const [x1, y1] = points[i];
      const len = Math.hypot(x1 - x0, y1 - y0);
      segs.push({x0, y0, x1, y1, len, start: total});
      total += len;
    }
    const out = [];
    for (let k = 0; k < count; k++) {
      const d = (offset ?? 0) + k * spacing;
      if (d < -1e-6) continue;
      if (d > total + 1e-6) break;
      const seg = segs.find(sg => d <= sg.start + sg.len) || segs[segs.length - 1];
      const u = seg.len ? (d - seg.start) / seg.len : 0;
      out.push({k, x: seg.x0 + (seg.x1 - seg.x0) * u, y: seg.y0 + (seg.y1 - seg.y0) * u, dir: Math.sign(seg.x0 - seg.x1) || -1});
    }
    return out;
  }

  function queueLine(ctx, L, spec, W, H, frame) {
    const p = spec.palette;
    if (L.rope) {
      ctx.save();
      ctx.globalAlpha *= L.rope_alpha ?? 1;
      for (const rope of L.rope) {
        ctx.strokeStyle = p.rope;
        ctx.lineWidth = 8;
        ctx.lineCap = 'round';
        ctx.beginPath();
        rope.forEach(([x, y], i) => (i ? ctx.lineTo(x, y - 70) : ctx.moveTo(x, y - 70)));
        ctx.stroke();
        for (const [x, y] of rope) {
          ctx.fillStyle = p.ink;
          ctx.fillRect(x - 5, y - 80, 10, 80);
          ctx.beginPath();
          ctx.ellipse(x, y, 18, 6, 0, 0, TAU);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(x, y - 82, 9, 0, TAU);
          ctx.fill();
        }
      }
      ctx.restore();
    }
    if (L.path_line) {
      ctx.save();
      ctx.strokeStyle = col(spec, L.path_line, p.rope);
      ctx.globalAlpha *= L.path_alpha ?? 0.5;
      ctx.lineWidth = 10;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.setLineDash([24, 18]);
      ctx.lineDashOffset = -(frame?.t ?? 0) * 60;
      ctx.beginPath();
      L.points.forEach(([x, y], i) => (i ? ctx.lineTo(x, y + 6) : ctx.moveTo(x, y + 6)));
      ctx.stroke();
      ctx.restore();
    }
    const slots = polyPoints(L.points, L.spacing ?? 120, L.count ?? 5, L.offset ?? 0);
    const items = slots.map(pt => Object.assign({
      x: pt.x, y: pt.y, facing: pt.dir, scale: L.scale ?? 1, color: L.color, moving: L.moving,
      number: L.numbered ? (L.number_from ?? 1) + pt.k : null,
    }, (L.people || {})[pt.k] || {}));
    items.sort((a, b) => a.y - b.y);
    for (const it of items) {
      if (it.skip) continue;
      person(ctx, spec, it, frame);
    }
  }

  // ---------- characters: drawn only from the series rig (ip/sprites/rig.json) ----------

  const PATHS = new Map();
  function pathOf(d) {
    let p = PATHS.get(d);
    if (!p) {
      p = new Path2D(d);
      PATHS.set(d, p);
    }
    return p;
  }

  function clamp(v, a = 0, b = 1) {
    return Math.max(a, Math.min(b, v));
  }

  function hashStr(s) {
    let h = 2166136261;
    for (const ch of String(s)) {
      h ^= ch.codePointAt(0);
      h = Math.imul(h, 16777619);
    }
    return (h >>> 0) / 4294967296;
  }

  function hashN(a, b) {
    const r = rng((Math.floor(a * 7919) ^ Math.floor(b * 104729)) + 1);
    r();
    return r();
  }

  // One sheet primitive. `o` overrides fill/alpha/dash offset; geometry is never changed here.
  function paint(ctx, e, o) {
    ctx.save();
    if (e.tf) ctx.translate(e.tf[0], e.tf[1]);
    if (e.rot) ctx.rotate(e.rot * DEG);
    let shape = null;
    if (e.tag === 'path') shape = pathOf(e.d);
    else {
      ctx.beginPath();
      if (e.tag === 'rect') rr(ctx, e.x, e.y, e.w, e.h, e.rx || 0);
      else if (e.tag === 'circle') ctx.arc(e.cx, e.cy, e.r, 0, TAU);
      else ctx.ellipse(e.cx, e.cy, e.rx, e.ry, 0, 0, TAU);
    }
    ctx.globalAlpha *= (o?.alpha ?? 1) * (o?.op ?? e.op ?? 1);
    const fillStyle = o?.fill ?? (e.fill === undefined ? '#000' : e.fill);
    if (fillStyle !== 'none') {
      ctx.fillStyle = fillStyle;
      if (shape) ctx.fill(shape); else ctx.fill();
    }
    if (e.stroke && e.stroke !== 'none') {
      ctx.strokeStyle = e.stroke;
      ctx.lineWidth = e.sw ?? 1;
      ctx.lineCap = e.cap || 'butt';
      ctx.lineJoin = e.join || 'miter';
      if (e.dash) {
        ctx.setLineDash(e.dash);
        ctx.lineDashOffset = o?.dashOffset ?? 0;
      }
      if (shape) ctx.stroke(shape); else ctx.stroke();
    }
    ctx.restore();
  }

  function about(ctx, c, fn) {
    ctx.translate(c[0], c[1]);
    fn();
    ctx.translate(-c[0], -c[1]);
  }

  // Hand targets as [out, down] in rest-arm lengths from the shoulder (out = away from the body),
  // or the name of a body anchor. Arms listed in `front` draw over the body.
  const GESTURES = {
    rest: {},
    signature: {R: 'signature'},
    wave: {R: [0.55, -1.25], wave: 'R'},
    point: {R: [1.25, -0.3]},
    point_up: {R: [0.6, -1.3]},
    point_down: {R: [1.05, 0.5]},
    point_camera: {R: [0.25, -0.15], big: 'R', front: 'R'},
    raise_both: {L: [0.5, -1.3], R: [0.5, -1.3]},
    cheer: {L: [0.35, -1.4], R: [0.35, -1.4], fists: true},
    arms_out: {L: [1.25, -0.2], R: [1.25, -0.2]},
    shrug: {L: [1.0, -0.55], R: [1.0, -0.55], bounce: true},
    chest: {R: 'chest', front: 'R', fists: true},
    head: {R: 'head'},
    hold_head: {L: 'head', R: 'head'},
    cover_eyes: {L: 'eyes', R: 'eyes', front: 'LR'},
    chin: {R: 'chin', front: 'R'},
    hold_basket: {L: 'basket', R: 'basket', front: 'LR', prop: 'basket_full'},
    hold_sign: {L: [0.3, -1.35], R: [0.3, -1.35]},
    snap: {R: [0.75, -0.95], snap: 'R'},
    clap: {L: 'clap', R: 'clap', front: 'LR'},
    press: {R: 'button', front: 'R'},
    stomp: {L: [0.65, 0.3], R: [0.65, 0.3], fists: true},
    hips: {L: 'hip', R: 'hip'},
  };

  function anchorPoint(C, name, side) {
    const A = C.anchors;
    const sg = side === 'L' ? -1 : 1;
    const half = (A.shell[2] - A.shell[0]) / 2;
    switch (name) {
      case 'signature': return C.signature.R.end.slice();
      case 'eyes': return [sg * half * 0.3, A.eyes[1] + 4];
      case 'head': return [sg * half * 0.62, A.shell[1] + 18];
      case 'chin': return [A.mouth[0] + 6, A.mouth[1] + 24];
      case 'chest': return [half * 0.18, (A.mouth[1] + A.shell[3]) / 2 + 10];
      case 'basket': return [sg * half * 0.42, A.hip - 6];
      case 'clap': return [sg * 6, A.mouth[1] + 40];
      case 'hip': return [sg * half * 0.92, A.hip - 26];
      case 'button': return A.button ? [A.button[0] + 8, A.button[1] + 4] : [sg * half * 0.6, A.shell[1] + 18];
      default: throw new Error(`Unknown body anchor ${name}`);
    }
  }

  function restLen(C) {
    const a = C.arms.L;
    return Math.hypot(a.end[0] - a.shoulder[0], a.end[1] - a.shoulder[1]);
  }

  function handTargets(C, name, t, age) {
    const g = GESTURES[name];
    if (!g) throw new Error(`Unknown gesture ${name}`);
    const len = restLen(C);
    const out = {};
    for (const side of ['L', 'R']) {
      const sh = C.arms[side].shoulder;
      const sg = side === 'L' ? -1 : 1;
      const spec = g[side];
      let p;
      if (!spec) p = C.arms[side].end.slice();
      else if (typeof spec === 'string') p = anchorPoint(C, spec, side);
      else p = [sh[0] + sg * spec[0] * len, sh[1] + spec[1] * len];
      if (g.wave === side) p[0] += Math.sin(t * TAU * 2.2) * len * 0.3 * sg;
      if (g.bounce) p[1] -= Math.abs(Math.sin(Math.min(age, 0.9) * TAU * 1.1)) * len * 0.18;
      out[side] = p;
    }
    return out;
  }

  function drawArm(ctx, C, side, hand) {
    const sh = C.arms[side].shoulder;
    const st = C.arm_style;
    const sg = side === 'L' ? -1 : 1;
    const dx = hand[0] - sh[0], dy = hand[1] - sh[1];
    const len = Math.hypot(dx, dy) || 1;
    let px = -dy / len, py = dx / len;
    if (px * sg + py * 0.6 < 0) {
      px = -px;
      py = -py;
    }
    const bend = 0.22 * Math.min(len, restLen(C) * 1.5);
    const cx = (sh[0] + hand[0]) / 2 + px * bend;
    const cy = (sh[1] + hand[1]) / 2 + py * bend;
    ctx.strokeStyle = st.stroke;
    ctx.lineWidth = st.sw;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(sh[0], sh[1]);
    ctx.quadraticCurveTo(cx, cy, hand[0], hand[1]);
    ctx.stroke();
    return Math.atan2(hand[1] - cy, hand[0] - cx);
  }

  function drawHand(ctx, C, hand, big, fist) {
    const h = C.arm_style.hand;
    const r = h.r * (big ? 1.8 : 1);
    paint(ctx, {tag: 'circle', cx: hand[0], cy: hand[1], r, fill: h.fill, stroke: h.stroke, sw: h.sw});
    if (fist) {
      ctx.strokeStyle = h.stroke;
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(hand[0] - r * 0.45, hand[1] - r * 0.1);
      ctx.lineTo(hand[0] + r * 0.45, hand[1] - r * 0.1);
      ctx.stroke();
    }
  }

  function drawProp(ctx, C, name, hand, angle) {
    const prop = C.props[name];
    if (!prop) throw new Error(`No prop ${name} in rig`);
    ctx.save();
    ctx.translate(hand[0], hand[1]);
    ctx.rotate(angle - prop.rest_angle * DEG);
    for (const e of prop.elements) paint(ctx, e);
    ctx.restore();
  }

  function marks(ctx, spec, list, cx, top, w, t) {
    const p = spec.palette;
    const wob = Math.sin((t ?? 0) * TAU * 3) * 4;
    for (const m of list || []) {
      ctx.save();
      if (m === 'anger') {
        ctx.translate(cx + w * 0.55, top + 10 + wob);
        ctx.strokeStyle = p.red;
        ctx.lineWidth = 7;
        ctx.lineCap = 'round';
        for (let i = 0; i < 4; i++) {
          ctx.rotate(Math.PI / 2);
          ctx.beginPath();
          ctx.moveTo(6, 6);
          ctx.quadraticCurveTo(18, 4, 22, 18);
          ctx.stroke();
        }
      } else if (m === 'surprise') {
        ctx.strokeStyle = p.ink;
        ctx.lineWidth = 6;
        ctx.lineCap = 'round';
        const k = 1 + Math.abs(wob) * 0.02;
        for (let i = -2; i <= 2; i++) {
          const a = -Math.PI / 2 + i * 0.32;
          ctx.beginPath();
          ctx.moveTo(cx + Math.cos(a) * (w * 0.62 * k), top + 30 + Math.sin(a) * (w * 0.62 * k));
          ctx.lineTo(cx + Math.cos(a) * (w * 0.82 * k), top + 30 + Math.sin(a) * (w * 0.82 * k));
          ctx.stroke();
        }
      } else if (m === 'sweat') {
        ctx.translate(cx - w * 0.6, top + 40 + Math.abs(wob));
        ctx.beginPath();
        ctx.moveTo(0, -18);
        ctx.quadraticCurveTo(14, 4, 0, 12);
        ctx.quadraticCurveTo(-14, 4, 0, -18);
        inked(ctx, spec, p.water, 4);
      } else if (m === 'question' || m === 'exclaim') {
        ctx.translate(cx + w * 0.62, top + 10);
        ctx.rotate(wob * 0.02);
        ctx.fillStyle = p.ink;
        ctx.font = font(spec, 900, 72);
        ctx.textAlign = 'center';
        ctx.fillText(m === 'question' ? '?' : '!', 0, 0);
      }
      ctx.restore();
    }
  }

  function legPose(L, t, ph) {
    const mode = L.legs || 'stand';
    let lift = {L: 0, R: 0};
    let stretch = L.stretch ?? 0;
    if (mode === 'walk') {
      const s = Math.sin(t * TAU * 2.2 + ph * TAU);
      lift = {L: Math.max(0, s) * 16, R: Math.max(0, -s) * 16};
    } else if (mode === 'tap') {
      lift.R = Math.max(0, Math.sin(t * TAU * 3.2 + ph * TAU)) * 12;
    } else if (mode === 'stomp') {
      const s = Math.sin(t * TAU * 3);
      lift = {L: Math.max(0, s) * 26, R: Math.max(0, -s) * 26};
    } else if (mode === 'tiptoe') {
      stretch += 12 + Math.sin(t * TAU * 1.4 + ph) * 4;
    }
    return {lift, stretch};
  }

  function character(ctx, L, spec, W, H, frame) {
    const rig = spec.rig?.characters?.[L.id];
    if (!rig) throw new Error(`No rig for character ${L.id}`);
    const C = rig;
    const A = C.anchors;
    const t = L.t ?? frame?.t ?? 0;
    const ph = hashStr(L.id);
    const f = L.facing ?? 1;
    const s = (L.scale ?? 1) * (spec.rig.lineup?.scale?.[L.id] ?? 1);
    const exprId = L.expr || C.default_expression;
    const ex = C.expressions[exprId];
    if (!ex) throw new Error(`Unknown expression ${exprId} for ${L.id}`);
    const exDef = C.expression_defaults?.[exprId] || {};
    const talk = clamp(L.talk ?? 0);
    const hop = L.hop ?? 0;
    const breath = Math.sin(TAU * (t / 1.7 + ph));
    const hasTicks = ex.elements.some(e => e.role === 'tick');
    const tickTock = hasTicks ? (Math.floor(t * 2) % 2 ? 1 : -1) * 1.4 : 0;
    const tilt = (L.tilt ?? 0) + Math.sin(TAU * (t / 2.9 + ph)) * 1.2 + tickTock + talk * Math.sin(t * TAU * 1.9) * 2;
    const sq = (L.squash ?? 0) + breath * 0.014 + talk * 0.025 * Math.sin(t * TAU * 4.1);
    const exprAge = L.expr_age ?? 9;
    const pop = exprAge < 0.2 ? (1 - exprAge / 0.2) * 0.08 : 0;
    const legs = legPose(L, t, ph);
    if (hop > 0 && C.action?.leg_stretch) legs.stretch += Math.min(C.action.leg_stretch, hop * 0.4);

    const gName = L.gesture || 'rest';
    const gAge = L.gesture_age ?? 9;
    const g = GESTURES[gName];
    if (!g) throw new Error(`Unknown gesture ${gName}`);
    const cur = handTargets(C, gName, t, gAge);
    let hands = cur;
    if (L.gesture_prev && L.gesture_prev !== gName && gAge < 0.28) {
      const prev = handTargets(C, L.gesture_prev, t, 9);
      const m = ease(clamp(gAge / 0.28));
      hands = {
        L: [prev.L[0] + (cur.L[0] - prev.L[0]) * m, prev.L[1] + (cur.L[1] - prev.L[1]) * m],
        R: [prev.R[0] + (cur.R[0] - prev.R[0]) * m, prev.R[1] + (cur.R[1] - prev.R[1]) * m],
      };
    }
    const len = restLen(C);
    for (const side of ['L', 'R']) {
      if (!g[side]) hands[side][1] += breath * 2.5;
      hands[side][1] -= talk * len * 0.1 * Math.max(0, Math.sin(t * TAU * 2.6 + (side === 'L' ? 0 : 1.3)));
    }
    const front = g.front || '';
    const propName = L.prop === undefined ? (g.prop || (gName === 'signature' ? C.signature.prop : null)) : L.prop;

    ctx.save();
    ctx.translate(L.x, L.y);
    ctx.scale(s, s);
    ctx.globalAlpha *= L.alpha ?? 1;
    const half = (A.shell[2] - A.shell[0]) / 2;
    shadowEllipse(ctx, spec, 0, 2, half * 0.85 * (1 - clamp(hop / 400) * 0.5), 14);
    ctx.save();
    ctx.translate(0, -A.ground - hop);
    if (f < 0) ctx.scale(-1, 1);

    for (const e of C.body) {
      const lift = legs.lift[e.side] || 0;
      if (e.role === 'leg') {
        const top = e.y - legs.stretch;
        paint(ctx, Object.assign({}, e, {y: top, h: e.h + legs.stretch - lift}));
      } else {
        ctx.save();
        ctx.translate(0, -lift);
        paint(ctx, e);
        ctx.restore();
      }
    }

    ctx.translate(0, -legs.stretch);
    about(ctx, [0, A.hip], () => {
      ctx.rotate(tilt * DEG);
      ctx.scale(1 + sq, 1 - sq);
    });
    const shellC = [(A.shell[0] + A.shell[2]) / 2, (A.shell[1] + A.shell[3]) / 2];
    if (pop) about(ctx, shellC, () => ctx.scale(1 + pop, 1 + pop));

    const angles = {};
    const arm = side => {
      angles[side] = drawArm(ctx, C, side, hands[side]);
      const over = propName && C.props[propName] && side === 'R';
      if (over && !C.props[propName].over_hand) drawProp(ctx, C, propName, hands.R, angles.R);
      drawHand(ctx, C, hands[side], g.big === side, g.fists);
      if (over && C.props[propName].over_hand) drawProp(ctx, C, propName, hands.R, angles.R);
    };
    for (const side of ['L', 'R']) if (!front.includes(side)) arm(side);

    const hasPupil = ex.elements.some(e => e.role === 'pupil');
    const blinkN = Math.floor((t + ph * 3) / 3.3);
    const blinkAt = blinkN * 3.3 + 0.4 + hashN(blinkN, ph) * 2.2 - ph * 3;
    const bt = (t - blinkAt) / 0.16;
    const blink = L.blink ?? (bt > 0 && bt < 1 ? 1 - Math.abs(bt * 2 - 1) : 0);
    const look = [(L.look ?? 0), (L.look_y ?? 0)];
    const flip = L.arrow_flip ?? exDef.arrow_flip ?? 0;
    const ticks = L.ticks;
    const press = clamp(L.press ?? (gName === 'press' ? clamp(gAge / 0.15) * (gAge < 0.6 ? 1 : 0) : 0));

    for (const e of ex.elements) {
      ctx.save();
      const r = e.role;
      if (r === 'eye' || r === 'eye_hi' || r === 'pupil') {
        const k = r === 'pupil' ? 7 : r === 'eye_hi' ? 6 : hasPupil ? 2 : 5;
        ctx.translate(look[0] * k, look[1] * k);
        if (blink && (e.tag === 'ellipse' || e.tag === 'circle')) {
          about(ctx, [0, A.eyes[1]], () => ctx.scale(1, 1 - 0.92 * blink));
        }
        paint(ctx, e);
      } else if (r === 'mouth') {
        about(ctx, A.mouth, () => ctx.scale(1 - 0.1 * talk, 1 + 1.5 * talk));
        paint(ctx, e);
      } else if (r === 'brow') {
        const sg = e.side === 'L' ? 1 : -1;
        ctx.translate(0, L.brow_y ?? 0);
        about(ctx, e.c, () => ctx.rotate(sg * (L.brow ?? 0) * DEG));
        paint(ctx, e);
      } else if (r === 'hair') {
        const j = L.jitter ?? 0.25;
        about(ctx, [0, A.shell[1] + 8], () => {
          ctx.rotate(Math.sin(t * TAU * 6.5 + ph * 9) * j * 6 * DEG);
          ctx.scale(1, 1 + 0.1 * j * Math.sin(t * TAU * 4.3));
        });
        paint(ctx, e);
      } else if (r === 'belt') {
        paint(ctx, e, {dashOffset: -t * 48 * (L.belt ?? 1)});
      } else if (r === 'tick') {
        const lit = ticks != null && e.index < Math.round(clamp(ticks) * 12);
        paint(ctx, e, lit ? {fill: L.tick_color || '#E8685A', op: 1} : null);
      } else if (r === 'button_cap' || r === 'button_stem') {
        ctx.translate(0, press * (r === 'button_cap' ? 12 : 8));
        paint(ctx, e);
      } else if (r === 'sweat') {
        ctx.translate(0, Math.abs(Math.sin(t * TAU * 1.3)) * 5);
        paint(ctx, e);
      } else if (r === 'blush') {
        paint(ctx, e, {alpha: L.blush ?? 1});
      } else {
        paint(ctx, e);
      }
      ctx.restore();
      if (r === 'antenna' && C.arrow) {
        ctx.save();
        about(ctx, A.arrow, () => {
          ctx.rotate((L.arrow_rot ?? 0) * DEG);
          ctx.scale(1, Math.cos(Math.PI * clamp(flip)));
        });
        paint(ctx, C.arrow);
        ctx.restore();
      }
    }
    if ((flip > 0.06 && flip < 0.94) || L.fx) for (const e of C.action?.fx || []) paint(ctx, e);

    if (propName && !C.props[propName]) {
      const mx = (hands.L[0] + hands.R[0]) / 2, my = Math.max(hands.L[1], hands.R[1]);
      carry(ctx, spec, propName, mx, my + 34, 1.15);
    }
    for (const side of ['L', 'R']) if (front.includes(side)) arm(side);
    if (g.snap && gAge < 0.35) {
      const hp = hands[g.snap];
      ctx.strokeStyle = spec.palette.ink;
      ctx.lineWidth = 6;
      ctx.lineCap = 'round';
      const k = 1 + gAge * 2;
      for (let i = 0; i < 5; i++) {
        const a = (-150 + i * 30) * DEG;
        ctx.beginPath();
        ctx.moveTo(hp[0] + Math.cos(a) * 26 * k, hp[1] + Math.sin(a) * 26 * k);
        ctx.lineTo(hp[0] + Math.cos(a) * 46 * k, hp[1] + Math.sin(a) * 46 * k);
        ctx.stroke();
      }
    }
    ctx.restore();

    const top = -A.ground - hop - legs.stretch + A.shell[1];
    if (L.sign) {
      const sg = L.sign;
      const w = sg.w ?? 360, h = sg.h ?? 120;
      const sx = (sg.dx ?? 0), sy = top - h - (sg.dy ?? 20) + Math.sin(t * TAU * 1.6) * 6;
      ctx.save();
      ctx.translate(sx, sy + h / 2);
      ctx.rotate(((sg.rot ?? 0) + Math.sin(t * TAU * 0.9) * 2) * DEG);
      ctx.strokeStyle = spec.palette.ink;
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.moveTo(0, h / 2);
      ctx.lineTo(0, h / 2 + 60);
      ctx.stroke();
      rr(ctx, -w / 2, -h / 2, w, h, 18);
      inked(ctx, spec, col(spec, sg.color, spec.palette.white), 6);
      ctx.fillStyle = col(spec, sg.text_color, spec.palette.ink);
      ctx.font = font(spec, 900, sg.size ?? 48);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(sg.text, 0, 3);
      ctx.restore();
    }
    marks(ctx, spec, L.marks, 0, top, half * 2, t);
    ctx.restore();
  }

  // ---------- emphasis ----------

  function impactLines(ctx, L, spec) {
    const r = rng(L.seed ?? 3);
    ctx.save();
    ctx.translate(L.x, L.y);
    ctx.fillStyle = col(spec, L.color, spec.palette.ink);
    ctx.globalAlpha = L.alpha ?? 1;
    const n = L.count ?? 28;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU + r() * 0.08;
      const r0 = L.r0 * (0.9 + r() * 0.25);
      const r1 = L.r1 * (0.85 + r() * 0.3);
      const wdt = (L.width ?? 0.035) * (0.6 + r() * 0.8);
      ctx.beginPath();
      ctx.moveTo(Math.cos(a - wdt) * r0, Math.sin(a - wdt) * r0);
      ctx.lineTo(Math.cos(a) * r1, Math.sin(a) * r1);
      ctx.lineTo(Math.cos(a + wdt) * r0, Math.sin(a + wdt) * r0);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  function kineticNumber(ctx, L, spec) {
    const p = spec.palette;
    const prog = Math.max(0, Math.min(1, L.progress ?? 1));
    const k = 1 + (1 - ease(prog)) * 1.4;
    const size = (L.size ?? 360) * k;
    ctx.save();
    ctx.translate(L.x, L.y);
    ctx.rotate((L.rot ?? 0) * DEG);
    if (L.burst !== false) {
      impactLines(ctx, {x: 0, y: 0, r0: size * 0.62, r1: size * (L.burst_scale ?? 1.25), count: 30, color: L.burst_color || 'ink', alpha: 0.9, seed: 11}, spec);
      ctx.beginPath();
      ctx.arc(0, 0, size * 0.66, 0, TAU);
      ctx.fillStyle = col(spec, L.disc, p.yellow);
      ctx.fill();
    }
    ctx.font = font(spec, 900, size);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const off = size * 0.045;
    ctx.fillStyle = p.ink;
    ctx.fillText(L.text, off, off + size * 0.04);
    ctx.lineWidth = size * 0.05;
    ctx.strokeStyle = p.ink;
    ctx.lineJoin = 'round';
    ctx.strokeText(L.text, 0, size * 0.04);
    ctx.fillStyle = col(spec, L.color, p.red);
    ctx.fillText(L.text, 0, size * 0.04);
    if (L.caption) {
      const cy = size * 0.62;
      ctx.font = font(spec, 900, L.caption_size ?? 64);
      const tw = ctx.measureText(L.caption).width;
      rr(ctx, -tw / 2 - 30, cy - 46, tw + 60, 92, 46);
      inked(ctx, spec, p.ink, 4);
      ctx.fillStyle = p.white;
      ctx.fillText(L.caption, 0, cy + 2);
    }
    ctx.restore();
  }

  function stamp(ctx, L, spec) {
    const p = spec.palette;
    const c = col(spec, L.color, p.red);
    ctx.save();
    const prog = clamp(L.progress ?? 1);
    ctx.translate(L.x, L.y);
    ctx.rotate(((L.rot ?? -12) + (1 - prog) * 18) * DEG);
    const k = 1 + (1 - Math.min(1, prog * 1.15)) * 1.8;
    ctx.scale(k, k);
    ctx.font = font(spec, 900, L.size ?? 72);
    const tw = ctx.measureText(L.text).width;
    const w = tw + 70, h = (L.size ?? 72) * 1.5;
    ctx.globalAlpha *= 0.95 * Math.min(1, prog * 3);
    if (L.paper) {
      rr(ctx, -w / 2, -h / 2, w, h, 14);
      ctx.fillStyle = col(spec, L.paper, p.white);
      ctx.fill();
    }
    rr(ctx, -w / 2, -h / 2, w, h, 14);
    ctx.lineWidth = 10;
    ctx.strokeStyle = c;
    ctx.stroke();
    rr(ctx, -w / 2 + 12, -h / 2 + 12, w - 24, h - 24, 8);
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.fillStyle = c;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(L.text, 0, 4);
    ctx.restore();
  }

  function tag(ctx, L, spec) {
    const p = spec.palette;
    ctx.save();
    ctx.font = font(spec, 900, L.size ?? 40);
    const tw = ctx.measureText(L.text).width;
    const w = tw + 44, h = (L.size ?? 40) * 1.6;
    const bg = col(spec, L.color, p.ink);
    ctx.translate(L.x, L.y);
    ctx.rotate((L.rot ?? 0) * DEG);
    if (L.pointer) {
      ctx.beginPath();
      ctx.moveTo(-16, h / 2 - 2);
      ctx.lineTo(L.pointer[0], L.pointer[1]);
      ctx.lineTo(16, h / 2 - 2);
      ctx.closePath();
      inked(ctx, spec, bg, 4);
    }
    rr(ctx, -w / 2, -h / 2, w, h, h / 2);
    inked(ctx, spec, bg, 4);
    ctx.fillStyle = col(spec, L.text_color, p.white);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(L.text, 0, 2);
    ctx.restore();
  }

  function label(ctx, L, spec) {
    const p = spec.palette;
    ctx.save();
    ctx.translate(L.x, L.y);
    ctx.rotate((L.rot ?? 0) * DEG);
    ctx.font = font(spec, L.weight ?? 900, L.size ?? 64);
    ctx.textAlign = L.align || 'center';
    ctx.textBaseline = 'middle';
    if (L.outline) {
      ctx.lineWidth = L.outline;
      ctx.strokeStyle = p.ink;
      ctx.lineJoin = 'round';
      ctx.strokeText(L.text, 0, 0);
    }
    ctx.fillStyle = col(spec, L.color, p.ink);
    ctx.fillText(L.text, 0, 0);
    ctx.restore();
  }

  function arrow(ctx, L, spec) {
    const p = spec.palette;
    const [x0, y0] = L.from, [x1, y1] = L.to;
    const [cx, cy] = L.via || [(x0 + x1) / 2, (y0 + y1) / 2 - 80];
    ctx.save();
    ctx.strokeStyle = col(spec, L.color, p.ink);
    ctx.lineWidth = L.width ?? 8;
    ctx.lineCap = 'round';
    if (L.dashed) ctx.setLineDash([18, 16]);
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.quadraticCurveTo(cx, cy, x1, y1);
    ctx.stroke();
    ctx.setLineDash([]);
    const a = Math.atan2(y1 - cy, x1 - cx);
    ctx.fillStyle = col(spec, L.color, p.ink);
    ctx.beginPath();
    ctx.moveTo(x1 + Math.cos(a) * 10, y1 + Math.sin(a) * 10);
    ctx.lineTo(x1 + Math.cos(a + 2.5) * 34, y1 + Math.sin(a + 2.5) * 34);
    ctx.lineTo(x1 + Math.cos(a - 2.5) * 34, y1 + Math.sin(a - 2.5) * 34);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function tally(ctx, L, spec) {
    const p = spec.palette;
    const strokes = [
      [[-40, -50], [40, -50]],
      [[0, -50], [0, 50]],
      [[0, 0], [34, 0]],
      [[-26, -6], [-26, 50]],
      [[-50, 50], [50, 50]],
    ].slice(0, L.strokes ?? 5);
    ctx.save();
    ctx.translate(L.x, L.y);
    ctx.scale(L.scale ?? 1, L.scale ?? 1);
    ctx.lineCap = 'round';
    for (const [[a, b], [c, d]] of strokes) {
      ctx.strokeStyle = p.ink;
      ctx.lineWidth = 22;
      ctx.beginPath();
      ctx.moveTo(a, b);
      ctx.lineTo(c, d);
      ctx.stroke();
      ctx.strokeStyle = col(spec, L.color, p.red);
      ctx.lineWidth = 12;
      ctx.beginPath();
      ctx.moveTo(a, b);
      ctx.lineTo(c, d);
      ctx.stroke();
    }
    ctx.restore();
  }

  function dim(ctx, L, spec, W, H) {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const g = ctx.createRadialGradient(L.x ?? W / 2, L.y ?? H / 2, 100, L.x ?? W / 2, L.y ?? H / 2, W * 0.75);
    g.addColorStop(0, `rgba(20,24,33,${(L.alpha ?? 0.4) * 0.3})`);
    g.addColorStop(1, `rgba(20,24,33,${L.alpha ?? 0.4})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  function fill(ctx, L, spec, W, H) {
    ctx.save();
    ctx.fillStyle = col(spec, L.color, spec.palette.wall);
    ctx.fillRect(-W, -H, W * 3, H * 3);
    if (L.dots) {
      ctx.fillStyle = col(spec, L.dots, spec.palette.ink);
      ctx.globalAlpha = 0.08;
      for (let y = -H; y < H * 2; y += 44) {
        for (let x = -W + ((y / 44) % 2) * 22; x < W * 2; x += 44) {
          ctx.beginPath();
          ctx.arc(x, y, 5, 0, TAU);
          ctx.fill();
        }
      }
    }
    ctx.restore();
  }

  function panel(ctx, L, spec, W, H, frame) {
    const [x, y, w, h] = L.rect;
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();
    ctx.translate(x, y);
    applyCamera(ctx, L.camera, w, h);
    drawLayers(ctx, L.layers || [], spec, w, h, frame);
    ctx.restore();
    if (L.title) {
      tag(ctx, Object.assign({x: x + w / 2, y: y + 70, size: 46}, L.title), spec);
    }
  }

  function divider(ctx, L, spec, W, H) {
    const p = spec.palette;
    ctx.save();
    ctx.fillStyle = p.ink;
    const x = L.x ?? W / 2;
    const zig = L.zig ?? 0;
    // Optional vertical extent so the divider can stop above text (notes, subtitles).
    const y0 = L.y0 ?? 0, y1 = L.y1 ?? H;
    ctx.beginPath();
    ctx.moveTo(x - 10, y0);
    for (let y = y0; y <= y1; y += 60) ctx.lineTo(x - 10 + ((y / 60) % 2 ? zig : 0), y);
    ctx.lineTo(x - 10, y1);
    ctx.lineTo(x + 10, y1);
    for (let y = y1; y >= y0; y -= 60) ctx.lineTo(x + 10 + ((y / 60) % 2 ? zig : 0), y);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // ---------- cards, charts, timers ----------

  function card(ctx, L, spec) {
    const p = spec.palette;
    const lines = Array.isArray(L.text) ? L.text : [L.text];
    const size = L.size ?? 56;
    ctx.save();
    ctx.translate(L.x, L.y);
    ctx.rotate((L.rot ?? 0) * DEG);
    ctx.font = font(spec, 900, size);
    const tw = Math.max(...lines.map(t => ctx.measureText(t).width));
    const w = L.w ?? tw + 90;
    const head = L.header ? size * 0.9 : 0;
    const h = L.h ?? lines.length * size * 1.3 + 60 + head;
    rr(ctx, -w / 2 + 10, -h / 2 + 12, w, h, 24);
    ctx.fillStyle = p.shadow;
    ctx.fill();
    rr(ctx, -w / 2, -h / 2, w, h, 24);
    inked(ctx, spec, col(spec, L.color, p.white), 6);
    if (L.header) {
      ctx.save();
      rr(ctx, -w / 2, -h / 2, w, h, 24);
      ctx.clip();
      ctx.fillStyle = col(spec, L.header_color, p.ink);
      ctx.fillRect(-w / 2, -h / 2, w, head + 10);
      ctx.restore();
      ctx.font = font(spec, 700, size * 0.5);
      ctx.fillStyle = p.white;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(L.header, 0, -h / 2 + (head + 10) / 2);
    }
    ctx.font = font(spec, 900, size);
    ctx.fillStyle = col(spec, L.text_color, p.ink);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const y0 = -h / 2 + head + 30 + size * 0.65;
    lines.forEach((t, i) => ctx.fillText(t, 0, y0 + i * size * 1.3));
    ctx.restore();
  }

  function barCompare(ctx, L, spec) {
    const p = spec.palette;
    const prog = clamp(L.progress ?? 1);
    const rows = L.rows || [];
    const max = L.max ?? Math.max(...rows.map(r => r.value));
    const lw = L.label_w ?? 300;
    const bw = (L.w ?? 1000) - lw;
    const rh = L.row_h ?? 84;
    const gap = L.gap ?? 40;
    ctx.save();
    ctx.translate(L.x, L.y);
    rows.forEach((r, i) => {
      const y = i * (rh + gap);
      ctx.font = font(spec, 900, L.label_size ?? 46);
      ctx.fillStyle = p.ink;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(r.label, lw - 30, y + rh / 2);
      const len = bw * (r.value / max) * ease(prog);
      rr(ctx, lw, y, Math.max(rh, len), rh, rh / 2);
      inked(ctx, spec, col(spec, r.color, p.teal), 6);
      if (r.text && prog > 0.6) {
        ctx.globalAlpha = clamp((prog - 0.6) / 0.3);
        ctx.font = font(spec, 700, L.value_size ?? 34);
        ctx.fillStyle = p.white;
        ctx.textAlign = 'right';
        ctx.fillText(r.text, lw + Math.max(rh, len) - 26, y + rh / 2 + 2);
        ctx.globalAlpha = 1;
      }
    });
    if (L.diff && rows.length >= 2) {
      const dp = clamp(L.diff.progress ?? 0);
      const a = bw * (Math.min(rows[0].value, rows[1].value) / max);
      const b = bw * (Math.max(rows[0].value, rows[1].value) / max);
      const i = rows[0].value > rows[1].value ? 0 : 1;
      const y = i * (rh + gap);
      if (dp > 0) {
        const lift = ease(dp) * (L.diff.lift ?? 0);
        ctx.save();
        ctx.translate(0, -lift);
        rr(ctx, lw + a, y - 8, b - a, rh + 16, 16);
        ctx.fillStyle = col(spec, L.diff.color, p.yellow);
        ctx.fill();
        ctx.lineWidth = 6;
        ctx.strokeStyle = p.ink;
        ctx.setLineDash([14, 10]);
        ctx.stroke();
        ctx.restore();
      }
    }
    ctx.restore();
  }

  function stopwatch(ctx, L, spec) {
    const p = spec.palette;
    const r = L.r ?? 120;
    ctx.save();
    ctx.translate(L.x, L.y);
    ctx.rotate((L.rot ?? 0) * DEG);
    rr(ctx, -22, -r - 46, 44, 34, 8);
    inked(ctx, spec, col(spec, L.color, p.dida), 6);
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, TAU);
    inked(ctx, spec, col(spec, L.color, p.dida), 8);
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.84, 0, TAU);
    inked(ctx, spec, p.white, 5);
    if (L.sweep) {
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, r * 0.8, -Math.PI / 2, -Math.PI / 2 + L.sweep * DEG);
      ctx.closePath();
      ctx.fillStyle = col(spec, L.sweep_color, p.yellow);
      ctx.fill();
    }
    ctx.strokeStyle = p.ink;
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * TAU;
      ctx.lineWidth = i % 3 ? 3 : 6;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * r * 0.68, Math.sin(a) * r * 0.68);
      ctx.lineTo(Math.cos(a) * r * 0.78, Math.sin(a) * r * 0.78);
      ctx.stroke();
    }
    const ha = ((L.angle ?? 0) - 90) * DEG;
    ctx.strokeStyle = p.red;
    ctx.lineWidth = 8;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(ha) * r * 0.7, Math.sin(ha) * r * 0.7);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, 12, 0, TAU);
    inked(ctx, spec, p.ink, 2);
    if (L.label) {
      ctx.font = font(spec, 900, L.label_size ?? 44);
      ctx.fillStyle = p.ink;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(L.label, 0, r + 50);
    }
    ctx.restore();
  }

  function mysteryBox(ctx, L, spec) {
    const p = spec.palette;
    const open = clamp(L.open ?? 0);
    const s = L.scale ?? 1;
    ctx.save();
    ctx.translate(L.x, L.y);
    ctx.scale(s, s);
    if (open > 0) {
      const bh = (L.bar ?? 0.5) * 220 * ease(clamp((open - 0.3) / 0.7));
      rr(ctx, -16, -60 - bh, 32, bh + 10, 10);
      inked(ctx, spec, col(spec, L.bar_color, p.red), 5);
    }
    rr(ctx, -46, -60, 92, 70, 8);
    inked(ctx, spec, p.box, 5);
    ctx.save();
    ctx.translate(-50, -60);
    ctx.rotate(-ease(clamp(open / 0.5)) * 110 * DEG);
    rr(ctx, 0, -18, 100, 20, 6);
    inked(ctx, spec, p.box, 5);
    ctx.restore();
    if (open < 0.4) {
      ctx.fillStyle = p.ink;
      ctx.font = font(spec, 900, 48);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('?', 0, -24);
    }
    ctx.restore();
  }

  // Top view car, nose pointing +x. Body, windows, wheels, rear lamps (lit when braking).
  function topCar(ctx, spec, w, h, fill, brake) {
    const p = spec.palette;
    ctx.fillStyle = p.ink;
    for (const [x, y] of [[-w * 0.3, -h / 2 - 3], [w * 0.22, -h / 2 - 3], [-w * 0.3, h / 2 - 5], [w * 0.22, h / 2 - 5]]) rr(ctx, x - w * 0.09, y, w * 0.18, 8, 3), ctx.fill();
    rr(ctx, -w / 2, -h / 2, w, h, h * 0.35);
    inked(ctx, spec, fill, Math.max(3, h * 0.09));
    ctx.fillStyle = p.screen;
    rr(ctx, w * 0.08, -h * 0.36, w * 0.2, h * 0.72, 4); ctx.fill();
    rr(ctx, -w * 0.36, -h * 0.32, w * 0.14, h * 0.64, 4); ctx.fill();
    ctx.fillStyle = brake ? p.red : p.lamp_off;
    rr(ctx, -w / 2 - 4, -h * 0.42, 10, h * 0.26, 3); ctx.fill();
    rr(ctx, -w / 2 - 4, h * 0.16, 10, h * 0.26, 3); ctx.fill();
    if (brake) {
      ctx.lineWidth = 3; ctx.strokeStyle = p.ink;
      rr(ctx, -w / 2 - 4, -h * 0.42, 10, h * 0.26, 3); ctx.stroke();
      rr(ctx, -w / 2 - 4, h * 0.16, 10, h * 0.26, 3); ctx.stroke();
    }
  }

  // Rear view of cars on a road in simple perspective (school run, commute). Each car: {lane, depth 0..1, color, brake}.
  function trafficRear(ctx, L, spec, W, H) {
    const p = spec.palette;
    const hz = L.horizon ?? 380, vx = L.vanish_x ?? W / 2;
    ctx.fillStyle = col(spec, L.sky, p.wall_top); ctx.fillRect(0, 0, W, hz);
    ctx.fillStyle = col(spec, L.ground, p.floor); ctx.fillRect(0, hz, W, H - hz);
    const lanes = L.lanes ?? 3, roadW = L.road_w ?? W * 1.5;
    ctx.beginPath(); ctx.moveTo(vx - 30, hz); ctx.lineTo(vx + 30, hz); ctx.lineTo(vx + roadW / 2, H); ctx.lineTo(vx - roadW / 2, H); ctx.closePath();
    inked(ctx, spec, col(spec, L.road, p.navy), 5);
    ctx.strokeStyle = p.lane; ctx.lineWidth = 6; ctx.setLineDash([40, 40]);
    for (let i = 1; i < lanes; i++) {
      const f = i / lanes - 0.5;
      ctx.beginPath(); ctx.moveTo(vx + f * 60, hz); ctx.lineTo(vx + f * roadW, H); ctx.stroke();
    }
    ctx.setLineDash([]);
    const cars = [...(L.cars || [])].sort((a, b) => a.depth - b.depth);
    for (const c of cars) {
      const k = 1 - c.depth;                       // 1 = nearest
      const y = hz + (H - hz) * (0.08 + 0.92 * k * k);
      const sc = 0.12 + 0.88 * k * k;
      const laneF = (c.lane + 0.5) / lanes - 0.5;
      const x = vx + laneF * (60 + (roadW - 60) * ((y - hz) / (H - hz)));
      const w = (L.car_w ?? 420) * sc, h = w * 0.62;
      ctx.save();
      ctx.translate(x, y);
      ctx.fillStyle = p.shadow; ctx.beginPath(); ctx.ellipse(0, 4, w * 0.56, h * 0.08, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = p.ink; rr(ctx, -w * 0.42, -h * 0.12, w * 0.18, h * 0.16, 4); ctx.fill(); rr(ctx, w * 0.24, -h * 0.12, w * 0.18, h * 0.16, 4); ctx.fill();
      ctx.beginPath(); rr(ctx, -w * 0.36, -h, w * 0.72, h * 0.5, h * 0.14); inked(ctx, spec, col(spec, c.color, p.goods_a), Math.max(2, 6 * sc));
      ctx.fillStyle = p.screen; rr(ctx, -w * 0.28, -h * 0.92, w * 0.56, h * 0.34, h * 0.08); ctx.fill();
      ctx.beginPath(); rr(ctx, -w / 2, -h * 0.56, w, h * 0.5, h * 0.12); inked(ctx, spec, col(spec, c.color, p.goods_a), Math.max(2, 6 * sc));
      ctx.fillStyle = p.white; rr(ctx, -w * 0.13, -h * 0.4, w * 0.26, h * 0.12, 3); ctx.fill();
      for (const sg of [-1, 1]) {
        ctx.beginPath(); rr(ctx, sg > 0 ? w * 0.28 : -w * 0.46, -h * 0.48, w * 0.18, h * 0.14, h * 0.05);
        inked(ctx, spec, c.brake ? p.red : p.lamp_off, Math.max(1.5, 4 * sc));
      }
      ctx.restore();
    }
  }

  // Car interior frame: windshield pillars and a dashboard with a steering wheel, drawn over the scene.
  function windshield(ctx, L, spec, W, H) {
    const p = spec.palette;
    const dash = L.dash_y ?? H - 200;
    ctx.fillStyle = col(spec, L.color, p.ip_navy);
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(W, 0); ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath();
    ctx.moveTo(150, 70); ctx.lineTo(160, dash); ctx.lineTo(W - 160, dash); ctx.lineTo(W - 150, 70); ctx.closePath();
    ctx.fill('evenodd');
    ctx.strokeStyle = p.ink; ctx.lineWidth = 6; ctx.stroke();
    ctx.beginPath(); ctx.arc(L.wheel_x ?? W * 0.3, dash + 170, 190, Math.PI * 1.08, Math.PI * 1.92);
    ctx.lineWidth = 34; ctx.strokeStyle = p.navy; ctx.stroke();
  }

  // Speed-coloured tokens on a closed loop (ring road, conveyor, orbit). Data comes from the episode's simulation.
  function speedColor(spec, v, L) {
    const p = spec.palette;
    if (v <= (L.slow ?? 0.15)) return col(spec, L.slow_color, p.red);
    if (v <= (L.mid ?? 0.6)) return col(spec, L.mid_color, p.yellow);
    return col(spec, L.fast_color, p.teal);
  }

  function loopTrack(ctx, L, spec) {
    const p = spec.palette;
    const r = L.r ?? 300, lane = L.lane ?? 70;
    ctx.save();
    ctx.translate(L.x, L.y);
    ctx.beginPath();
    ctx.arc(10, 14, r + lane / 2, 0, TAU);
    ctx.arc(10, 14, r - lane / 2, 0, TAU, true);
    ctx.fillStyle = p.shadow;
    ctx.fill('evenodd');
    ctx.beginPath();
    ctx.arc(0, 0, r + lane / 2, 0, TAU);
    ctx.arc(0, 0, r - lane / 2, 0, TAU, true);
    ctx.fillStyle = col(spec, L.road, p.lane);
    ctx.fill('evenodd');
    ctx.lineWidth = L.stroke ?? 5;
    ctx.strokeStyle = p.ink;
    ctx.beginPath(); ctx.arc(0, 0, r + lane / 2, 0, TAU); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, r - lane / 2, 0, TAU); ctx.stroke();
    ctx.setLineDash([16, 18]);
    ctx.lineWidth = 3;
    ctx.strokeStyle = col(spec, L.center_line, p.lane_edge);
    ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.stroke();
    ctx.setLineDash([]);
    // Bold band behind a cluster (e.g. a jam): a solid arc on the road, no glow.
    for (const band of L.bands || []) {
      ctx.save();
      ctx.strokeStyle = col(spec, band.color, p.red);
      ctx.globalAlpha *= band.alpha ?? 0.35;
      ctx.lineWidth = lane * (band.width ?? 1);
      ctx.lineCap = 'round';
      const d = L.dir ?? 1;
      ctx.beginPath();
      ctx.arc(0, 0, r, -Math.PI / 2 + band.a0 * TAU * d, -Math.PI / 2 + band.a1 * TAU * d, d < 0);
      ctx.stroke();
      ctx.restore();
    }
    const cw = L.token_w ?? 34, ch = L.token_h ?? 22;
    for (const tk of L.tokens || []) {
      const a = -Math.PI / 2 + tk.a * TAU * (L.dir ?? 1);
      ctx.save();
      ctx.translate(Math.cos(a) * r, Math.sin(a) * r);
      ctx.rotate(a + Math.PI / 2 * (L.dir ?? 1));
      const fill = tk.color ? col(spec, tk.color) : speedColor(spec, tk.v ?? 1, L);
      if (L.token_style === 'car') topCar(ctx, spec, cw, ch, fill, !!tk.brake);
      else {
        rr(ctx, -cw / 2, -ch / 2, cw, ch, 6);
        inked(ctx, spec, fill, tk.focus ? 5 : 3.5);
        if (tk.brake) {
          ctx.fillStyle = p.red;
          ctx.fillRect(-cw / 2 - 2, -ch / 2 + 2, 6, 6);
          ctx.fillRect(-cw / 2 - 2, ch / 2 - 8, 6, 6);
        }
      }
      ctx.restore();
    }
    // Marker riding the loop (e.g. where braking is happening) with a trail showing where it came from.
    for (const m of L.markers || []) {
      const d = L.dir ?? 1;
      const am = -Math.PI / 2 + m.a * TAU * d;
      if (m.trail != null) {
        const at = -Math.PI / 2 + m.trail * TAU * d;
        ctx.save();
        ctx.strokeStyle = col(spec, m.color, p.red);
        ctx.lineWidth = 12;
        ctx.setLineDash([22, 18]);
        ctx.lineCap = 'round';
        const rt = r + lane / 2 + 40;
        ctx.beginPath();
        ctx.arc(0, 0, rt, Math.min(at, am), Math.max(at, am));
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
      }
      ctx.save();
      const rm = r + lane / 2 + 40;
      ctx.translate(Math.cos(am) * rm, Math.sin(am) * rm);
      ctx.rotate(am + Math.PI / 2);
      ctx.beginPath();
      const s = m.size ?? 46;
      ctx.moveTo(0, s * 0.9);
      ctx.lineTo(-s * 0.7, -s * 0.5);
      ctx.lineTo(s * 0.7, -s * 0.5);
      ctx.closePath();
      inked(ctx, spec, col(spec, m.color, p.red), 6);
      ctx.restore();
    }
    ctx.restore();
  }

  // Trajectory (space-time) plot: one polyline per agent, segments coloured by speed. Points are [x0..1, y0..1, v0..1].
  function trajectoryPlot(ctx, L, spec) {
    const p = spec.palette;
    const {x, y, w, h} = L;
    ctx.save();
    rr(ctx, x - 24, y - 24, w + 48, h + 48, 20);
    inked(ctx, spec, col(spec, L.bg, p.white), 5);
    ctx.lineCap = 'round';
    ctx.lineWidth = L.width ?? 3;
    for (const line of L.series || []) {
      for (let i = 1; i < line.length; i++) {
        const [ax, ay] = line[i - 1], [bx, by, bv] = line[i];
        if (Math.abs(bx - ax) > 0.5) continue;
        ctx.strokeStyle = speedColor(spec, bv, L);
        ctx.beginPath();
        ctx.moveTo(x + ax * w, y + h - ay * h);
        ctx.lineTo(x + bx * w, y + h - by * h);
        ctx.stroke();
      }
    }
    ctx.strokeStyle = p.ink;
    ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + h); ctx.lineTo(x + w, y + h); ctx.stroke();
    ctx.fillStyle = p.ink;
    ctx.font = font(spec, 700, L.label_size ?? 34);
    ctx.textBaseline = 'top';
    ctx.textAlign = 'right';
    if (L.xlabel) ctx.fillText(L.xlabel, x + w, y + h + 10);
    ctx.save();
    ctx.translate(x - 34, y);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';
    if (L.ylabel) ctx.fillText(L.ylabel, 0, 0);
    ctx.restore();
    ctx.restore();
  }

  const COMPONENTS = {
    fill, backdrop, lane, service_point: servicePoint, queue_line: queueLine,
    person: (ctx, L, spec, W, H, frame) => person(ctx, spec, L, frame), character,
    kinetic_number: kineticNumber, stamp, tag, label, arrow, tally,
    impact_lines: impactLines, dim, panel, divider,
    card, bar_compare: barCompare, stopwatch, mystery_box: mysteryBox,
    loop_track: loopTrack, trajectory_plot: trajectoryPlot, traffic_rear: trafficRear, windshield,
  };

  // fx_* are written by the timeline for enter/exit moves; stills may set them by hand.
  function drawLayers(ctx, layers, spec, W, H, frame) {
    for (const L of layers) {
      if (L.visible === false) continue;
      const fn = COMPONENTS[L.type];
      if (!fn) throw new Error(`Unknown kit component: ${L.type}`);
      ctx.save();
      if (L.fx_alpha != null) ctx.globalAlpha *= clamp(L.fx_alpha);
      if (L.fx_scale != null || L.fx_dx || L.fx_dy || L.fx_rot) {
        const o = L.fx_origin || [L.x ?? W / 2, L.y ?? H / 2];
        ctx.translate(o[0] + (L.fx_dx || 0), o[1] + (L.fx_dy || 0));
        ctx.rotate((L.fx_rot || 0) * DEG);
        const k = L.fx_scale ?? 1;
        ctx.scale(k, k);
        ctx.translate(-o[0], -o[1]);
      }
      if (ctx.globalAlpha > 0.001) fn(ctx, L, spec, W, H, frame);
      ctx.restore();
    }
  }

  // ---------- HUD: fixed to the frame, never moved by the camera ----------

  function hud(ctx, shot, spec, W, H) {
    const p = spec.palette;
    const safe = spec.safe;
    if (spec.hud?.series) {
      ctx.save();
      ctx.font = font(spec, 700, 30);
      ctx.textBaseline = 'middle';
      const tw = ctx.measureText(spec.hud.series).width;
      rr(ctx, safe.x, safe.y, tw + 40, 54, 27);
      ctx.fillStyle = 'rgba(19,35,46,0.82)';
      ctx.fill();
      ctx.fillStyle = p.white;
      ctx.fillText(spec.hud.series, safe.x + 20, safe.y + 28);
      ctx.restore();
    }
    for (const chip of shot.chips || []) {
      ctx.save();
      ctx.globalAlpha *= chip.alpha ?? 1;
      ctx.font = font(spec, 700, 28);
      ctx.textBaseline = 'middle';
      const tw = ctx.measureText(chip.text).width;
      const w = tw + 36;
      const x = chip.corner === 'br' ? W - safe.x - w : safe.x;
      const y = H - safe.y - 210;
      rr(ctx, x, y, w, 48, 10);
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = p.ink;
      ctx.stroke();
      ctx.fillStyle = p.ink;
      ctx.fillText(chip.text, x + 18, y + 25);
      ctx.restore();
    }
    if (shot.footnote) {
      ctx.save();
      ctx.font = font(spec, 400, 24);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const fw = ctx.measureText(shot.footnote).width;
      rr(ctx, (W - fw) / 2 - 18, H - safe.y - 8, fw + 36, 36, 18);
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.fill();
      ctx.fillStyle = p.ink;
      ctx.fillText(shot.footnote, W / 2, H - safe.y + 10);
      ctx.restore();
    }
    if (shot.subtitle) {
      const sub = shot.subtitle;
      ctx.save();
      ctx.globalAlpha *= clamp(sub.alpha ?? 1);
      ctx.font = font(spec, 700, 46);
      ctx.textBaseline = 'middle';
      const nameW = sub.speaker ? ctx.measureText(sub.speaker + '  ').width : 0;
      const tw = ctx.measureText(sub.text).width + nameW;
      const maxW = W - safe.x * 2;
      if (tw + 80 > maxW) throw new Error(`Subtitle too wide for safe area in ${shot.id}`);
      const x = (W - tw) / 2;
      const y = H - safe.y - 70 + (1 - clamp(sub.alpha ?? 1)) * 14;
      rr(ctx, x - 40, y - 42, tw + 80, 84, 22);
      ctx.fillStyle = 'rgba(19,35,46,0.9)';
      ctx.fill();
      if (sub.speaker) {
        const c = {等等: p.dengdeng, 阿规: p.agui_light, 嘀嗒: p.dida_light}[sub.speaker] || p.white;
        ctx.fillStyle = c;
        ctx.fillText(sub.speaker, x, y + 2);
      }
      ctx.fillStyle = p.white;
      ctx.fillText(sub.text, x + nameW, y + 2);
      ctx.restore();
    }
  }

  function drawScene(ctx, spec, shot, frame) {
    const [W, H] = spec.size;
    const fr = frame || {t: shot.t ?? 0};
    ctx.save();
    ctx.fillStyle = spec.palette.wall;
    ctx.fillRect(0, 0, W, H);
    applyCamera(ctx, shot.camera, W, H);
    drawLayers(ctx, shot.layers || [], spec, W, H, fr);
    ctx.restore();
    drawLayers(ctx, shot.overlay || [], spec, W, H, fr);
  }

  function renderShot(ctx, spec, shot, frame) {
    const [W, H] = spec.size;
    drawScene(ctx, spec, shot, frame);
    hud(ctx, shot, spec, W, H);
  }

  // Scene-to-scene moves. `a` and `b` are canvases holding the outgoing and incoming scene.
  function transition(ctx, a, b, type, p, W, H, opt) {
    const e = ease(clamp(p));
    const s = clamp(p) * clamp(p) * (3 - 2 * clamp(p));
    ctx.save();
    if (type === 'whip') {
      const dir = opt?.dir ?? -1;
      ctx.drawImage(a, dir * W * s, 0);
      ctx.drawImage(b, -dir * W * (1 - s), 0);
      ctx.globalAlpha = Math.sin(Math.PI * s) * 0.5;
      ctx.fillStyle = '#13232E';
      const r = rng(11);
      for (let i = 0; i < 26; i++) {
        const y = r() * H, w = 200 + r() * 700;
        ctx.fillRect((r() * W * 1.4 - 200) + dir * s * 300, y, w, 3 + r() * 6);
      }
    } else if (type === 'iris') {
      ctx.drawImage(a, 0, 0);
      const [cx, cy] = opt?.at || [W / 2, H / 2];
      ctx.beginPath();
      ctx.arc(cx, cy, Math.hypot(W, H) * s, 0, TAU);
      ctx.clip();
      ctx.drawImage(b, 0, 0);
    } else if (type === 'wipe') {
      ctx.drawImage(a, 0, 0);
      const x = (W + 400) * s - 200;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(x + 200, 0);
      ctx.lineTo(x - 200, H);
      ctx.lineTo(0, H);
      ctx.closePath();
      ctx.save();
      ctx.clip();
      ctx.drawImage(b, 0, 0);
      ctx.restore();
      ctx.strokeStyle = '#F2A541';
      ctx.lineWidth = 26;
      ctx.beginPath();
      ctx.moveTo(x + 200, 0);
      ctx.lineTo(x - 200, H);
      ctx.stroke();
    } else if (type === 'push') {
      ctx.drawImage(a, 0, -H * s);
      ctx.drawImage(b, 0, H * (1 - s));
    } else if (type === 'zoom') {
      ctx.save();
      ctx.translate(W / 2, H / 2);
      ctx.scale(1 + s * 0.6, 1 + s * 0.6);
      ctx.globalAlpha = 1 - s;
      ctx.drawImage(a, -W / 2, -H / 2);
      ctx.restore();
      ctx.globalAlpha = s;
      ctx.translate(W / 2, H / 2);
      ctx.scale(0.85 + 0.15 * e, 0.85 + 0.15 * e);
      ctx.drawImage(b, -W / 2, -H / 2);
    } else if (type === 'flash') {
      ctx.drawImage(p < 0.5 ? a : b, 0, 0);
      ctx.globalAlpha = 1 - Math.abs(p * 2 - 1);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, W, H);
    } else {
      ctx.drawImage(b, 0, 0);
    }
    ctx.restore();
  }

  root.SWKit = {renderShot, drawScene, hud, transition, components: Object.keys(COMPONENTS), gestures: Object.keys(GESTURES)};
})(typeof window !== 'undefined' ? window : globalThis);
