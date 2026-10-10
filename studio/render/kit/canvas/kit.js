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

  function person(ctx, spec, o) {
    const p = spec.palette;
    const s = o.scale ?? 1;
    const fill = col(spec, o.color, p.crowd);
    ctx.save();
    ctx.translate(o.x, o.y);
    ctx.scale(s, s);
    ctx.globalAlpha = o.alpha ?? 1;
    shadowEllipse(ctx, spec, 0, 4, 40, 9);
    const tilt = (o.pose === 'walk' ? -6 : 0) * (o.facing ?? -1);
    ctx.rotate(tilt * DEG);
    rr(ctx, -30, -118, 60, 118, 28);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, -146, 26, 0, TAU);
    ctx.fill();
    const f = o.facing ?? -1;
    if (o.pose === 'wave') {
      ctx.strokeStyle = fill;
      ctx.lineWidth = 16;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-f * 20, -96);
      ctx.lineTo(-f * 52, -150);
      ctx.lineTo(-f * 46, -196);
      ctx.stroke();
      ctx.strokeStyle = p.ink;
      ctx.lineWidth = 4;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.arc(-f * 46, -196, 34 + i * 14, (-f > 0 ? -0.9 : Math.PI - 0.1) , (-f > 0 ? 0.1 : Math.PI + 0.9));
        ctx.globalAlpha = (o.alpha ?? 1) * (0.7 - i * 0.2);
        ctx.stroke();
      }
      ctx.globalAlpha = o.alpha ?? 1;
    }
    if (o.carry) carry(ctx, spec, o.carry, f * 28, -60, 0.9);
    if (o.number != null) {
      ctx.rotate(-tilt * DEG);
      rr(ctx, -24, -222, 48, 40, 12);
      inked(ctx, spec, p.white, 4);
      ctx.fillStyle = p.ink;
      ctx.font = font(spec, 900, 28);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(o.number), 0, -201);
    }
    ctx.restore();
  }

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
      if (d > total) break;
      const seg = segs.find(sg => d <= sg.start + sg.len) || segs[segs.length - 1];
      const t = seg.len ? (d - seg.start) / seg.len : 0;
      out.push({x: seg.x0 + (seg.x1 - seg.x0) * t, y: seg.y0 + (seg.y1 - seg.y0) * t, dir: Math.sign(seg.x0 - seg.x1) || -1});
    }
    return out;
  }

  function queueLine(ctx, L, spec) {
    const p = spec.palette;
    if (L.rope) {
      ctx.save();
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
    const slots = polyPoints(L.points, L.spacing ?? 120, L.count ?? 5, L.offset ?? 0);
    const items = slots.map((pt, i) => Object.assign({
      x: pt.x, y: pt.y, facing: pt.dir, scale: L.scale ?? 1, color: L.color,
      number: L.numbered ? (L.number_from ?? 1) + i : null,
    }, (L.people || {})[i] || {}));
    items.sort((a, b) => a.y - b.y);
    for (const it of items) {
      if (it.skip) continue;
      person(ctx, spec, it);
    }
  }

  // ---------- characters (stand-ins until ip/ sprites are vendored) ----------

  const POSES = {
    basket:       {l: [75, 68], r: [105, 68], hands: 'basket', legs: 'stand', shoulder: 0.5},
    tiptoe:       {l: [75, 68], r: [105, 68], hands: 'basket', legs: 'tiptoe', bob: -14, shoulder: 0.5},
    shock:        {l: [215, 80], r: [-35, 80], legs: 'wide', bob: -8},
    stomp:        {l: [120, 64], r: [60, 64], fists: true, legs: 'stomp', tilt: 6},
    point:        {l: [120, 60], r: [-20, 92], legs: 'stand'},
    point_up:     {l: [120, 60], r: [-55, 90], legs: 'stand'},
    point_camera: {l: [120, 60], r: [10, 70], big_hand: true, legs: 'wide'},
    press_watch:  {l: [-80, 66], r: [-100, 66], legs: 'jump', bob: -30},
    hold_sign:    {l: [-120, 90], r: [-60, 90], legs: 'stand'},
    think:        {l: [120, 60], r: [-150, 60], legs: 'stand', tilt: -4},
    snap:         {l: [120, 60], r: [-60, 80], legs: 'stand', snap: true},
  };

  function limb(ctx, spec, x, y, angle, len, color, handR, fist) {
    const a = angle * DEG;
    const ex = x + Math.cos(a) * len;
    const ey = y + Math.sin(a) * len;
    ctx.strokeStyle = spec.palette.ink;
    ctx.lineWidth = 20;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(ex, ey);
    ctx.stroke();
    ctx.strokeStyle = color;
    ctx.lineWidth = 9;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(ex, ey);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(ex, ey, handR, 0, TAU);
    inked(ctx, spec, color, 5);
    if (fist) {
      ctx.strokeStyle = spec.palette.ink;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(ex - handR * 0.5, ey);
      ctx.lineTo(ex + handR * 0.5, ey);
      ctx.stroke();
    }
    return [ex, ey];
  }

  function legs(ctx, spec, kind, hipY, spread, color) {
    const p = spec.palette;
    const pairs = {
      stand: [[-spread, 0, -spread - 4, 52], [spread, 0, spread + 4, 52]],
      wide: [[-spread, 0, -spread - 26, 50], [spread, 0, spread + 26, 50]],
      tiptoe: [[-spread, 0, -spread, 62], [spread, 0, spread, 62]],
      jump: [[-spread, 0, -spread - 18, 34], [spread, 0, spread + 26, 30]],
      stomp: [[-spread, 0, -spread - 10, 52], [spread, 0, spread + 30, 22]],
    }[kind] || [[-spread, 0, -spread, 52], [spread, 0, spread, 52]];
    for (const [x0, y0, x1, y1] of pairs) {
      ctx.strokeStyle = p.ink;
      ctx.lineWidth = 22;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x0, hipY + y0);
      ctx.lineTo(x1, hipY + y1);
      ctx.stroke();
      ctx.strokeStyle = color;
      ctx.lineWidth = 10;
      ctx.beginPath();
      ctx.moveTo(x0, hipY + y0);
      ctx.lineTo(x1, hipY + y1);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(x1 + (x1 < 0 ? -8 : 8), hipY + y1 + 6, 22, 12, 0, 0, TAU);
      inked(ctx, spec, p.ink, 2);
    }
  }

  function face(ctx, spec, o, cx, cy, sz) {
    const p = spec.palette;
    const look = (o.look ?? o.facing ?? 1) * sz * 0.08;
    const eyeDx = sz * 0.22;
    const eyes = o.eyes || 'normal';
    for (const sx of [-1, 1]) {
      const ex = cx + sx * eyeDx;
      const rx = eyes === 'wide' ? sz * 0.15 : sz * 0.12;
      const ry = eyes === 'wide' ? sz * 0.18 : eyes === 'squint' ? sz * 0.05 : sz * 0.14;
      ctx.beginPath();
      ctx.ellipse(ex, cy, rx, ry, 0, 0, TAU);
      inked(ctx, spec, p.white, 4);
      if (eyes !== 'squint') {
        ctx.fillStyle = p.ink;
        ctx.beginPath();
        ctx.arc(ex + look, cy + (eyes === 'wide' ? 0 : sz * 0.02), eyes === 'wide' ? sz * 0.05 : sz * 0.065, 0, TAU);
        ctx.fill();
        ctx.fillStyle = p.white;
        ctx.beginPath();
        ctx.arc(ex + look - sz * 0.02, cy - sz * 0.03, sz * 0.022, 0, TAU);
        ctx.fill();
      }
      if (o.brows) {
        ctx.strokeStyle = p.ink;
        ctx.lineWidth = 6;
        ctx.lineCap = 'round';
        const tilt = o.brows === 'angry' ? sx * 0.35 : o.brows === 'up' ? -sx * 0.25 : 0;
        ctx.beginPath();
        ctx.moveTo(ex - rx, cy - ry - 14 - tilt * 20 * -1);
        ctx.lineTo(ex + rx, cy - ry - 14 + tilt * 20 * -1);
        ctx.stroke();
      }
    }
    const my = cy + sz * 0.3;
    ctx.strokeStyle = p.ink;
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    const mouth = o.mouth || 'smile';
    ctx.beginPath();
    if (mouth === 'o') {
      ctx.ellipse(cx + look * 0.5, my, sz * 0.08, sz * 0.1, 0, 0, TAU);
      ctx.fillStyle = p.mouth;
      ctx.fill();
      ctx.stroke();
    } else if (mouth === 'shout') {
      ctx.moveTo(cx - sz * 0.14, my - sz * 0.04);
      ctx.quadraticCurveTo(cx, my + sz * 0.22, cx + sz * 0.14, my - sz * 0.04);
      ctx.closePath();
      ctx.fillStyle = p.mouth;
      ctx.fill();
      ctx.stroke();
    } else if (mouth === 'frown') {
      ctx.arc(cx, my + sz * 0.1, sz * 0.1, 1.15 * Math.PI, 1.85 * Math.PI);
      ctx.stroke();
    } else if (mouth === 'flat') {
      ctx.moveTo(cx - sz * 0.08, my);
      ctx.lineTo(cx + sz * 0.08, my);
      ctx.stroke();
    } else if (mouth === 'grin') {
      ctx.moveTo(cx - sz * 0.15, my - sz * 0.03);
      ctx.quadraticCurveTo(cx, my + sz * 0.18, cx + sz * 0.15, my - sz * 0.03);
      ctx.closePath();
      ctx.fillStyle = p.white;
      ctx.fill();
      ctx.stroke();
    } else {
      ctx.arc(cx, my - sz * 0.06, sz * 0.1, 0.2 * Math.PI, 0.8 * Math.PI);
      ctx.stroke();
    }
  }

  function marks(ctx, spec, list, cx, top, w) {
    const p = spec.palette;
    for (const m of list || []) {
      ctx.save();
      if (m === 'anger') {
        ctx.translate(cx + w * 0.55, top + 10);
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
        for (let i = -2; i <= 2; i++) {
          const a = -Math.PI / 2 + i * 0.32;
          ctx.beginPath();
          ctx.moveTo(cx + Math.cos(a) * (w * 0.62), top + 30 + Math.sin(a) * (w * 0.62));
          ctx.lineTo(cx + Math.cos(a) * (w * 0.82), top + 30 + Math.sin(a) * (w * 0.82));
          ctx.stroke();
        }
      } else if (m === 'sweat') {
        ctx.translate(cx - w * 0.6, top + 40);
        ctx.beginPath();
        ctx.moveTo(0, -18);
        ctx.quadraticCurveTo(14, 4, 0, 12);
        ctx.quadraticCurveTo(-14, 4, 0, -18);
        inked(ctx, spec, p.water, 4);
      } else if (m === 'question') {
        ctx.fillStyle = p.ink;
        ctx.font = font(spec, 900, 64);
        ctx.textAlign = 'center';
        ctx.fillText('?', cx + w * 0.62, top + 10);
      }
      ctx.restore();
    }
  }

  function character(ctx, L, spec) {
    const p = spec.palette;
    const id = L.id;
    const pose = Object.assign({}, POSES[L.pose] || POSES.point, L.pose_override || {});
    const s = L.scale ?? 1;
    const f = L.facing ?? 1;
    const color = {dengdeng: p.dengdeng, agui: p.agui, dida: p.dida}[id];
    const dark = {dengdeng: p.dengdeng_dark, agui: p.agui_dark, dida: p.dida_dark}[id];
    ctx.save();
    ctx.translate(L.x, L.y);
    ctx.scale(s, s);
    shadowEllipse(ctx, spec, 0, 4, 90, 18);
    ctx.translate(0, pose.bob ?? 0);
    const dims = {dengdeng: [160, 170, 64], agui: [138, 236, 60], dida: [130, 130, 48]}[id];
    const [bw, bh, hip] = dims;
    legs(ctx, spec, pose.legs, -hip, bw * 0.2, dark);
    ctx.translate(0, -hip);
    ctx.rotate((pose.tilt ?? 0) * f * DEG);
    const top = -bh;
    const cx = 0;
    const handR = pose.big_hand ? 30 : 17;
    const shoulderY = top + bh * (id === 'agui' ? 0.5 : 0.58);
    const flipA = a => (f > 0 ? a : 180 - a);
    const back = () => limb(ctx, spec, -f * bw * (pose.shoulder ?? 0.42), shoulderY, flipA(pose.l[0]), pose.l[1], color, 17, pose.fists);
    back();
    if (id === 'dengdeng') {
      ctx.beginPath();
      ctx.ellipse(cx, top + bh / 2, bw / 2, bh / 2, 0, 0, TAU);
      inked(ctx, spec, color, 7);
      ctx.beginPath();
      ctx.ellipse(cx + f * 6, top + bh * 0.66, bw * 0.3, bh * 0.24, 0, 0, TAU);
      ctx.fillStyle = p.dengdeng_belly;
      ctx.fill();
      ctx.save();
      ctx.translate(cx, top + 6);
      for (const [dx, h, a] of [[-22, 34, -18], [0, 44, 0], [22, 30, 20]]) {
        ctx.save();
        ctx.translate(dx, 0);
        ctx.rotate(a * DEG);
        ctx.beginPath();
        ctx.moveTo(-10, 6);
        ctx.quadraticCurveTo(0, -h, 10, 6);
        inked(ctx, spec, dark, 5);
        ctx.restore();
      }
      ctx.restore();
      face(ctx, spec, Object.assign({facing: f}, L), cx + f * 8, top + bh * 0.36, bw);
    } else if (id === 'agui') {
      rr(ctx, cx - bw / 2, top, bw, bh, 56);
      inked(ctx, spec, color, 7);
      ctx.save();
      rr(ctx, cx - bw / 2, top, bw, bh, 56);
      ctx.clip();
      ctx.fillStyle = p.ruler;
      ctx.fillRect(cx - bw / 2, top + bh * 0.58, bw, 36);
      ctx.strokeStyle = p.ink;
      ctx.lineWidth = 3;
      for (let x = cx - bw / 2 + 10; x < cx + bw / 2; x += 14) {
        ctx.beginPath();
        ctx.moveTo(x, top + bh * 0.58);
        ctx.lineTo(x, top + bh * 0.58 + ((x / 14) % 2 ? 12 : 20));
        ctx.stroke();
      }
      ctx.restore();
      ctx.beginPath();
      ctx.moveTo(cx - 18, top + 4);
      ctx.lineTo(cx, top - 34);
      ctx.lineTo(cx + 18, top + 4);
      inked(ctx, spec, dark, 5);
      face(ctx, spec, Object.assign({facing: f}, L), cx + f * 6, top + bh * 0.26, bw * 0.95);
    } else if (id === 'dida') {
      rr(ctx, cx - 14, top - 30, 28, 22, 6);
      inked(ctx, spec, dark, 5);
      rr(ctx, cx - 26, top - 44, 52, 18, 8);
      inked(ctx, spec, dark, 5);
      ctx.beginPath();
      ctx.arc(cx, top + bh / 2, bw / 2, 0, TAU);
      inked(ctx, spec, color, 7);
      ctx.beginPath();
      ctx.arc(cx, top + bh / 2, bw * 0.39, 0, TAU);
      inked(ctx, spec, p.white, 4);
      ctx.strokeStyle = p.ink;
      ctx.lineWidth = 4;
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * TAU;
        const r0 = bw * (i % 3 ? 0.34 : 0.3);
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * r0, top + bh / 2 + Math.sin(a) * r0);
        ctx.lineTo(cx + Math.cos(a) * bw * 0.37, top + bh / 2 + Math.sin(a) * bw * 0.37);
        ctx.stroke();
      }
      face(ctx, spec, Object.assign({facing: f}, L), cx, top + bh * 0.46, bw * 0.78);
      ctx.strokeStyle = p.red;
      ctx.lineWidth = 5;
      const ha = ((L.hand_deg ?? 300) - 90) * DEG;
      ctx.beginPath();
      ctx.moveTo(cx, top + bh / 2);
      ctx.lineTo(cx + Math.cos(ha) * bw * 0.3, top + bh / 2 + Math.sin(ha) * bw * 0.3);
      ctx.stroke();
    }
    const front = limb(ctx, spec, f * bw * (pose.shoulder ?? 0.42), shoulderY, flipA(pose.r[0]), pose.r[1], color, handR, pose.fists);
    if (pose.hands === 'basket') carry(ctx, spec, L.prop || 'basket_full', 0, top + bh * 1.12, 1.12);
    if (pose.snap) {
      ctx.strokeStyle = p.ink;
      ctx.lineWidth = 5;
      for (let i = 0; i < 3; i++) {
        const a = (-60 + i * 40) * DEG;
        ctx.beginPath();
        ctx.moveTo(front[0] + Math.cos(a) * 28, front[1] + Math.sin(a) * 28);
        ctx.lineTo(front[0] + Math.cos(a) * 48, front[1] + Math.sin(a) * 48);
        ctx.stroke();
      }
    }
    if (L.sign) {
      const sg = L.sign;
      const w = sg.w ?? 360, h = sg.h ?? 120;
      const sx = sg.dx ?? 0, sy = top - h - (sg.dy ?? 20);
      ctx.save();
      ctx.translate(sx, sy + h / 2);
      ctx.rotate((sg.rot ?? 0) * DEG);
      ctx.strokeStyle = p.ink;
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.moveTo(0, h / 2);
      ctx.lineTo(0, h / 2 + 60);
      ctx.stroke();
      rr(ctx, -w / 2, -h / 2, w, h, 18);
      inked(ctx, spec, col(spec, sg.color, p.white), 6);
      ctx.fillStyle = col(spec, sg.text_color, p.ink);
      ctx.font = font(spec, 900, sg.size ?? 48);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(sg.text, 0, 3);
      ctx.restore();
    }
    marks(ctx, spec, L.marks, cx, top, bw);
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
    ctx.translate(L.x, L.y);
    ctx.rotate((L.rot ?? -12) * DEG);
    ctx.font = font(spec, 900, L.size ?? 72);
    const tw = ctx.measureText(L.text).width;
    const w = tw + 70, h = (L.size ?? 72) * 1.5;
    ctx.globalAlpha = 0.95;
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

  function panel(ctx, L, spec) {
    const [x, y, w, h] = L.rect;
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();
    ctx.translate(x, y);
    applyCamera(ctx, L.camera, w, h);
    drawLayers(ctx, L.layers || [], spec, w, h);
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
    ctx.beginPath();
    ctx.moveTo(x - 10, 0);
    for (let y = 0; y <= H; y += 60) ctx.lineTo(x - 10 + ((y / 60) % 2 ? zig : 0), y);
    ctx.lineTo(x + 10, H);
    for (let y = H; y >= 0; y -= 60) ctx.lineTo(x + 10 + ((y / 60) % 2 ? zig : 0), y);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  const COMPONENTS = {
    fill, backdrop, lane, service_point: servicePoint, queue_line: queueLine,
    person: (ctx, L, spec) => person(ctx, spec, L), character,
    kinetic_number: kineticNumber, stamp, tag, label, arrow, tally,
    impact_lines: impactLines, dim, panel, divider,
  };

  function drawLayers(ctx, layers, spec, W, H) {
    for (const L of layers) {
      const fn = COMPONENTS[L.type];
      if (!fn) throw new Error(`Unknown kit component: ${L.type}`);
      ctx.save();
      fn(ctx, L, spec, W, H);
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
      ctx.fillStyle = 'rgba(30,38,51,0.82)';
      ctx.fill();
      ctx.fillStyle = p.white;
      ctx.fillText(spec.hud.series, safe.x + 20, safe.y + 28);
      ctx.restore();
    }
    if (spec.hud?.ai_label) {
      ctx.save();
      ctx.font = font(spec, 700, 26);
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'center';
      const tw = ctx.measureText(spec.hud.ai_label).width;
      const bx = W - safe.x - tw - 36;
      rr(ctx, bx, safe.y + 6, tw + 36, 44, 22);
      ctx.fillStyle = 'rgba(255,255,255,0.86)';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgba(30,38,51,0.6)';
      ctx.stroke();
      ctx.fillStyle = p.ink;
      ctx.fillText(spec.hud.ai_label, bx + (tw + 36) / 2, safe.y + 29);
      ctx.restore();
    }
    for (const chip of shot.chips || []) {
      ctx.save();
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
      ctx.font = font(spec, 700, 46);
      ctx.textBaseline = 'middle';
      const nameW = sub.speaker ? ctx.measureText(sub.speaker + '  ').width : 0;
      const tw = ctx.measureText(sub.text).width + nameW;
      const maxW = W - safe.x * 2;
      if (tw + 80 > maxW) throw new Error(`Subtitle too wide for safe area in ${shot.id}`);
      const x = (W - tw) / 2;
      const y = H - safe.y - 70;
      rr(ctx, x - 40, y - 42, tw + 80, 84, 22);
      ctx.fillStyle = 'rgba(30,38,51,0.88)';
      ctx.fill();
      if (sub.speaker) {
        const c = {等等: p.dengdeng, 阿规: p.agui_light, 嘀嗒: p.dida}[sub.speaker] || p.white;
        ctx.fillStyle = c;
        ctx.fillText(sub.speaker, x, y + 2);
      }
      ctx.fillStyle = p.white;
      ctx.fillText(sub.text, x + nameW, y + 2);
      ctx.restore();
    }
  }

  function renderShot(ctx, spec, shot) {
    const [W, H] = spec.size;
    ctx.save();
    ctx.fillStyle = spec.palette.wall;
    ctx.fillRect(0, 0, W, H);
    applyCamera(ctx, shot.camera, W, H);
    drawLayers(ctx, shot.layers || [], spec, W, H);
    ctx.restore();
    drawLayers(ctx, shot.overlay || [], spec, W, H);
    hud(ctx, shot, spec, W, H);
  }

  root.SWKit = {renderShot, components: Object.keys(COMPONENTS)};
})(typeof window !== 'undefined' ? window : globalThis);
