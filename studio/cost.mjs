import fs from 'node:fs/promises';
import path from 'node:path';
import {fileExists} from './qc/checks.mjs';

export const LIST_PRICE_CNY_PER_10K = 3;

function asNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function costFromUsage(entries, {renders = 1, modelCalls = null} = {}) {
  let ttsChars = 0;
  let billedTakes = 0;
  let billedRetakes = 0;
  let sawRetakeFlag = false;
  for (const row of entries || []) {
    const chars = asNumber(row.chars ?? row.characters ?? (row.text ? [...String(row.text)].length : 0));
    ttsChars += chars;
    if (row.retake === true || row.kind === 'retake') {
      sawRetakeFlag = true;
      billedRetakes += chars;
    } else if (row.retake === false || row.kind === 'take') {
      sawRetakeFlag = true;
      billedTakes += chars;
    }
  }
  const denom = billedTakes + billedRetakes;
  const rerecord = sawRetakeFlag && denom > 0 ? +(billedRetakes / denom).toFixed(4) : null;
  return {
    tts_chars: ttsChars,
    tts_cny: +((ttsChars / 10000) * LIST_PRICE_CNY_PER_10K).toFixed(4),
    list_price_cny_per_10k_chars: LIST_PRICE_CNY_PER_10K,
    renders,
    rerecord_ratio: rerecord,
    model_calls: modelCalls == null ? null : modelCalls,
  };
}

async function readUsage(episodeDir) {
  const file = path.join(episodeDir, 'audio', 'usage.jsonl');
  if (!(await fileExists(file))) return [];
  const text = await fs.readFile(file, 'utf8');
  const rows = [];
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) continue;
    rows.push(JSON.parse(line));
  }
  return rows;
}

async function countReports(episodeDir) {
  const root = path.join(episodeDir, 'out');
  if (!(await fileExists(root))) return 0;
  let count = 0;
  const walk = async dir => {
    const entries = await fs.readdir(dir, {withFileTypes: true});
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) await walk(full);
      else if (entry.name === 'render_report.json') count += 1;
    }
  };
  await walk(root);
  return count;
}

export async function buildCost(episodeDir, {modelCalls = null} = {}) {
  const entries = await readUsage(episodeDir);
  const prior = await countReports(episodeDir);
  return costFromUsage(entries, {renders: prior + 1, modelCalls});
}
