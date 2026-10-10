import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {previousMetricsBlock, fileExists} from './qc/checks.mjs';

const studioRoot = fileURLToPath(new URL('.', import.meta.url));

const COPIES = [
  ['README.md', 'templates/episode_README.md'],
  ['fact_card.md', 'templates/fact_card.md'],
  ['phase_a.md', 'templates/phase_a.md'],
  ['script.md', 'templates/script.md'],
  ['lines.json', 'templates/lines.json'],
  ['post/metrics.md', 'templates/metrics.md'],
  ['sim/README.md', 'templates/sim_README.md'],
  ['qc/checklist.json', 'qc/checklist.json'],
];

function fill(template, vars) {
  return template.replace(/\{\{(series|episode)\}\}/g, (_, key) => vars[key]);
}

export async function initEpisode(seriesDir, episodeId) {
  if (!/^ep\d{2}$/.test(episodeId)) {
    throw Object.assign(new Error('Episode id must look like ep02'), {code: 'BAD_EPISODE'});
  }
  if (!(await fileExists(seriesDir))) {
    throw Object.assign(new Error(`Series directory does not exist: ${seriesDir}`), {code: 'BAD_SERIES'});
  }
  const previous = await previousMetricsBlock(seriesDir, episodeId);
  if (previous.code === 'METRICS_REQUIRED') {
    throw Object.assign(new Error(
      `${previous.previousId} 的 post/metrics.md 还没有带来源的实填指标。没有平台数据就留空，不要估算；留空时不能开下一集选题。`,
    ), {code: 'METRICS_REQUIRED', previous});
  }
  const dest = path.join(seriesDir, episodeId);
  if (await fileExists(dest)) {
    throw Object.assign(new Error(`Episode already exists: ${dest}`), {code: 'EPISODE_EXISTS'});
  }
  const vars = {series: path.basename(seriesDir), episode: episodeId};
  for (const [target, source] of COPIES) {
    const raw = await fs.readFile(path.join(studioRoot, source), 'utf8');
    const out = path.join(dest, target);
    await fs.mkdir(path.dirname(out), {recursive: true});
    await fs.writeFile(out, fill(raw, vars));
  }
  return {episodeDir: dest, previous: previous.code};
}
