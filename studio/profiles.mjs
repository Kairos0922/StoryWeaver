import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {parseFrontMatter} from './brief.mjs';
import {fileExists} from './qc/checks.mjs';

const dir = fileURLToPath(new URL('./profiles/', import.meta.url));

export async function listProfiles() {
  return (await fs.readdir(dir)).filter(f => f.endsWith('.json')).map(f => f.slice(0, -5)).sort();
}

export async function loadProfile(id) {
  if (!/^[a-z0-9-]+$/.test(id || '')) throw Object.assign(new Error(`Bad profile id: ${id}`), {code: 'BAD_PROFILE'});
  const file = path.join(dir, `${id}.json`);
  if (!(await fileExists(file))) throw Object.assign(new Error(`Unknown audience profile: ${id}. Known: ${(await listProfiles()).join(', ')}`), {code: 'BAD_PROFILE'});
  return JSON.parse(await fs.readFile(file, 'utf8'));
}

export function briefProfileId(briefText) {
  const front = parseFrontMatter(briefText || '').data;
  const value = String(front.audience_profile ?? '').replace(/^["']|["']$/g, '').trim();
  return value || '';
}

export function sectionBody(markdown, heading) {
  const lines = String(markdown || '').split('\n');
  const start = lines.findIndex(l => l.trim().toLowerCase() === `## ${heading}`.toLowerCase());
  if (start < 0) return null;
  const body = [];
  for (const line of lines.slice(start + 1)) {
    if (/^##\s/.test(line)) break;
    body.push(line);
  }
  return body.join('\n').trim();
}


export function evaluateProfile(profile, {brief = '', lines = [], language = 'en'}) {
  const checks = [];
  if (profile.anxiety_phrases) {
    const phrases = profile.anxiety_phrases[language] || [];
    const text = [brief.split('## Banned motion')[0], ...lines.map(l => l.text || '')].join('\n').toLowerCase();
    const hits = phrases.filter(p => text.includes(p.toLowerCase()));
    checks.push({id: 'profile_no_anxiety', ok: hits.length === 0, evidence: hits.length ? `anxiety phrasing: ${hits.join(', ')}` : `${phrases.length} phrases checked`});
  }
  return checks;
}

export async function checkProfile(episodeDir) {
  const read = async f => (await fileExists(f)) ? fs.readFile(f, 'utf8') : '';
  const brief = await read(path.join(episodeDir, 'brief.md'));
  const id = briefProfileId(brief);
  if (!id) return {id: '', checks: []};
  const profile = await loadProfile(id);
  const linesText = await read(path.join(episodeDir, 'lines.json'));
  const doc = linesText ? JSON.parse(linesText) : {};
  const language = doc.language || 'en';
  return {id, checks: evaluateProfile(profile, {brief, lines: Array.isArray(doc.lines) ? doc.lines : [], language})};
}
