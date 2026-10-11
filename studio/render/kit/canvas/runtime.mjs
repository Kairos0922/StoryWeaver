// Shared by render_stills.mjs and build_episode.mjs: one page shell, one font path, one browser launcher,
// so a still and the matching video frame come out of the same code.
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {resolveEpisodeFonts} from '../fonts/library.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const browserDir = path.resolve(here, '..', '..', 'browser');
export const KIT_JS = path.join(here, 'kit.js');
export const TIMELINE_JS = path.join(here, 'timeline.js');
export const POST_JS = path.join(browserDir, 'post.js');
export const COMPOSE_JS = path.join(browserDir, 'compositor.js');
export const THREE_LAYER_JS = path.join(browserDir, 'three_layer.js');
export const PRESETS_JSON = path.join(browserDir, 'presets.json');
export const THREE_MODULE = path.resolve(here, '..', '..', '..', '..', 'node_modules', 'three', 'build', 'three.module.js');
export const SUBSET_PY = path.join(here, '..', 'fonts', 'subset_fonts.py');
export const GLYPHS_PY = path.join(here, '..', 'fonts', 'glyphs.py');
export const FONT_FAMILY = 'SW CJK';
export const FONT_WEIGHTS = [400, 500, 700, 900];

export function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, {encoding: 'utf8', maxBuffer: 1 << 30, ...opts});
  if (r.error) throw new Error(`${cmd}: ${r.error.message}`);
  if (r.status !== 0 && !opts.allowFail) throw new Error(`${cmd} ${args.slice(0, 4).join(' ')} … exited ${r.status}\n${(r.stderr || '').slice(-2000)}`);
  return r;
}

function which(bin) {
  const r = spawnSync('sh', ['-c', `command -v ${bin}`], {encoding: 'utf8'});
  return r.status === 0 ? r.stdout.trim() : null;
}

// Playwright's bundled Chromium by default; CHROME=/path overrides; a system Chrome is the fallback.
export async function launchBrowser() {
  let pw = null;
  for (const name of ['playwright', 'playwright-core']) {
    try {
      pw = await import(name);
      break;
    } catch {}
  }
  if (!pw) throw new Error('Playwright is missing. Run: npm install && npx playwright install chromium');
  const chromium = pw.chromium || pw.default?.chromium;
  const args = [
    '--force-color-profile=srgb',
    '--font-render-hinting=none',
    '--disable-lcd-text',
    '--hide-scrollbars',
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--enable-webgl',
    '--ignore-gpu-blocklist',
  ];
  if (process.env.CHROME) return chromium.launch({executablePath: process.env.CHROME, args});
  try {
    return await chromium.launch({args});
  } catch (err) {
    for (const bin of ['google-chrome-stable', 'chromium', 'chromium-browser']) {
      const exe = which(bin);
      if (exe) return chromium.launch({executablePath: exe, args});
    }
    throw new Error(`${err.message}\nNo browser found. Run: npx playwright install chromium (or set CHROME=/path/to/chrome)`);
  }
}

export function collectChars(...values) {
  const set = new Set();
  const walk = v => {
    if (typeof v === 'string') for (const ch of v) set.add(ch);
    else if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === 'object') Object.values(v).forEach(walk);
  };
  values.forEach(walk);
  for (let c = 0x20; c < 0x7f; c++) set.add(String.fromCharCode(c));
  return [...set].filter(ch => !/\s/.test(ch)).sort().join('');
}

// Subset the episode's faces to exactly the characters on screen and embed them as WOFF2.
// Default faces are Noto Sans CJK SC from fontconfig; `overrides` (weight -> library font from
// resolveEpisodeFonts) swap individual weights. Fails when any character lacks a glyph.
export async function embedFonts(chars, dir, overrides = {}) {
  await fs.mkdir(dir, {recursive: true});
  const textFile = path.join(dir, 'chars.txt');
  await fs.writeFile(textFile, chars);
  const extra = [];
  for (const [w, f] of Object.entries(overrides)) {
    extra.push('--face', `${w}=${f.file}`);
    if (f.whole) extra.push('--whole', String(w));
  }
  const r = run('python3', [SUBSET_PY, '--text-file', textFile, '--out-dir', dir, '--weights', FONT_WEIGHTS.join(','), ...extra], {allowFail: true});
  let report;
  try {
    report = JSON.parse(r.stdout);
  } catch {
    throw new Error(`font subset failed: ${r.stderr || r.stdout}`);
  }
  if (report.error) throw new Error(report.error);
  const missing = Object.entries(report.missing || {});
  if (missing.length) throw new Error(`Missing glyphs: ${missing.map(([w, s]) => `${w}: ${s}`).join('; ')}`);
  const mime = {woff2: 'font/woff2', woff: 'font/woff', opentype: 'font/otf', truetype: 'font/ttf'};
  const faces = [];
  for (const f of report.fonts) {
    const o = overrides[f.weight];
    if (o) Object.assign(f, {library_id: o.id, license: o.license, license_file: o.license_file, copyright: o.copyright});
    const fmt = f.format || 'woff2';
    const b64 = (await fs.readFile(f.file)).toString('base64');
    faces.push(`@font-face{font-family:"${FONT_FAMILY}";font-weight:${f.weight};font-style:normal;src:url(data:${mime[fmt]};base64,${b64}) format("${fmt}");}`);
  }
  return {css: faces.join('\n'), report};
}

// Every character the episode puts on screen: lines (text + speaker), scene text, HUD.
export async function episodeChars(episodeDir, ...extra) {
  const read = async file => {
    try {
      return JSON.parse(await fs.readFile(path.join(episodeDir, file), 'utf8'));
    } catch {
      return null;
    }
  };
  const lines = await read('lines.json');
  const scenes = await read('render/scenes.json');
  const stills = await read('render/stills.json');
  return collectChars(scenes || {}, (lines?.lines || []).map(l => [l.text, l.speaker]), stills?.hud || {}, ...extra);
}

// Missing-glyph check for ANY face the episode will use (default Noto or a brief-picked library
// font). No subsetting. Returns {ok, skipped, detail, missing}.
export async function episodeGlyphCheck(episodeDir, opts = {}) {
  const chars = await episodeChars(episodeDir);
  let overrides;
  try {
    ({overrides} = await resolveEpisodeFonts(episodeDir, opts));
  } catch (err) {
    return {ok: false, detail: err.message, missing: {}};
  }
  const faces = [];
  for (const w of FONT_WEIGHTS) {
    if (overrides[w]) faces.push(`${w}=${overrides[w].file}`);
    else {
      const env = process.env[`SW_FONT_${w}`];
      if (env) faces.push(`${w}=${env}:${process.env[`SW_FONT_${w}_INDEX`] || 0}`);
      else {
        const m = spawnSync('fc-match', ['-f', '%{file}\n%{index}\n%{family}', `Noto Sans CJK SC:style=${{400: 'Regular', 500: 'Medium', 700: 'Bold', 900: 'Black'}[w]}`], {encoding: 'utf8'});
        const [file, index, fam] = (m.stdout || '').split('\n');
        if (m.status !== 0 || !file || !/Noto Sans CJK/.test(fam || '')) return {ok: false, detail: `no Noto Sans CJK SC face for weight ${w} (install fonts-noto-cjk or set SW_FONT_${w})`, missing: {}};
        faces.push(`${w}=${file}:${index || 0}`);
      }
    }
  }
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'sw-glyphs-'));
  const textFile = path.join(dir, 'chars.txt');
  await fs.writeFile(textFile, chars);
  const r = spawnSync('python3', [GLYPHS_PY, '--text-file', textFile, ...faces.flatMap(f => ['--face', f])], {encoding: 'utf8'});
  let report;
  try {
    report = JSON.parse(r.stdout);
  } catch {
    return {ok: false, detail: `glyph check failed: ${(r.stderr || '').slice(-400)}`, missing: {}};
  }
  if (report.error) return {ok: false, detail: report.error, missing: {}};
  const missing = report.missing || {};
  const bad = Object.entries(missing);
  const used = Object.entries(overrides).map(([w, f]) => `${w}=${f.id}`).join(', ') || 'Noto default';
  return {
    ok: bad.length === 0,
    detail: bad.length ? `missing glyphs: ${bad.map(([w, s]) => `${w}: ${s}`).join('; ')}` : `${report.chars} chars covered (${used})`,
    missing,
  };
}

export async function loadStyle(episodeDir) {
  const style = JSON.parse(await fs.readFile(path.join(episodeDir, 'render', 'stills.json'), 'utf8'));
  const rigPath = path.resolve(episodeDir, style.rig || '../ip/sprites/rig.json');
  const rig = JSON.parse(await fs.readFile(rigPath, 'utf8'));
  const spec = {
    size: style.size,
    safe: style.safe,
    hud: style.hud,
    palette: style.palette,
    fonts: {family: `"${FONT_FAMILY}", ${style.fonts.family}`},
    rig,
  };
  return {style, spec, rigPath};
}

// `boot` runs after fonts are loaded; it must define the window.__* entry points the caller uses.
export async function pageHtml({spec, css, data, boot, includeThree = false}) {
  const [w, h] = spec.size;
  const kit = await fs.readFile(KIT_JS, 'utf8');
  const timeline = await fs.readFile(TIMELINE_JS, 'utf8');
  const post = await fs.readFile(POST_JS, 'utf8');
  const compose = await fs.readFile(COMPOSE_JS, 'utf8');
  const threeLayer = await fs.readFile(THREE_LAYER_JS, 'utf8');
  const presets = await fs.readFile(PRESETS_JSON, 'utf8');
  const weights = FONT_WEIGHTS.map(wt => `${wt} 40px "${FONT_FAMILY}"`);
  const threeTag = includeThree
    ? `<script type="module">
import * as THREE from 'http://storyweaver.local/three.module.js';
window.THREE = THREE;
window.__threeReady = true;
Promise.resolve(window.__boot && window.__boot()).catch(error => { window.__error = String(error && error.stack || error); });
</script>`
    : '';
  return `<!doctype html><html><head><meta charset="utf-8"><style>${css}
html,body{margin:0;padding:0;background:#000;overflow:hidden}canvas{display:block}</style>
${threeTag}</head>
<body><canvas id="c" width="${w}" height="${h}"></canvas>
<script>window.__postPresets = ${presets};</script>
<script>${kit}</script>
<script>${timeline}</script>
<script>${post}</script>
<script>${threeLayer}</script>
<script>${compose}</script>
<script>
window.__spec = ${JSON.stringify(spec)};
window.__data = ${JSON.stringify(data || {})};
window.__needsThree = ${includeThree ? 'true' : 'false'};
async function __boot() {
  try {
    const probe = ${JSON.stringify(collectChars(data || {}).slice(0, 400))};
    for (const f of ${JSON.stringify(weights)}) await document.fonts.load(f, probe);
    for (const f of ${JSON.stringify(weights)}) if (!document.fonts.check(f, '看规')) throw new Error('embedded font not usable: ' + f);
    const canvas = document.getElementById('c');
    const ctx = canvas.getContext('2d');
    const png = () => canvas.toDataURL('image/png').slice(22);
    ${boot}
    window.__ready = true;
  } catch (e) {
    window.__error = String(e && e.stack || e);
  }
}
window.__boot = __boot;
if (!window.__needsThree) __boot();
</script></body></html>`;
}

export async function openPage(browser, html, spec, {includeThree = false} = {}) {
  const [width, height] = spec.size;
  const page = await browser.newPage({viewport: {width, height}, deviceScaleFactor: 1});
  page.on('pageerror', err => {
    page.__err = err;
  });
  if (includeThree) {
    const threeSource = await fs.readFile(THREE_MODULE);
    await page.route('http://storyweaver.local/**', route => {
      const url = new URL(route.request().url());
      if (url.pathname === '/index.html') {
        return route.fulfill({status: 200, contentType: 'text/html; charset=utf-8', body: html});
      }
      if (url.pathname === '/three.module.js') {
        return route.fulfill({status: 200, contentType: 'text/javascript; charset=utf-8', body: threeSource});
      }
      return route.abort();
    });
    await page.goto('http://storyweaver.local/index.html', {waitUntil: 'load'});
  } else {
    await page.setContent(html, {waitUntil: 'load'});
  }
  await page.waitForFunction(() => window.__ready === true || window.__error, null, {timeout: 120_000});
  const err = await page.evaluate(() => window.__error || null);
  if (err) throw new Error(`page boot failed: ${err}`);
  return page;
}

export async function tmpDir(prefix) {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix));
}
