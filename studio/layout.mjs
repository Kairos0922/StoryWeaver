import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {fileExists} from './qc/checks.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));

export const REQUIRED_PATHS = [
  'README.md',
  'docs/studio/README.md',
  'docs/studio/pipeline.md',
  'docs/studio/phase-a.md',
  'docs/studio/avoid.md',
  'docs/studio/metrics.md',
  'docs/studio/migration.md',
  'docs/studio/ep01-retrospective.md',
  '.cursor/skills/produce-next-episode/SKILL.md',
  'studio/cli.mjs',
  'studio/templates/fact_card.md',
  'studio/templates/phase_a.md',
  'studio/templates/script.md',
  'studio/templates/metrics.md',
  'studio/templates/lines.json',
  'studio/lint/rules.json',
  'studio/lint/lint_script.mjs',
  'studio/qc/checklist.json',
  'studio/qc/run_qc.mjs',
  'studio/contracts/visual_contract.md',
  'studio/contracts/voice_contract.md',
  'studio/render/adapters/README.md',
  'studio/render/adapters/manim.md',
  'studio/render/adapters/html-canvas.md',
  'studio/render/adapters/remotion.md',
  'studio/render/adapters/hyperframes.md',
  'studio/render/adapters/legacy-svg.md',
  'studio/render/kit/manifest.json',
  'series/invisible-rules/ip/README.md',
  'series/invisible-rules/ip/characters.json',
  'series/invisible-rules/voice/README.md',
  'series/invisible-rules/ep01/fact_card.md',
  'series/invisible-rules/ep01/script.md',
  'series/invisible-rules/ep01/phase_a.md',
  'series/invisible-rules/ep01/lines.json',
  'series/invisible-rules/ep01/post/metrics.md',
  'src/LEGACY.md',
];

export async function checkLayout(start = root) {
  const missing = [];
  for (const relative of REQUIRED_PATHS) {
    if (!(await fileExists(path.join(start, relative)))) missing.push(relative);
  }
  return {ok: missing.length === 0, missing};
}
