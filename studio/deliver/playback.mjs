// Real-player check for the publish file: play it end to end in real Google Chrome at 1x over
// HTTP with range requests (how a browser or app streams a download), assert time is monotonic
// and 'ended' fires at the duration, then seek to 10%…90% and assert each seek lands.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

export function contrastRatio(a, b) {
  const lum = ([r, g, b]) => {
    const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

// Judge a playback event log. Pure, so it is unit-tested.
export function judgePlayback(log, duration, tol = 0.5) {
  const errs = [];
  const times = log.filter((e) => e.type === 'tick').map((e) => e.t);
  for (let i = 1; i < times.length; i++) {
    if (times[i] < times[i - 1]) errs.push(`time went backwards ${times[i - 1]}->${times[i]}`);
    if (times[i] - times[i - 1] > 3) errs.push(`time jumped ${times[i - 1]}->${times[i]}`);
  }
  const ended = log.find((e) => e.type === 'ended');
  if (!ended) errs.push('no ended event');
  else if (Math.abs(ended.t - duration) > tol) errs.push(`ended at ${ended.t}, expected ${duration}`);
  for (const e of log) if (e.type === 'error') errs.push(`media error ${e.code}`);
  return { ok: errs.length === 0, errors: errs };
}

function serve(file) {
  const size = fs.statSync(file).size;
  const srv = http.createServer((req, res) => {
    if (req.url === '/') { res.setHeader('Content-Type', 'text/html'); res.end('<video id=v muted playsinline src="/v.mp4"></video>'); return; }
    const m = /bytes=(\d+)-(\d*)/.exec(req.headers.range || '');
    const s = m ? +m[1] : 0, e = m && m[2] ? +m[2] : size - 1;
    res.writeHead(m ? 206 : 200, { 'Content-Type': 'video/mp4', 'Accept-Ranges': 'bytes',
      'Content-Length': e - s + 1, ...(m ? { 'Content-Range': `bytes ${s}-${e}/${size}` } : {}) });
    fs.createReadStream(file, { start: s, end: e }).pipe(res);
  });
  return new Promise((r) => srv.listen(0, '127.0.0.1', () => r(srv)));
}

export async function playInChrome(file, { channel = 'chrome' } = {}) {
  const { chromium } = await import('playwright');
  const duration = +execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file]).toString();
  const srv = await serve(path.resolve(file));
  const browser = await chromium.launch({ channel, args: ['--autoplay-policy=no-user-gesture-required'] });
  try {
    const page = await browser.newPage();
    await page.goto(`http://127.0.0.1:${srv.address().port}/`);
    const log = await page.evaluate((dur) => new Promise((done) => {
      const v = document.getElementById('v'); const log = [];
      for (const t of ['stalled', 'waiting', 'ended', 'error']) v.addEventListener(t, () => {
        log.push({ type: t, t: v.currentTime, code: v.error?.code });
        if (t === 'ended' || t === 'error') { clearInterval(iv); log.push({ type: 'frames', n: v.webkitDecodedFrameCount }); done(log); }
      });
      const iv = setInterval(() => log.push({ type: 'tick', t: v.currentTime }), 1000);
      setTimeout(() => { clearInterval(iv); done(log); }, (dur + 20) * 1000);
      v.play().catch((e) => { log.push({ type: 'error', code: String(e) }); done(log); });
    }), duration);
    // seek test
    const seeks = await page.evaluate(async (dur) => {
      const v = document.getElementById('v'); const out = [];
      for (let i = 1; i <= 9; i++) {
        const target = (dur * i) / 10; v.currentTime = target;
        const landed = await Promise.race([
          new Promise((r) => v.addEventListener('seeked', () => r(true), { once: true })),
          new Promise((r) => setTimeout(() => r(false), 8000)),
        ]);
        out.push({ target, got: v.currentTime, ok: landed && Math.abs(v.currentTime - target) < 0.5 && !v.ended && v.readyState >= 2 });
      }
      return out;
    }, duration);
    const verdict = judgePlayback(log, duration);
    if (seeks.some((s) => !s.ok)) { verdict.ok = false; verdict.errors.push('seek failed'); }
    return { file, duration, ...verdict, seeks, log };
  } finally { await browser.close(); srv.close(); }
}
