import crypto from 'node:crypto';
import fsSync from 'node:fs';
import {fileURLToPath} from 'node:url';

export const LANDSCAPE_MAX_S = 90;
export const VERTICAL_MAX_S = 60;
export const ASPECTS = ['16:9', '9:16', '16:9+9:16'];

export const BEATS = [
  {id: 'hook', aliases: ['hook', '钩子']},
  {id: 'break-assumption', aliases: ['break the assumption', 'break-assumption', '打碎常识']},
  {id: 'mechanism', aliases: ['mechanism', '内幕']},
  {id: 'payoff', aliases: ['payoff', '真相']},
  {id: 'audience-stance', aliases: ['audience stance', 'audience-stance', '评论站队']},
];

const REQUIRED_HEADINGS = [
  'One thing',
  'Viewer intuition',
  'Approach',
  'Five-beat story',
  'Storyboard',
  'Aspect',
  'Duration',
];

const PLACEHOLDER = /待填|TODO|TBD|\(to fill\)|（待填）|示例/i;

export function parseFrontMatter(markdown) {
  const match = String(markdown).match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!match) return {data: {}, body: String(markdown)};
  const data = {};
  for (const line of match[1].split(/\r?\n/)) {
    const field = line.match(/^([A-Za-z0-9_]+):\s*(.*)$/);
    if (!field) continue;
    data[field[1]] = parseScalar(field[2].trim());
  }
  return {data, body: markdown.slice(match[0].length)};
}

function parseScalar(value) {
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    value = value.slice(1, -1);
  }
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (value === '') return '';
  if (/^-?\d+(\.\d+)?$/.test(value)) return Number(value);
  return value;
}

export function briefBodyHash(markdown) {
  const {body} = parseFrontMatter(markdown);
  return crypto.createHash('sha256').update(body.trim(), 'utf8').digest('hex');
}

export const phaseABodyHash = briefBodyHash;

function headingText(line) {
  return line.replace(/^#{1,6}\s+/, '').replace(/\*\*/g, '').trim();
}

export function extractOneThing(markdown) {
  const {body} = parseFrontMatter(markdown);
  const lines = body.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    if (!/one thing|一件事/i.test(lines[i])) continue;
    const inline = headingText(lines[i]);
    const after = inline.replace(/^.*(?:one thing|一件事)\s*[:：-]?\s*/i, '').trim();
    if (after && !isBlankClaim(after)) return after;
    for (let j = i + 1; j < lines.length; j++) {
      const next = lines[j].trim();
      if (!next) continue;
      if (/^#{1,6}\s/.test(next)) break;
      if (isBlankClaim(next)) return '';
      return next.replace(/^[-*]\s+/, '');
    }
  }
  return '';
}

function isBlankClaim(text) {
  return PLACEHOLDER.test(text) || text.replace(/[（）()\s]/gu, '') === '';
}

export function storyboardDataRows(body) {
  const rows = [];
  let headerSeen = false;
  for (const line of body.split(/\r?\n/)) {
    if (!line.trim().startsWith('|')) continue;
    const cells = line.split('|').slice(1, -1).map(cell => cell.trim());
    if (cells.length === 0) continue;
    if (cells.every(cell => /^:?-+:?$/.test(cell))) continue;
    if (!headerSeen && cells.some(cell => /window|time|时段/i.test(cell))) {
      headerSeen = true;
      continue;
    }
    if (headerSeen) rows.push(cells);
  }
  return rows;
}

function rowIsReal(cells) {
  const filled = cells.map(cell => cell.trim()).filter(Boolean);
  if (filled.length < 4) return false;
  return filled.every(cell => !PLACEHOLDER.test(cell));
}

function bodyHasBeat(body, beat) {
  const hay = body.toLowerCase();
  return beat.aliases.some(alias => hay.includes(alias.toLowerCase()));
}

export function extractIntuitionRows(markdown) {
  const {body} = parseFrontMatter(markdown);
  const lines = body.split(/\r?\n/);
  let inSection = false;
  let headerSeen = false;
  const rows = [];
  for (const line of lines) {
    if (/^#{1,6}\s+/.test(line)) {
      inSection = /viewer intuition|strongest objection/i.test(line);
      headerSeen = false;
      continue;
    }
    if (!inSection || !line.trim().startsWith('|')) continue;
    const cells = line.split('|').slice(1, -1).map(cell => cell.trim());
    if (cells.every(cell => /^:?-+:?$/.test(cell))) continue;
    if (!headerSeen) {
      headerSeen = true;
      continue;
    }
    if (cells.some(cell => cell) && cells.every(cell => !PLACEHOLDER.test(cell))) {
      rows.push({
        id: cells[0],
        viewer: cells[1] || '',
        whenTrue: cells[2] || '',
        reply: cells[3] || '',
        lineIds: String(cells[4] || '').split(/[,，\s]+/).map(s => s.trim()).filter(Boolean),
      });
    }
  }
  return rows;
}

// `## Approach`: which technique(s) from studio/techniques/ this episode uses, or `none`,
// and one sentence why that fits this topic. Techniques are opt-in; their checks run only
// when listed here.
const TECHNIQUE_DIR = fileURLToPath(new URL('./techniques/', import.meta.url));

export function knownTechniques() {
  return fsSync.readdirSync(TECHNIQUE_DIR).filter(f => f.endsWith('.json')).map(f => f.slice(0, -5)).sort();
}

export function extractApproach(markdown) {
  const {body} = parseFrontMatter(markdown);
  const out = {present: false, techniques: [], none: false, why: ''};
  let inSection = false;
  for (const line of body.split(/\r?\n/)) {
    if (/^#{1,6}\s+/.test(line)) {
      inSection = /^#{1,6}\s+approach\s*$/i.test(line.trim());
      if (inSection) out.present = true;
      continue;
    }
    if (!inSection) continue;
    const m = line.match(/^\s*[-*]\s+\**([^:：*]+?)\**\s*[:：]\s*(.*)$/);
    if (!m) continue;
    const key = m[1].trim().toLowerCase();
    const value = m[2].trim();
    if (/^techniques?$/.test(key) && !isBlankClaim(value)) {
      const ids = value.replace(/`/g, '').split(/[,，\s]+/).map(v => v.trim()).filter(Boolean);
      if (ids.length === 1 && ids[0].toLowerCase() === 'none') out.none = true;
      else out.techniques = ids;
    }
    if (key === 'why' && !isBlankClaim(value)) out.why = value;
  }
  return out;
}

export function validateApproach(markdown) {
  const ap = extractApproach(markdown);
  const issues = [];
  if (!ap.present) return {approach: ap, issues};
  if (!ap.none && ap.techniques.length === 0) issues.push({id: 'approach_techniques', detail: 'List technique ids from studio/techniques/ or write "none"'});
  const known = knownTechniques();
  for (const id of ap.techniques) {
    if (!known.includes(id)) issues.push({id: 'approach_unknown_technique', detail: `${id} (known: ${known.join(', ')})`});
  }
  if (!ap.why) issues.push({id: 'approach_why', detail: 'One sentence: why this approach fits this topic'});
  return {approach: ap, issues};
}

export function validateBrief(markdown) {
  const {data, body} = parseFrontMatter(markdown);
  const issues = [];
  for (const heading of REQUIRED_HEADINGS) {
    const found = new RegExp(`^#{1,6}\\s+.*${heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'im').test(body);
    if (!found) issues.push({id: 'missing_heading', detail: heading});
  }
  for (const beat of BEATS) {
    if (!bodyHasBeat(body, beat)) issues.push({id: 'missing_beat', detail: beat.id});
  }
  if (!ASPECTS.includes(data.aspect)) issues.push({id: 'bad_aspect', detail: String(data.aspect ?? '')});
  if (typeof data.target_duration_s !== 'number' || data.target_duration_s <= 0) {
    issues.push({id: 'duration_missing', detail: 'target_duration_s'});
  } else if (data.aspect === '9:16' && data.target_duration_s > VERTICAL_MAX_S) {
    issues.push({id: 'duration_cap', detail: `9:16 max ${VERTICAL_MAX_S}s`});
  } else if (data.aspect !== '9:16' && data.target_duration_s > LANDSCAPE_MAX_S) {
    issues.push({id: 'duration_cap', detail: `16:9 max ${LANDSCAPE_MAX_S}s`});
  }
  const needsVertical = data.aspect === '16:9+9:16' || data.produce_vertical === true;
  if (needsVertical) {
    if (typeof data.vertical_duration_s !== 'number' || data.vertical_duration_s <= 0 || data.vertical_duration_s > VERTICAL_MAX_S) {
      issues.push({id: 'vertical_duration_cap', detail: `vertical max ${VERTICAL_MAX_S}s`});
    }
  }
  const claim = extractOneThing(markdown);
  if (!claim) issues.push({id: 'one_thing_empty', detail: 'One thing'});
  const realRows = storyboardDataRows(body).filter(rowIsReal);
  if (realRows.length < 1) issues.push({id: 'storyboard_empty', detail: 'Need at least one filled 10-second storyboard row'});
  issues.push(...validateApproach(markdown).issues);
  const intuition = extractIntuitionRows(markdown);
  if (intuition.length < 1) issues.push({id: 'intuition_empty', detail: 'Viewer intuition needs at least one filled row'});
  return {data, issues, ready: issues.length === 0, intuition};
}

export const validatePhaseA = validateBrief;

function scopeMatches(data) {
  const pairs = [
    ['aspect', 'approved_aspect'],
    ['target_duration_s', 'approved_duration_s'],
    ['structure_revision', 'approved_structure_revision'],
    ['produce_vertical', 'approved_produce_vertical'],
  ];
  for (const [current, approved] of pairs) {
    if (String(data[current] ?? '') !== String(data[approved] ?? '')) return false;
  }
  if (data.produce_vertical === true) {
    if (String(data.vertical_duration_s ?? '') !== String(data.approved_vertical_duration_s ?? '')) return false;
  }
  return true;
}

export function approvalState(markdown) {
  const structure = validateBrief(markdown);
  const {data} = structure;
  const hash = briefBodyHash(markdown);
  if (data.status === 'reconstructed' || data.status === 'rejected') {
    return {code: 'BRIEF_REQUIRED', status: data.status || '', structure, hash};
  }
  if (data.status !== 'approved') {
    return {
      code: structure.ready ? 'BRIEF_READY_FOR_REVIEW' : 'BRIEF_INCOMPLETE',
      status: data.status || 'draft',
      structure,
      hash,
    };
  }
  if (!structure.ready) return {code: 'BRIEF_INCOMPLETE', status: 'approved', structure, hash};
  const by = String(data.approved_by || '').trim();
  const at = String(data.approved_at || '').trim();
  if (!by || !/\d{4}-\d{2}-\d{2}/.test(at)) {
    return {code: 'BRIEF_REQUIRED', status: 'approved', structure, hash};
  }
  if (isAgentSigner(by)) {
    return {code: 'BRIEF_REQUIRED', status: 'approved', structure, hash};
  }
  if (data.approved_body_sha256 !== hash || !scopeMatches(data)) {
    return {code: 'BRIEF_STALE', status: 'approved', structure, hash};
  }
  return {code: 'BRIEF_APPROVED', status: 'approved', structure, hash};
}

export const AGENT_SIGNER = /代理|agent|bot|grok|claude|opus|gpt|cursor|copilot|chatgpt|gemini/i;

export function isAgentSigner(name) {
  return AGENT_SIGNER.test(String(name || '').trim());
}

