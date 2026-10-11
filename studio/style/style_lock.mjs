// Series style lock. One file per series, `series-style.json`, kept in the series working
// directory (outside this repository). Episodes inherit it and may not override a locked key.
// Schema and rules: docs/style-lock.md
import fs from 'node:fs/promises';
import path from 'node:path';
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

export function validateLock(lock) {
  const issues = [];
  if (lock?.schema !== SCHEMA) issues.push(`schema must be ${SCHEMA}`);
  for (const key of LOCKED_KEYS) if (!lock?.[key]) issues.push(`missing ${key}`);
  for (const [id, ch] of Object.entries(lock?.characters || {})) {
    const by = String(ch?.approval?.by || '').trim();
    if (!by || isAgentSigner(by) || !/\d{4}-\d{2}-\d{2}/.test(String(ch?.approval?.at || ''))) {
      issues.push(`character ${id} has no human series approval (approval.by / approval.at)`);
    }
  }
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
