// Measure qc/motion.json from a finished render, so the motion gates read the picture that was made:
//   texts      every on-screen text (subtitles + layer text) with how long it actually stays up
//   contrast   each text colour against the surface it is drawn on (palette values)
//   luminance  mean luma of every frame of the video (ffmpeg signalstats)
//   sfx        picture events from timeline.json; peaks measured on an SFX-only stem rebuilt from mix_plan.json
//   shots      the move list each scene declares (scenes.json `moves`, or render/moves.json by scene id); not invented here
// Usage: node studio/qc/measure_motion.mjs <episode-dir> [<render-out-dir>]
import fs from 'node:fs/promises';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {TL} from '../render/kit/canvas/build_episode.mjs';
import {loadStyle} from '../render/kit/canvas/runtime.mjs';
import {measurePeaks} from './motion_qc.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const MIX_PY = path.join(here, '..', 'render', 'kit', 'audio', 'mix.py');
const SUB_BG = '#13232E';

function hex(spec, c, fallback) {
  const p = spec.palette;
  const v = (c && p[c]) || c || fallback;
  return /^#[0-9a-f]{6}$/i.test(v) ? v : fallback;
}

export function textsFromScenes(resolved, spec) {
  const texts = [];
  const contrast = [];
  const surface = s => hex(spec, (s.layers.find(L => L.type === 'fill') || {}).color, spec.palette.wall_top || '#FFFFFF');
  for (const s of resolved.scenes) {
    const bg = surface(s);
    const walk = (L, where) => {
      const t0 = Math.max(s.start, L.enter?.at ?? s.start);
      const t1 = Math.min(s.end, L.exit ? L.exit.at + (L.exit.dur ?? 0) : s.end);
      const add = (id, text, fg, on) => {
        if (!text) return;
        texts.push({id, kind: L.type, text, hold_s: +(t1 - t0).toFixed(3)});
        contrast.push({id, fg, bg: on});
      };
      const id = `${s.id}:${where}`;
      const P = spec.palette;
      if (L.type === 'label') add(id, L.text, hex(spec, L.color, P.ink), bg);
      else if (L.type === 'tag') add(id, L.text, P.white, hex(spec, L.color, P.ink));
      else if (L.type === 'stamp') add(id, L.text, hex(spec, L.color, P.ink), hex(spec, L.paper, P.white));
      else if (L.type === 'card') {
        add(id, [].concat(L.text || []).join(''), P.ink, P.white);
        if (L.header) add(`${id}:header`, L.header, P.white, hex(spec, L.header_color, P.ink));
      }
      (L.layers || []).forEach((c, j) => walk(c, `${where}.${j}`));
    };
    s.layers.forEach((L, j) => walk(L, `layers[${j}]`));
    for (const c of s.chips || []) {
      texts.push({id: `${s.id}:chip`, kind: 'chip', text: c.text, hold_s: +(s.end - s.start).toFixed(3)});
      contrast.push({id: `${s.id}:chip`, fg: spec.palette.ink, bg: '#FFFFFF'});
    }
  }
  return {texts, contrast};
}

// Narration subtitle: shown from the line start to sub_end (renderer's display end); audio is start..end.
export function subtitleText(id, l) {
  const shown_end = l.sub_end ?? l.end;
  return {id: `sub:${id}`, kind: 'subtitle', text: l.text, audio_start: l.start, audio_end: l.end,
    shown_start: l.sub_start ?? l.start, shown_end, hold_s: +(shown_end - (l.sub_start ?? l.start)).toFixed(3)};
}

export async function measureMotion(episodeDir, outDir) {
  const doc = JSON.parse(await fs.readFile(path.join(episodeDir, 'render', 'scenes.json'), 'utf8'));
  const tl = JSON.parse(await fs.readFile(path.join(outDir, 'timeline.json'), 'utf8'));
  const {spec} = await loadStyle(episodeDir);
  const timing = tl.timing;
  const resolved = TL.resolveScenes(doc, timing);
  const fps = 30;
  const {texts, contrast} = textsFromScenes(resolved, spec);
  for (const id of timing.order) {
    const l = timing.lines[id];
    texts.push(subtitleText(id, l));
    contrast.push({id: `sub:${id}`, fg: spec.palette.white, bg: SUB_BG});
  }
  const video = (await fs.readdir(outDir)).find(f => f.endsWith('.mp4'));
  const r = spawnSync('ffmpeg', ['-v', 'error', '-i', path.join(outDir, video), '-vf', 'scale=320:-1,signalstats,metadata=print:key=lavfi.signalstats.YAVG:file=-', '-f', 'null', '-'], {encoding: 'utf8', maxBuffer: 1 << 28});
  const luminance = [...r.stdout.matchAll(/YAVG=([\d.]+)/g)].map(m => +(Number(m[1]) / 255).toFixed(4));
  const plan = JSON.parse(await fs.readFile(path.join(outDir, 'mix_plan.json'), 'utf8'));
  const stemPlan = Object.assign({}, plan, {lines: [], bgm: Object.assign({}, plan.bgm, {level: 0, sections: []})});
  const stemPlanFile = path.join(outDir, 'sfx_stem_plan.json');
  const stem = path.join(outDir, 'sfx_stem.wav');
  await fs.writeFile(stemPlanFile, JSON.stringify(stemPlan));
  const mix = spawnSync('python3', [MIX_PY, '--plan', stemPlanFile, '--out', stem], {encoding: 'utf8'});
  if (mix.status !== 0) throw new Error(`sfx stem failed: ${mix.stderr}`);
  const events = plan.sfx.map((e, i) => ({id: `${e.sfx}#${i}`, frame: Math.round(e.t * fps)}));
  const peaks = await measurePeaks(stem, events, fps);
  let movesFile = {};
  try { movesFile = JSON.parse(await fs.readFile(path.join(episodeDir, 'render', 'moves.json'), 'utf8')); } catch {}
  const shots = doc.scenes.map(s => ({id: s.id, moves: s.moves || movesFile[s.id] || []}));
  const motion = {fps, language: 'zh', measured_from: path.relative(episodeDir, outDir), texts, contrast, luminance, sfx: {events, peaks_s: peaks, stem: path.relative(episodeDir, stem)}, shots};
  const file = path.join(episodeDir, 'qc', 'motion.json');
  await fs.mkdir(path.dirname(file), {recursive: true});
  await fs.writeFile(file, JSON.stringify(motion));
  return {file, frames: luminance.length, texts: texts.length, events: events.length};
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [dir, out] = process.argv.slice(2);
  const ep = path.resolve(dir);
  measureMotion(ep, path.resolve(out || path.join(ep, 'out', 'draft', 'full'))).then(r => console.log(JSON.stringify(r)), e => { console.error(e.message); process.exit(1); });
}
