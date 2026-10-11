// One frame = stack of layers, then the WebGL post pass.
// Layer kinds: canvas2d (shared kit), svg, dom, kinetic (DOM stage snapshot), three.
// seek(t) only. SVG/DOM must not declare CSS or SMIL animation.
// The kinetic stage is seeked outside this file, snapshotted, then presented here.
(function (root) {
  'use strict';

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

  async function finish(destCtx, spec, shot, opts) {
    const [w, h] = spec.size;
    const bag = processorFor(destCtx.canvas, w, h);
    const preset = presetByName(opts.presets, opts.presetName || shot.post);
    bag.processor.apply(bag.picture, opts.t, opts.fps || 30, preset);
    destCtx.setTransform(1, 0, 0, 1, 0, 0);
    destCtx.clearRect(0, 0, w, h);
    destCtx.drawImage(bag.glCanvas, 0, 0, w, h);
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

  async function presentPicture(destCtx, img, spec, shot, opts) {
    const [w, h] = spec.size;
    const bag = processorFor(destCtx.canvas, w, h);
    const picture = bag.picture.getContext('2d');
    picture.setTransform(1, 0, 0, 1, 0, 0);
    picture.clearRect(0, 0, w, h);
    picture.drawImage(img, 0, 0, w, h);
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
    stackOf,
    presetByName,
    paintStill,
    paintFrame,
    presentPicture,
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
