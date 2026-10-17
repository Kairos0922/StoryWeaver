// Series style lock. One file per series, `series-style.json`, kept in the series working
// directory (outside this repository). Episodes inherit it and may not override a locked key.
// Schema and rules: docs/style-lock.md
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {isAgentSigner, parseFrontMatter} from '../brief.mjs';

async function fileExists(file) {
  try {
    await fs.access(file);
    return true;
  } catch {
    return false;
  }
}

export const SCHEMA = 'storyweaver.series_style.v1';
export const SCHEMA_V2 = 'storyweaver.series_style.v2';
export const LOCK_FILE = 'series-style.json';
export const LOCKED_KEYS = ['palette', 'fonts', 'characters', 'camera', 'line', 'motion'];
const TRANSITIONS = new Set(['push', 'whip', 'wipe', 'zoom', 'iris', 'cut', 'dissolve', 'fade', 'slide', 'spin']);
const COLOR_KEY = /(^|_)(color|fill|stroke|disc|dots|bg|light)$/i;
const HEX = /#[0-9a-f]{3,8}\b/gi;

export async function findStyleLock(episodeDir) {
  const file = path.join(path.resolve(episodeDir), '..', LOCK_FILE);
  if (!(await fileExists(file))) return {file: '', lock: null};
  return {file, lock: JSON.parse(await fs.readFile(file, 'utf8'))};
}

function validateLockedShape(lock) {
  const issues = [];
  for (const key of LOCKED_KEYS) if (!lock?.[key]) issues.push(`missing ${key}`);
  for (const [id, ch] of Object.entries(lock?.characters || {})) {
    const by = String(ch?.approval?.by || '').trim();
    if (!by || isAgentSigner(by) || !/\d{4}-\d{2}-\d{2}/.test(String(ch?.approval?.at || ''))) {
      issues.push(`character ${id} has no human series approval (approval.by / approval.at)`);
    }
  }
  return issues;
}

function isSha256(value) {
  return typeof value === 'string' && /^[0-9a-f]{64}$/.test(value);
}

function humanApproval(value) {
  const by = String(value?.by || '').trim();
  return Boolean(by) && !isAgentSigner(by) && /\d{4}-\d{2}-\d{2}/.test(String(value?.at || ''));
}

// v1 checks the six visual keys. v2 keeps those keys at the top level and adds the
// series-level sections that make 10 episodes feel like one collection: rig, voice,
// open/close, music/mix, cover, glossary. The new sections are optional here so an
// episode can start before the intro/outro assets exist; series audit (week 2) will
// require them for a collection package.
export function validateLock(lock) {
  if (lock?.schema === SCHEMA_V2) return validateLockV2(lock);
  const issues = [];
  if (lock?.schema !== SCHEMA) issues.push(`schema must be ${SCHEMA}`);
  issues.push(...validateLockedShape(lock));
  return issues;
}

export function validateLockV2(lock) {
  const issues = [];
  if (lock?.schema !== SCHEMA_V2) issues.push(`schema must be ${SCHEMA_V2}`);
  issues.push(...validateLockedShape(lock));
  if (!humanApproval(lock?.approval)) issues.push('lock has no human approval (approval.by / approval.at)');
  if (!isSha256(lock?.rig?.sha256)) issues.push('rig.sha256 must be a sha256 hex digest');
  const voice = lock?.voice || {};
  if (!String(voice.provider || '').trim()) issues.push('missing voice.provider');
  if (!String(voice.voice_id || '').trim()) issues.push('missing voice.voice_id');
  if (typeof voice.speech_rate !== 'number') issues.push('voice.speech_rate must be a number');
  if (lock?.open) {
    if (!['fixed', 'template', 'hybrid'].includes(lock.open.mode)) issues.push('open.mode must be fixed/template/hybrid');
    if (!String(lock.open.template?.id || '').trim()) issues.push('open.template.id is required');
    if (!isSha256(lock.open.template?.sha256)) issues.push('open.template.sha256 must be a sha256 hex digest');
    if (typeof lock.open.duration_s !== 'number' || lock.open.duration_s <= 0) issues.push('open.duration_s must be a positive number');
  }
  if (lock?.close) {
    if (!['fixed', 'template'].includes(lock.close.mode)) issues.push('close.mode must be fixed/template');
    if (!String(lock.close.template?.id || '').trim()) issues.push('close.template.id is required');
    if (!isSha256(lock.close.template?.sha256)) issues.push('close.template.sha256 must be a sha256 hex digest');
    if (typeof lock.close.duration_s !== 'number' || lock.close.duration_s <= 0) issues.push('close.duration_s must be a positive number');
    if (typeof lock.close.credits !== 'boolean') issues.push('close.credits must be a boolean');
    if (typeof lock.close.ai_disclosure !== 'boolean') issues.push('close.ai_disclosure must be a boolean');
  }
  if (lock?.music) {
    if (!String(lock.music.theme || '').trim()) issues.push('missing music.theme');
    if (!['self-synthesized', 'licensed', 'none'].includes(String(lock.music.license || '').trim())) {
      issues.push('music.license must be self-synthesized/licensed/none');
    }
  }
  if (lock?.mix) {
    for (const key of ['target_lufs', 'true_peak_db', 'lra']) {
      if (typeof lock.mix[key] !== 'number') issues.push(`mix.${key} must be a number`);
    }
  }
  if (lock?.cover) {
    if (!String(lock.cover.template?.id || '').trim()) issues.push('cover.template.id is required');
    if (!isSha256(lock.cover.template?.sha256)) issues.push('cover.template.sha256 must be a sha256 hex digest');
    if (!Array.isArray(lock.cover.fields)) issues.push('cover.fields must be an array');
  }
  if (lock?.glossary && !String(lock.glossary.file || '').trim()) issues.push('missing glossary.file');
  return issues;
}

function normHex(v) {
  const h = String(v).toLowerCase();
  return h.length === 4 ? `#${[...h.slice(1)].map(c => c + c).join('')}` : h;
}

export function families(css) {
  return String(css || '').split(',').map(s => s.trim().replace(/^["']|["']$/g, '')).filter(Boolean);
}

function walk(node, where, visit) {
  if (Array.isArray(node)) return node.forEach((n, i) => walk(n, `${where}[${i}]`, visit));
  if (!node || typeof node !== 'object') return;
  visit(node, where);
  for (const [k, v] of Object.entries(node)) if (v && typeof v === 'object') walk(v, `${where}.${k}`, visit);
}

// Checks one scene-graph document (scenes.json or stills.json) against the lock.
export function checkSceneDoc(lock, doc, label) {
  const issues = [];
  const names = new Set(Object.keys(lock.palette));
  const hexes = new Set(Object.values(lock.palette).filter(v => String(v).startsWith('#')).map(normHex));
  const extraColors = new Set(lock.palette_aliases || []);
  if (doc.palette) {
    for (const [k, v] of Object.entries(doc.palette)) {
      if (!(k in lock.palette)) issues.push(`${label}: palette key ${k} is not in the series palette`);
      else if (String(v).toLowerCase() !== String(lock.palette[k]).toLowerCase()) issues.push(`${label}: palette.${k} overrides the lock (${v} ≠ ${lock.palette[k]})`);
    }
  }
  if (doc.fonts?.family) {
    for (const fam of families(doc.fonts.family)) {
      if (!lock.fonts.families.includes(fam)) issues.push(`${label}: font ${fam} is not in the series fonts`);
    }
  }
  const chars = lock.characters;
  for (const id of Object.keys(doc.speakers || {})) {
    if (!chars[id]) issues.push(`${label}: speaker ${id} is not a series character`);
  }
  const cam = lock.camera;
  const eases = new Set(lock.motion.scene_eases || []);
  walk([...(doc.scenes || []), ...(doc.shots || []), ...(doc.cover ? [doc.cover] : [])], label, (node, where) => {
    if (node.type === 'character') {
      const ch = chars[node.id];
      if (!ch) issues.push(`${where}: character ${node.id} has no series approval`);
      else {
        for (const s of [node, ...(Array.isArray(node.key) ? node.key : [])]) {
          if (s.expr && ch.expressions && !ch.expressions.includes(s.expr)) issues.push(`${where}: ${node.id} expression ${s.expr} is not in the lock`);
        }
      }
    }
    if (TRANSITIONS.has(node.type) && !cam.transitions.includes(node.type)) issues.push(`${where}: transition ${node.type} is not in the series camera language`);
    if (typeof node.ease === 'string' && eases.size && !eases.has(node.ease)) issues.push(`${where}: ease ${node.ease} is not in the series motion subset`);
    for (const [k, v] of Object.entries(node)) {
      if (typeof v !== 'string') continue;
      if (COLOR_KEY.test(k) && !v.startsWith('#') && !names.has(v) && !extraColors.has(v)) {
        issues.push(`${where}.${k}: ${v} is not a series palette name`);
      }
      for (const h of v.match(HEX) || []) {
        if (!hexes.has(normHex(h))) issues.push(`${where}.${k}: off-palette color ${h}`);
      }
    }
  });
  const cams = [];
  walk([...(doc.scenes || []), ...(doc.shots || []), ...(doc.cover ? [doc.cover] : [])], label, (node, where) => {
    if (node.camera && typeof node.camera === 'object') cams.push([`${where}.camera`, node.camera, false]);
    for (const k of node.camera_key || []) cams.push([`${where}.camera_key`, k, false]);
    for (const k of node.camera_hits || []) cams.push([`${where}.camera_hits`, k, true]);
  });
  for (const [where, c, hit] of cams) {
    if (!hit && typeof c.zoom === 'number' && (c.zoom < cam.zoom[0] || c.zoom > cam.zoom[1])) issues.push(`${where}: zoom ${c.zoom} outside ${cam.zoom.join('–')}`);
    if (hit && typeof c.zoom === 'number' && Math.abs(c.zoom) > cam.max_hit_zoom) issues.push(`${where}: hit zoom ${c.zoom} over ${cam.max_hit_zoom}`);
    if (typeof c.rot === 'number' && Math.abs(c.rot) > cam.max_rot_deg) issues.push(`${where}: rot ${c.rot}° over ${cam.max_rot_deg}°`);
    if (typeof c.shake === 'number' && c.shake > cam.max_shake) issues.push(`${where}: shake ${c.shake} over ${cam.max_shake}`);
  }
  return issues;
}

// Brief may not set locked keys; font choices must come from the lock's library ids.
export function checkBriefAgainstLock(lock, briefText) {
  const issues = [];
  const {data, body} = parseFrontMatter(briefText || '');
  for (const key of Object.keys(data)) {
    if (LOCKED_KEYS.includes(key) || key.startsWith('style_')) issues.push(`brief front matter sets locked key ${key}`);
  }
  if (/^#{1,6}\s+.*style override/im.test(body)) issues.push('brief has a style override section; change the series lock instead');
  for (const role of ['font_display', 'font_body']) {
    const v = String(data[role] ?? '').trim();
    if (v && !(lock.fonts.library_ids || []).includes(v)) issues.push(`brief ${role}: ${v} is not in the series fonts`);
  }
  return issues;
}

async function readJson(file) {
  if (!(await fileExists(file))) return null;
  return JSON.parse(await fs.readFile(file, 'utf8'));
}

export async function checkEpisodeStyle(episodeDir) {
  const {file, lock} = await findStyleLock(episodeDir);
  if (!lock) return {ok: true, locked: false, file: '', issues: [], evidence: `no ${LOCK_FILE} in the series directory`};
  const issues = validateLock(lock).map(i => `lock: ${i}`);
  if (!issues.length) {
    const brief = await fs.readFile(path.join(episodeDir, 'brief.md'), 'utf8').catch(() => '');
    issues.push(...checkBriefAgainstLock(lock, brief));
    for (const name of ['stills.json', 'scenes.json']) {
      const doc = await readJson(path.join(episodeDir, 'render', name));
      if (doc) issues.push(...checkSceneDoc(lock, doc, `render/${name}`));
    }
    const rig = await readJson(path.join(episodeDir, 'render', 'rig.json'));
    for (const id of Object.keys(rig?.characters || {})) {
      if (!lock.characters[id]) issues.push(`render/rig.json: character ${id} has no series approval`);
    }
  }
  return {
    ok: issues.length === 0,
    locked: true,
    file,
    issues,
    evidence: issues.length ? `${issues.length} deviation(s): ${issues.slice(0, 5).join('; ')}` : `matches ${file}`,
  };
}

export function formatStyle(r) {
  if (!r.locked) return `STYLE_UNLOCKED\n${r.evidence}`;
  return [r.ok ? 'STYLE_LOCK_OK' : 'STYLE_LOCK_FAILED', r.file, ...r.issues.map(i => `- ${i}`)].join('\n');
}

function uniqueHexes(value) {
  const found = new Set();
  const visit = node => {
    if (typeof node === 'string') {
      for (const match of node.match(/#[0-9a-f]{3,8}\b/gi) || []) found.add(normHex(match));
    } else if (Array.isArray(node)) {
      node.forEach(visit);
    } else if (node && typeof node === 'object') {
      Object.values(node).forEach(visit);
    }
  };
  visit(value);
  return [...found];
}

// Build a v2 lock draft from one episode's render inputs. It deliberately does not
// fill approval fields: a person approves the lock (and each character) after looking
// at the first episode. Missing intro/outro/cover sections are warnings, not failures;
// series audit will require them once the collection assets exist.
export async function measureLock(episodeDir) {
  const dir = path.resolve(episodeDir);
  const [stills, scenes, rig, lines] = await Promise.all([
    readJson(path.join(dir, 'render', 'stills.json')),
    readJson(path.join(dir, 'render', 'scenes.json')),
    readJson(path.join(dir, 'render', 'rig.json')),
    readJson(path.join(dir, 'lines.json')),
  ]);
  if (!stills && !scenes) {
    throw Object.assign(new Error('measureLock needs render/stills.json or render/scenes.json'), {code: 'LOCK_MEASURE_INPUT_MISSING'});
  }
  if (!rig) {
    throw Object.assign(new Error('measureLock needs render/rig.json'), {code: 'LOCK_MEASURE_INPUT_MISSING'});
  }

  const warnings = [];
  const measuredFrom = [];
  if (stills) measuredFrom.push('render/stills.json');
  if (scenes) measuredFrom.push('render/scenes.json');
  measuredFrom.push('render/rig.json');
  if (lines) measuredFrom.push('lines.json');

  const palette = stills?.palette || scenes?.palette || {};
  if (!Object.keys(palette).length) warnings.push('palette is empty; fill it from the first episode palette by hand');

  const familySource = stills?.fonts?.family || scenes?.fonts?.family || '';
  const fontFamilies = [...new Set(families(familySource))];
  if (!fontFamilies.length) warnings.push('fonts.families is empty; fill the font families by hand');
  const weights = [...new Set([...(stills?.fonts?.weights || []), ...(scenes?.fonts?.weights || [])])];
  const libraryIds = [...new Set([...(stills?.fonts?.library_ids || []), ...(scenes?.fonts?.library_ids || [])])];

  const characters = {};
  for (const [id, character] of Object.entries(rig?.characters || {})) {
    characters[id] = {
      name: character?.name || id,
      colors: uniqueHexes(character),
      expressions: Object.keys(character?.expressions || {}),
      approval: {by: '', at: ''},
    };
  }
  if (!Object.keys(characters).length) warnings.push('characters is empty; the rig has no characters');

  const sceneDocs = [
    ...(scenes?.scenes || []),
    ...(scenes?.shots || []),
    ...(scenes?.cover ? [scenes.cover] : []),
    ...(stills?.shots || []),
  ];
  const zooms = [];
  const hitZooms = [];
  const rots = [];
  const shakes = [];
  const transitions = new Set(['cut']);
  const eases = new Set();
  walk(sceneDocs, 'measure', node => {
    if (node.camera && typeof node.camera === 'object' && typeof node.camera.zoom === 'number') zooms.push(node.camera.zoom);
    for (const key of node.camera_key || []) if (typeof key?.zoom === 'number') zooms.push(key.zoom);
    for (const hit of node.camera_hits || []) {
      if (typeof hit?.zoom === 'number') hitZooms.push(Math.abs(hit.zoom));
      if (typeof hit?.rot === 'number') rots.push(Math.abs(hit.rot));
      if (typeof hit?.shake === 'number') shakes.push(hit.shake);
    }
    if (TRANSITIONS.has(node.type)) transitions.add(node.type);
    if (typeof node.ease === 'string') eases.add(node.ease);
  });
  if (!zooms.length) warnings.push('camera.zoom has no measured values; using 1–1');

  const strokes = [];
  walk(rig, 'rig', node => {
    if (typeof node.sw === 'number' && node.sw > 0) strokes.push(node.sw);
  });
  const hexes = Object.values(palette).filter(value => String(value).startsWith('#'));
  const lineInk = palette.ink || hexes[0] || '#000000';

  const voiceIds = new Set();
  for (const line of lines?.lines || []) if (line?.voice) voiceIds.add(line.voice);
  for (const entry of Object.values(lines?.voices?.map || {})) if (entry?.voice) voiceIds.add(entry.voice);
  const emotions = [...new Set((lines?.lines || []).map(line => line?.emotion).filter(Boolean))];
  const voice = {
    provider: lines?.voice_provider || '',
    voice_id: [...voiceIds][0] || '',
    speech_rate: typeof lines?.speech_rate === 'number' ? lines.speech_rate : null,
    emotion_default: emotions[0] || '',
    emotion_range: emotions,
  };
  if (!voice.provider) warnings.push('voice.provider is empty; fill it from the TTS provider');
  if (!voice.voice_id) warnings.push('voice.voice_id is empty; fill it from the TTS voice');

  const speakerVoice = new Map();
  for (const line of lines?.lines || []) if (line?.speaker && line?.voice) speakerVoice.set(line.speaker, line.voice);
  const sceneSpeakers = scenes?.speakers || {};
  for (const [id, character] of Object.entries(characters)) {
    const speaker = sceneSpeakers[id] || id;
    if (speakerVoice.has(speaker)) character.voice_id = speakerVoice.get(speaker);
  }

  const rigBytes = await fs.readFile(path.join(dir, 'render', 'rig.json'));
  const lock = {
    schema: SCHEMA_V2,
    approval: {by: '', at: ''},
    palette,
    palette_aliases: [],
    fonts: {families: fontFamilies, library_ids: libraryIds, weights},
    characters,
    camera: {
      zoom: [Math.min(...zooms, 1), Math.max(...zooms, 1)],
      max_rot_deg: rots.length ? Math.max(...rots) : 0,
      max_shake: shakes.length ? Math.max(...shakes) : 0,
      max_hit_zoom: hitZooms.length ? Math.max(...hitZooms) : 0,
      transitions: [...transitions],
      language: '',
    },
    line: {
      ink: lineInk,
      stroke_px: strokes.length ? [Math.min(...strokes), Math.max(...strokes)] : [1, 1],
      shading: '',
    },
    motion: {scene_eases: [...eases], tokens: []},
    rig: {file: 'render/rig.json', sha256: createHash('sha256').update(rigBytes).digest('hex')},
    voice,
    mix: {target_lufs: -16, true_peak_db: -1.5, lra: 11},
    source: {measured_from: measuredFrom},
  };

  const coverDoc = scenes?.cover || await readJson(path.join(dir, 'render', 'cover.json'));
  if (coverDoc?.template?.id && coverDoc?.template?.sha256) {
    lock.cover = {template: coverDoc.template, fields: ['episode_number', 'episode_title']};
  } else {
    warnings.push('cover: no template marker in scenes.cover or render/cover.json; add it before series audit');
  }

  for (const role of ['open', 'close']) {
    const scene = (scenes?.scenes || []).find(item => item.role === role);
    if (scene?.template?.id && scene?.template?.sha256 && typeof scene.duration_s === 'number' && scene.duration_s > 0) {
      lock[role] = {mode: 'template', template: scene.template, duration_s: scene.duration_s};
    } else {
      warnings.push(`${role}: no role marker with template + duration_s in scenes.json; add it before series audit`);
    }
  }

  const bgm = scenes?.bgm;
  if (bgm?.id) {
    lock.music = {theme: bgm.id, license: bgm.license || '', bpm: typeof bgm.bpm === 'number' ? bgm.bpm : 0};
    if (!bgm.license) warnings.push('music.license is empty; fill it with self-synthesized/licensed/none');
  } else {
    warnings.push('music: no scenes.bgm.id; add it before series audit');
  }

  const glossaryFile = path.join(dir, '..', 'glossary.json');
  if (await fileExists(glossaryFile)) {
    const bytes = await fs.readFile(glossaryFile);
    lock.glossary = {file: 'glossary.json', sha256: createHash('sha256').update(bytes).digest('hex')};
  } else {
    warnings.push('glossary: no glossary.json in the series directory; add it before series audit');
  }

  warnings.push('approval fields are empty by design; a person fills lock approval and each character approval');
  return {lock, warnings, measuredFrom};
}

export async function writeLock(seriesDir, lock, {force = false} = {}) {
  const file = path.join(seriesDir, LOCK_FILE);
  if ((await fileExists(file)) && !force) {
    throw Object.assign(new Error(`${LOCK_FILE} already exists in ${seriesDir}. Use --force only after a person approves the replacement.`), {code: 'LOCK_EXISTS'});
  }
  await fs.mkdir(seriesDir, {recursive: true});
  await fs.writeFile(file, `${JSON.stringify(lock, null, 2)}\n`);
  return {file, lock};
}

export async function checkSeriesLock(seriesDir) {
  const lock = await readJson(path.join(seriesDir, LOCK_FILE));
  if (!lock) {
    return {ok: false, code: 'LOCK_MISSING', issues: [`no ${LOCK_FILE} in ${seriesDir}`], rows: []};
  }
  const issues = validateLock(lock);
  const entries = await fs.readdir(seriesDir, {withFileTypes: true}).catch(() => []);
  const episodes = entries
    .filter(entry => entry.isDirectory() && /^ep\d{2}$/.test(entry.name))
    .map(entry => entry.name)
    .sort();
  const rows = [];
  for (const episode of episodes) {
    const result = await checkEpisodeStyle(path.join(seriesDir, episode));
    rows.push({episode, ok: result.ok, issues: result.issues});
  }
  if (!rows.length) issues.push('no epNN folders in the series');
  return {
    ok: issues.length === 0 && rows.every(row => row.ok),
    code: issues.length === 0 && rows.every(row => row.ok) ? 'LOCK_OK' : 'LOCK_FAILED',
    file: path.join(seriesDir, LOCK_FILE),
    issues,
    rows,
  };
}

export function formatSeriesLock(report) {
  if (report.code === 'LOCK_OK') return `SERIES_LOCK_OK ${report.file} (${report.rows.length} episodes)`;
  const lines = [`SERIES_LOCK_FAILED ${report.file || ''}`.trim()];
  for (const issue of report.issues) lines.push(`- ${issue}`);
  for (const row of report.rows) {
    if (row.ok) continue;
    lines.push(`- ${row.episode}: ${row.issues.slice(0, 4).join('; ')}`);
  }
  return lines.join('\n');
}
