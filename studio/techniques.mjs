import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {extractApproach, knownTechniques, parseFrontMatter} from './brief.mjs';

// Technique registry: opt-in methods an episode may choose in `## Approach`.
// Each studio/techniques/<id>.json declares when it fits, when not to use it, its brief
// section, and its checks. Checks run only for selected techniques. Adding a technique is a
// JSON file plus, when it has a new check kind, one entry in CHECKS below.

const dir = fileURLToPath(new URL('./techniques/', import.meta.url));
const PLACEHOLDER = /待填|TODO|TBD|\(to fill\)|（待填）|示例/i;

export const listTechniques = async () => knownTechniques();

export async function loadTechnique(id) {
  if (!/^[a-z0-9-]+$/.test(id || '') || !knownTechniques().includes(id)) {
    throw Object.assign(new Error(`Unknown technique: ${id}. Known: ${knownTechniques().join(', ')}`), {code: 'BAD_TECHNIQUE'});
  }
  return JSON.parse(await fs.readFile(path.join(dir, `${id}.json`), 'utf8'));
}

export function validateTechnique(t) {
  const errors = [];
  if (t.schema !== 'storyweaver.technique.v1') errors.push('schema');
  for (const k of ['id', 'title', 'summary']) if (!t[k]) errors.push(k);
  if (!Array.isArray(t.fits) || !t.fits.length) errors.push('fits');
  if (!Array.isArray(t.avoid) || !t.avoid.length) errors.push('avoid');
  if (!t.brief_section?.heading || !t.brief_section?.template) errors.push('brief_section');
  if (!Array.isArray(t.checks) || !t.checks.length) errors.push('checks');
  for (const c of t.checks || []) if (!CHECKS[c.id]) errors.push(`unknown check ${c.id}`);
  return errors;
}

export function sectionText(markdown, heading) {
  const {body} = parseFrontMatter(markdown);
  const lines = body.split(/\r?\n/);
  const start = lines.findIndex(l => new RegExp(`^#{1,6}\\s+${heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, 'i').test(l.trim()));
  if (start < 0) return null;
  const out = [];
  for (const line of lines.slice(start + 1)) {
    if (/^#{1,6}\s/.test(line)) break;
    out.push(line);
  }
  return out.join('\n').trim();
}

const filled = text => Boolean(text) && !PLACEHOLDER.test(text);

const CONCEPT_FIELDS = [
  {id: 'machine', label: /^machine$/i},
  {id: 'motion', label: /^motion$/i},
  {id: 'lit_subject', label: /^lit subject$/i},
  {id: 'model', label: /^model$/i},
];
const MODEL_REF = /(?:^|[\s`(])((?:sim\/[^\s`),]+)|fact_card\.md(?:\s*B\d+)?)/g;

export function extractConceptMachine(markdown) {
  const out = {};
  for (const line of (sectionText(markdown, 'Concept machine') || '').split('\n')) {
    const m = line.match(/^\s*[-*]\s+\**([^:：*]+?)\**\s*[:：]\s*(.*)$/);
    if (!m) continue;
    const field = CONCEPT_FIELDS.find(f => f.label.test(m[1].trim()));
    if (field && m[2].trim() && !PLACEHOLDER.test(m[2])) out[field.id] = m[2].trim();
  }
  out.modelRefs = [...String(out.model || '').matchAll(MODEL_REF)].map(r => r[1].replace(/\s*B\d+$/, ''));
  return out;
}

export function validateConceptMachine(markdown) {
  const cm = extractConceptMachine(markdown);
  const issues = [];
  for (const field of CONCEPT_FIELDS) if (!cm[field.id]) issues.push({id: 'concept_machine_missing', detail: field.id});
  if (cm.motion && !/\b(means|=|→)|意味|表示|就是/i.test(cm.motion)) issues.push({id: 'concept_machine_motion', detail: 'Motion must say what moves and what that motion means ("X moves; that means Y")'});
  if (cm.lit_subject && /[,，、]|\band\b|和/.test(cm.lit_subject)) issues.push({id: 'concept_machine_lit', detail: 'Exactly one lit subject'});
  if (cm.model && cm.modelRefs.length === 0) issues.push({id: 'concept_machine_model', detail: 'Model must cite fact_card.md (B#) or a sim/ file'});
  return {concept: cm, issues};
}

const exists = f => fs.access(f).then(() => true, () => false);

const sectionCheck = heading => async ({brief}) => {
  const ok = filled(sectionText(brief, heading));
  return {ok, evidence: ok ? 'filled' : `brief needs a filled "## ${heading}" section`};
};

// Check kinds. Each gets {episodeDir, brief, lines} and returns {ok, evidence}.
export const CHECKS = {
  concept_machine_fields: async ({brief}) => {
    const {concept, issues} = validateConceptMachine(brief);
    return issues.length
      ? {ok: false, evidence: issues.map(i => `${i.id}:${i.detail}`).join(', ')}
      : {ok: true, evidence: `${concept.machine} · lit: ${concept.lit_subject}`};
  },
  concept_machine_model: async ({episodeDir, brief}) => {
    const {concept} = validateConceptMachine(brief);
    if (!concept.modelRefs.length) return {ok: false, evidence: 'no model reference'};
    const missing = [];
    for (const ref of concept.modelRefs) if (!(await exists(path.join(episodeDir, ref)))) missing.push(ref);
    return missing.length ? {ok: false, evidence: `concept model not found: ${missing.join(', ')}`} : {ok: true, evidence: `model: ${concept.modelRefs.join(', ')}`};
  },
  guess_before_reveal_section: sectionCheck('Guess before reveal'),
  guess_before_reveal_order: async ({lines}) => {
    const beats = lines.map(l => String(l.beat || ''));
    const g = beats.indexOf('guess');
    const r = beats.indexOf('reveal');
    const ok = g >= 0 && r > g;
    return {ok, evidence: ok ? `guess ${lines[g].id} before reveal ${lines[r].id}` : 'lines.json needs a beat "guess" line before the first "reveal" line'};
  },
  try_it_at_home_section: sectionCheck('Try it at home'),
};

// Run the checks of every technique selected in `## Approach`. `stage: 'brief'` limits the
// run to checks that only need the brief; omit it to run all of them.
export async function evaluateTechniques(episodeDir, {stage} = {}) {
  const read = async f => (await exists(f)) ? fs.readFile(f, 'utf8') : '';
  const brief = await read(path.join(episodeDir, 'brief.md'));
  const approach = extractApproach(brief);
  const linesText = await read(path.join(episodeDir, 'lines.json'));
  let lines = [];
  try { lines = linesText ? JSON.parse(linesText).lines || [] : []; } catch { lines = []; }
  const results = [];
  for (const id of approach.techniques) {
    if (!knownTechniques().includes(id)) {
      results.push({id: `technique_${id}`, technique: id, ok: false, evidence: 'unknown technique'});
      continue;
    }
    const t = await loadTechnique(id);
    for (const c of t.checks) {
      if (stage && c.stage !== stage) continue;
      const r = await CHECKS[c.id]({episodeDir, brief, lines});
      results.push({id: c.id, technique: id, ok: r.ok, evidence: r.evidence});
    }
  }
  return {techniques: approach.techniques, none: approach.none, results};
}
