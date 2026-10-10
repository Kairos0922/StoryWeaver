import fs from 'node:fs/promises';
import path from 'node:path';
import {fileExists} from './qc/checks.mjs';

export const QUANTITY_TYPES = ['average', 'individual', 'fairness', 'tail-risk', 'proportion'];

const AVERAGE_WORDS = /average|typically|overall|on the whole|across everyone|平均|一般来说|大家加起来|大家平均/i;
const SPEED_WORDS = /faster|slower|quick|speed|快|慢/;
const FAIRNESS_WORDS = /fair|cut in|ahead of you|order|插|公平|前头/;
const DISTINGUISH = /not (?:about )?fast|not speed|不是快|不是谁更快|图稳|fairness|order/;

export function parseFactCardQuantities(markdown) {
  const rows = [];
  let inB = false;
  let header = [];
  for (const line of String(markdown).split(/\r?\n/)) {
    if (/^#{1,6}\s+/.test(line)) {
      inB = /^#{1,6}\s+B\b/i.test(line);
      header = [];
      continue;
    }
    if (!inB || !line.trim().startsWith('|')) continue;
    const cells = line.split('|').slice(1, -1).map(c => c.trim());
    if (cells.every(c => /^:?-+:?$/.test(c))) continue;
    if (!header.length) {
      header = cells.map(c => c.toLowerCase());
      continue;
    }
    const typeIdx = header.findIndex(h => /quantity|type|量/.test(h));
    const idIdx = header.findIndex(h => h.includes('#') || h.includes('id') || /on-screen|number|数字/.test(h));
    const type = typeIdx >= 0 ? cells[typeIdx].toLowerCase() : '';
    const label = idIdx >= 0 ? cells[idIdx] : cells[0];
    const idMatch = String(label).match(/B\d+/i);
    rows.push({
      id: idMatch ? idMatch[0].toUpperCase() : '',
      label,
      type,
      raw: cells,
    });
  }
  return rows;
}

export function evaluateClaimPrecision({factCard, lines, title = ''}) {
  const problems = [];
  const quantities = parseFactCardQuantities(factCard);
  const typed = quantities.filter(q => q.id);
  if (typed.length && typed.some(q => q.type && !QUANTITY_TYPES.includes(q.type))) {
    problems.push('bad-quantity-type');
  }
  if (typed.length && typed.some(q => !q.type)) {
    problems.push('missing-quantity-type');
  }
  const byId = new Map(typed.map(q => [q.id, q]));
  for (const line of lines || []) {
    const claims = Array.isArray(line.claims) ? line.claims : [];
    const text = String(line.text || '');
    for (const id of claims) {
      const q = byId.get(String(id).toUpperCase());
      if (!q) continue;
      if (q.type === 'average' && !AVERAGE_WORDS.test(text)) {
        problems.push(`${line.id || 'line'}:average-unqualified:${id}`);
      }
      if (q.type === 'average' && /图啥|why bother|what do i get/i.test(text) && !DISTINGUISH.test(text)) {
        problems.push(`${line.id || 'line'}:average-answers-why:${id}`);
      }
    }
    if (FAIRNESS_WORDS.test(text) && SPEED_WORDS.test(text) && !DISTINGUISH.test(text)) {
      problems.push(`${line.id || 'line'}:mixed-fairness-speed`);
    }
  }
  if (/which is faster|哪个更快|选哪个/i.test(title)) {
    const hasSpeed = typed.some(q => q.type === 'average' || q.type === 'individual');
    if (!hasSpeed) problems.push('title-asks-speed-without-b-row');
  }
  return {ok: problems.length === 0, problems, quantities};
}

export async function checkClaimPrecision(episodeDir) {
  const fact = path.join(episodeDir, 'fact_card.md');
  if (!(await fileExists(fact))) return {ok: false, code: 'CLAIM_PRECISION', evidence: 'missing fact_card.md'};
  const factCard = await fs.readFile(fact, 'utf8');
  const linesFile = path.join(episodeDir, 'lines.json');
  let lines = [];
  if (await fileExists(linesFile)) {
    const doc = JSON.parse(await fs.readFile(linesFile, 'utf8'));
    lines = Array.isArray(doc.lines) ? doc.lines : [];
  }
  const brief = path.join(episodeDir, 'brief.md');
  const title = (await fileExists(brief)) ? await fs.readFile(brief, 'utf8') : '';
  const result = evaluateClaimPrecision({factCard, lines, title});
  if (!result.ok) return {ok: false, code: 'CLAIM_PRECISION', evidence: result.problems.join('; ')};
  return {ok: true, code: 'CLAIM_PRECISION', evidence: result.quantities.length ? 'typed' : 'no-B-rows'};
}
