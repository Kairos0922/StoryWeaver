// One frame = stack of layers, then the WebGL post pass.
// Layer kinds: canvas2d (shared kit), svg, dom, three.
// seek(t) only. SVG/DOM must not declare CSS or SMIL animation.
(function (root) {
  'use strict';

  const DRAFT_WATERMARK = 'Not human-reviewed';
  const svgCache = new Map();

  function stackOf(shot) {
    if (Array.isArray(shot.stack) && shot.stack.length) return shot.stack;
    return [{kind: 'canvas2d'}];
  }

  function presetByName(presets, name) {
    const table = presets && presets.presets ? presets.presets : presets;
    const key = name || (presets && presets.default) || 'explainer';
    const preset = table && table[key];
    if (!preset) throw new Error(`Unknown post preset: ${key}`);
    return {name: key, ...preset};
  }

  function assertStaticMarkup(markup) {
    if (/<animate|requestAnimationFrame|@keyframes|animation\s*:/i.test(markup)) {
      throw new Error('SVG and DOM layers cannot animate themselves. Change the markup from t.');
    }
  }

  function markupFor(layer, t, w, h) {
    if (layer.kind === 'dom') {
      const style = layer.style || '';
      assertStaticMarkup(style + (layer.html || ''));
      return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><foreignObject x="0" y="0" width="${w}" height="${h}"><div xmlns="http://www.w3.org/1999/xhtml" style="${style}">${layer.html || ''}</div></foreignObject></svg>`;
    }
    assertStaticMarkup(layer.markup || '');
    return String(layer.markup || '').replaceAll('{{t}}', Number(t).toFixed(4));
  }

  function loadSvg(markup) {
    const hit = svgCache.get(markup);
    if (hit) return hit;
    const pending = new Promise((resolve, reject) => {
      const blob = new Blob([markup], {type: 'image/svg+xml;charset=utf-8'});
      const url = URL.createObjectURL(blob);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve(img);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('SVG/DOM layer failed to rasterize'));
      };
      img.src = url;
    });
    svgCache.set(markup, pending);
    return pending;
  }

  async function paintStack(ctx, spec, shot, opts) {
    const [w, h] = spec.size;
    for (const layer of stackOf(shot)) {
      const kind = layer.kind || 'canvas2d';
      if (kind === 'canvas2d') {
        if (opts.still) root.SWKit.renderShot(ctx, spec, shot, {t: opts.t});
        else root.SWKit.drawScene(ctx, spec, shot, {t: opts.t});
      } else if (kind === 'svg' || kind === 'dom') {
        const img = await loadSvg(markupFor(layer, opts.t, w, h));
        const x = layer.x || 0;
        const y = layer.y || 0;
        const dw = layer.w || w;
        const dh = layer.h || h;
        ctx.drawImage(img, x, y, dw, dh);
      } else if (kind === 'three') {
        root.SWThree.draw(ctx, layer, opts.t, w, h);
      } else {
        throw new Error(`Unknown layer kind: ${kind}`);
      }
    }
  }

  function processorFor(dest, w, h) {
    if (!dest.__swPost) {
      const picture = document.createElement('canvas');
      picture.width = w;
      picture.height = h;
      const glCanvas = document.createElement('canvas');
      glCanvas.width = w;
      glCanvas.height = h;
      dest.__swPost = {
        picture,
        glCanvas,
        processor: root.SWPost.createProcessor(glCanvas, w, h),
      };
    }
    return dest.__swPost;
  }

  function drawDraftMark(ctx, spec, w, h) {
    const text = DRAFT_WATERMARK;
    ctx.save();
    ctx.font = `500 28px ${spec.fonts.family}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    const tw = ctx.measureText(text).width;
    const bw = tw + 36;
    const bh = 44;
    const x = w - (spec.safe?.x || 48) - bw;
    const y = h - (spec.safe?.y || 48) - bh;
    ctx.fillStyle = 'rgba(19, 35, 46, 0.82)';
    ctx.fillRect(x, y, bw, bh);
    ctx.fillStyle = '#F6F1E7';
    ctx.fillText(text, x + 18, y + bh / 2);
    ctx.restore();
  }

  async function finish(destCtx, spec, shot, opts) {
    const [w, h] = spec.size;
    const bag = processorFor(destCtx.canvas, w, h);
    const preset = presetByName(opts.presets, opts.presetName || shot.post);
    bag.processor.apply(bag.picture, opts.t, opts.fps || 30, preset);
    destCtx.setTransform(1, 0, 0, 1, 0, 0);
    destCtx.clearRect(0, 0, w, h);
    destCtx.drawImage(bag.glCanvas, 0, 0, w, h);
    if (opts.review !== 'release') drawDraftMark(destCtx, spec, w, h);
    return preset.name;
  }

  async function paintStill(destCtx, spec, shot, opts) {
    const [w, h] = spec.size;
    const bag = processorFor(destCtx.canvas, w, h);
    const bctx = bag.picture.getContext('2d');
    bctx.setTransform(1, 0, 0, 1, 0, 0);
    bctx.clearRect(0, 0, w, h);
    await paintStack(bctx, spec, shot, {...opts, still: true});
    if (!opts.skipHud) root.SWKit.hud(bctx, shot, spec, w, h);
    return finish(destCtx, spec, shot, opts);
  }

  async function paintFrame(destCtx, spec, frame, opts) {
    const [w, h] = spec.size;
    const bag = processorFor(destCtx.canvas, w, h);
    const bctx = bag.picture.getContext('2d');
    bctx.setTransform(1, 0, 0, 1, 0, 0);
    bctx.clearRect(0, 0, w, h);
    if (frame.transition) {
      const left = document.createElement('canvas');
      const right = document.createElement('canvas');
      left.width = right.width = w;
      left.height = right.height = h;
      await paintStack(left.getContext('2d'), spec, frame.prev, opts);
      await paintStack(right.getContext('2d'), spec, frame.shot, opts);
      root.SWKit.transition(bctx, left, right, frame.transition.type, frame.transition.p, w, h, frame.transition);
    } else {
      await paintStack(bctx, spec, frame.shot, opts);
    }
    root.SWKit.hud(bctx, frame.shot, spec, w, h);
    return finish(destCtx, spec, frame.shot, opts);
  }

  root.SWCompose = {
    DRAFT_WATERMARK,
    stackOf,
    presetByName,
    paintStill,
    paintFrame,
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
