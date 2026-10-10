import crypto from 'node:crypto';

export const LANDSCAPE_MAX_S = 90;
export const VERTICAL_MAX_S = 60;
export const BEATS = ['钩子', '打碎常识', '内幕', '真相', '评论站队'];
export const ASPECTS = ['16:9', '9:16', '16:9+9:16'];

const REQUIRED_HEADINGS = ['一件事', '五步心流', '分镜', '画幅', '时长'];

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

export function phaseABodyHash(markdown) {
  const {body} = parseFrontMatter(markdown);
  return crypto.createHash('sha256').update(body.trim(), 'utf8').digest('hex');
}

export function extractOneThing(markdown) {
  const {body} = parseFrontMatter(markdown);
  const lines = body.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    if (!lines[i].includes('一件事')) continue;
    const inline = lines[i].replace(/\*\*/g, '');
    const parts = inline.split(/一件事/);
    const after = parts.slice(1).join('一件事').replace(/^[*：:\s]+/u, '').trim();
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
  return /待填|TODO|示例/.test(text) || text.replace(/[（）()\s]/gu, '') === '';
}

export function storyboardDataRows(body) {
  const rows = [];
  let headerSeen = false;
  for (const line of body.split(/\r?\n/)) {
    if (!line.trim().startsWith('|')) continue;
    const cells = line.split('|').slice(1, -1).map(cell => cell.trim());
    if (cells.length === 0) continue;
    if (cells.every(cell => /^:?-+:?$/.test(cell))) continue;
    if (!headerSeen && cells.some(cell => cell.includes('时段'))) {
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
  return filled.every(cell => !/待填|TODO|示例/.test(cell));
}

export function validatePhaseA(markdown) {
  const {data, body} = parseFrontMatter(markdown);
  const issues = [];
  for (const heading of REQUIRED_HEADINGS) {
    const found = new RegExp(`^#{1,6}\\s+.*${heading}`, 'm').test(body);
    if (!found) issues.push({id: 'missing_heading', detail: heading});
  }
  for (const beat of BEATS) {
    if (!body.includes(beat)) issues.push({id: 'missing_beat', detail: beat});
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
  if (!claim) issues.push({id: 'one_thing_empty', detail: '一件事'});
  const realRows = storyboardDataRows(body).filter(rowIsReal);
  if (realRows.length < 1) issues.push({id: 'storyboard_empty', detail: '需要至少一行写满的 10 秒分镜'});
  return {data, issues, ready: issues.length === 0};
}

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
  const structure = validatePhaseA(markdown);
  const {data} = structure;
  const hash = phaseABodyHash(markdown);
  if (data.status === 'reconstructed' || data.status === 'rejected') {
    return {code: 'PHASE_A_REQUIRED', status: data.status || '', structure, hash};
  }
  if (data.status !== 'approved') {
    return {
      code: structure.ready ? 'PHASE_A_READY_FOR_REVIEW' : 'PHASE_A_INCOMPLETE',
      status: data.status || 'draft',
      structure,
      hash,
    };
  }
  if (!structure.ready) return {code: 'PHASE_A_INCOMPLETE', status: 'approved', structure, hash};
  const by = String(data.approved_by || '').trim();
  const at = String(data.approved_at || '').trim();
  if (!by || !/\d{4}-\d{2}-\d{2}/.test(at)) {
    return {code: 'PHASE_A_REQUIRED', status: 'approved', structure, hash};
  }
  if (data.approved_body_sha256 !== hash || !scopeMatches(data)) {
    return {code: 'PHASE_A_STALE', status: 'approved', structure, hash};
  }
  return {code: 'PHASE_A_APPROVED', status: 'approved', structure, hash};
}

export const METRICS_EXCEPTION_SENTENCE = '本集没有可回填的播放数据。留空。禁止估算。';

export function honorsMetricsException(seriesId, episodeId, phaseMarkdown, metricsMarkdown) {
  if (seriesId !== 'invisible-rules' || episodeId !== 'ep01') return false;
  const {data} = parseFrontMatter(phaseMarkdown);
  if (data.metrics_exception !== true) return false;
  return String(metricsMarkdown || '').includes(METRICS_EXCEPTION_SENTENCE);
}
