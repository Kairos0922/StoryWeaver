import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {fileExists} from './qc/checks.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));

export const REQUIRED_PATHS = [
  'README.md',
  'AGENTS.md',
  'CHANGELOG.md',
  '.env.example',
  'docs/methodology.md',
  'docs/workflow.md',
  'docs/adapters.md',
  'docs/environment.md',
  'docs/lessons.md',
  'docs/visual-rhythm.md',
  'skills/produce-video/SKILL.md',
  'studio/cli.mjs',
  'studio/templates/fact_card.md',
  'studio/templates/brief.md',
  'studio/templates/script.md',
  'studio/templates/metrics.md',
  'studio/templates/lines.json',
  'studio/lint/packs/en.json',
  'studio/lint/packs/zh.json',
  'studio/lint/lint_script.mjs',
  'studio/qc/checklist.json',
  'studio/qc/run_qc.mjs',
  'studio/contracts/visual_contract.md',
  'studio/contracts/voice_contract.md',
  'studio/tts/interface.mjs',
  'studio/render/adapters/README.md',
  'studio/render/adapters/html-canvas.md',
  'studio/render/browser/pipeline.mjs',
  'studio/render/browser/post.js',
  'studio/render/browser/compositor.js',
  'studio/render/browser/presets.json',
  'studio/render/kit/manifest.json',
  'examples/invisible-rules/README.md',
  'examples/invisible-rules/ip/README.md',
  'examples/invisible-rules/ip/characters.json',
  'examples/invisible-rules/voice/README.md',
  'examples/invisible-rules/ep01/fact_card.md',
  'examples/invisible-rules/ep01/script.md',
  'examples/invisible-rules/ep01/brief.md',
  'examples/invisible-rules/ep01/lines.json',
  'examples/invisible-rules/ep01/post/metrics.md',
];

export async function checkLayout(start = root) {
  const missing = [];
  for (const relative of REQUIRED_PATHS) {
    if (!(await fileExists(path.join(start, relative)))) missing.push(relative);
  }
  return {ok: missing.length === 0, missing};
}
