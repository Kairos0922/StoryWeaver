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
  'docs/series-workflow.md',
  'docs/adapters.md',
  'docs/environment.md',
  'docs/lessons.md',
  'docs/visual-rhythm.md',
  'docs/render-contract.md',
  'docs/motion-tokens.md',
  'studio/motion/tokens.js',
  'studio/lint/render_contract.mjs',
  'studio/qc/motion_qc.mjs',
  'skills/produce-video/SKILL.md',
  'studio/cli.mjs',
  'studio/collection.mjs',
  'studio/series/status.mjs',
  'studio/series/audit.mjs',
  'studio/series/deliver.mjs',
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
  'tests/fixtures/sample-series/README.md',
  'tests/fixtures/sample-series/zh-script.md',
  'tests/fixtures/sample-series/ep01/fact_card.md',
  'tests/fixtures/sample-series/ep01/script.md',
  'tests/fixtures/sample-series/ep01/brief.md',
  'tests/fixtures/sample-series/ep01/lines.json',
  'tests/fixtures/sample-series/ep01/render/scenes.json',
  'tests/fixtures/sample-series/ep01/render/rig.json',
  'docs/demo/title-card/README.md',
  'docs/demo/title-card/shot.json',
  'studio/render/browser/dom/README.md',
  'studio/render/browser/dom/gsap_clock.js',
  'studio/render/browser/dom/frame.jsx',
  'studio/render/browser/dom/timing.js',
];

export async function checkLayout(start = root) {
  const missing = [];
  for (const relative of REQUIRED_PATHS) {
    if (!(await fileExists(path.join(start, relative)))) missing.push(relative);
  }
  return {ok: missing.length === 0, missing};
}
