import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {isAgentSigner} from '../brief.mjs';
import {AUTO_CHECKS, fileExists} from './checks.mjs';

const defaultTemplate = fileURLToPath(new URL('./checklist.json', import.meta.url));

export async function loadChecklistTemplate(templatePath = defaultTemplate) {
  return JSON.parse(await fs.readFile(templatePath, 'utf8'));
}

export async function runQc(episodeDir, {templatePath = defaultTemplate} = {}) {
  const template = await loadChecklistTemplate(templatePath);
  const overlayPath = path.join(episodeDir, 'qc', 'checklist.json');
  let overlayItems = [];
  if (await fileExists(overlayPath)) {
    const overlay = JSON.parse(await fs.readFile(overlayPath, 'utf8'));
    overlayItems = Array.isArray(overlay.items) ? overlay.items : [];
  }
  const byId = new Map(overlayItems.map(item => [item.id, item]));
  const items = [];
  for (const item of template.items) {
    const over = byId.get(item.id) || {};
    if (item.kind === 'auto') {
      const check = AUTO_CHECKS[item.check];
      if (!check) throw new Error(`Unknown auto check: ${item.check}`);
      const result = await check(episodeDir);
      items.push({
        id: item.id,
        gate: item.gate,
        blocks: item.blocks,
        required: item.required,
        kind: item.kind,
        title: item.title,
        status: result.ok ? 'pass' : 'fail',
        evidence: result.evidence,
        evidenceCode: result.code,
      });
      continue;
    }
    let status = over.status || item.status || 'pending';
    if (!['pending', 'pass', 'fail'].includes(status)) status = 'pending';
    let evidence = over.evidence || '';
    const checkedBy = String(over.checked_by || '').trim();
    if (status === 'pass' && !checkedBy) {
      status = 'pending';
      evidence = 'pass without checked_by is still pending';
    } else if (status === 'pass' && isAgentSigner(checkedBy)) {
      status = 'pending';
      evidence = 'Agents cannot sign human checks. Use agent_precheck for machine notes.';
    }
    items.push({
      id: item.id,
      gate: item.gate,
      blocks: item.blocks,
      required: item.required,
      kind: item.kind,
      title: item.title,
      status,
      evidence,
      evidenceCode: status === 'pass' ? 'PASS' : 'GATE_BLOCKED',
      checked_by: checkedBy,
      agent_precheck: over.agent_precheck || '',
    });
  }
  const blocked = items.filter(item => item.required && item.status !== 'pass');
  return {
    episode: path.basename(episodeDir),
    items,
    ok: blocked.length === 0,
  };
}

export function formatQc(report) {
  const lines = report.items.map(item => {
    return `${item.status.toUpperCase()} [${item.kind}] ${item.id} ${item.title}${item.evidence ? ' — ' + item.evidence : ''}`;
  });
  const pending = report.items.filter(item => item.status === 'pending').length;
  const failed = report.items.filter(item => item.status === 'fail').length;
  lines.push(`${report.episode}: ${failed} failed, ${pending} pending`);
  return lines.join('\n');
}
