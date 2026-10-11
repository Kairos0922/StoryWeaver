import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {validateBrief} from '../studio/brief.mjs';
import {evaluateCheckpoint} from '../studio/checkpoint.mjs';
import {evaluateTechniques, listTechniques, loadTechnique, validateConceptMachine, validateTechnique} from '../studio/techniques.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const series = path.join(root, 'tests/fixtures/sample-series');

async function copyEpisode() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'sw-tech-'));
  await fs.cp(series, dir, {recursive: true});
  return path.join(dir, 'ep01');
}

async function editBrief(ep, fn) {
  const f = path.join(ep, 'brief.md');
  await fs.writeFile(f, fn(await fs.readFile(f, 'utf8')));
}

test('every registered technique declares fits, avoid, brief section, and known checks', async () => {
  const ids = await listTechniques();
  for (const id of ['concept-machine', 'guess-before-reveal', 'try-it-at-home']) assert.ok(ids.includes(id), id);
  for (const id of ids) {
    const t = await loadTechnique(id);
    assert.equal(t.id, id);
    assert.deepEqual(validateTechnique(t), [], id);
  }
  await assert.rejects(loadTechnique('nope'));
});

test('## Approach is required; concept machine is not', () => {
  const brief = validateBrief('---\naspect: "16:9"\ntarget_duration_s: 40\n---\n## One thing\nx\n');
  assert.ok(brief.issues.some(i => i.id === 'missing_heading' && i.detail === 'Approach'));
  assert.ok(!brief.issues.some(i => /concept/i.test(i.id) || i.detail === 'Concept machine'));
});

test('approach must name known techniques or none, plus a why', () => {
  const ids = md => validateBrief(md).issues.map(i => i.id).filter(i => i.startsWith('approach'));
  assert.deepEqual(ids('## Approach\n- Techniques: (TODO)\n- Why: (TODO)\n').sort(), ['approach_techniques', 'approach_why']);
  assert.deepEqual(ids('## Approach\n- Techniques: marble-magic\n- Why: fun\n'), ['approach_unknown_technique']);
  assert.deepEqual(ids('## Approach\n- Techniques: none\n- Why: a story about patience has no inner mechanism.\n'), []);
});

test('approach none: no technique checks run and the brief passes without a concept machine', async () => {
  const ep = await copyEpisode();
  await editBrief(ep, s => s.replace('- Techniques: concept-machine', '- Techniques: none').replace(/## Concept machine[\s\S]*?(?=## Five-beat)/, ''));
  const r = await evaluateTechniques(ep);
  assert.deepEqual(r.results, []);
  const cp = await evaluateCheckpoint(ep, 'brief');
  assert.ok(!cp.issues.some(i => /concept/.test(i.id)), JSON.stringify(cp.issues));
});

test('selected concept machine: fields and model file are checked', async () => {
  const {issues} = validateConceptMachine('## Concept machine\n- Machine: a marble run\n- Motion: marbles roll\n- Lit subject: the gate, the bell\n- Model: we will see\n');
  assert.deepEqual(issues.map(i => i.id).sort(), ['concept_machine_lit', 'concept_machine_model', 'concept_machine_motion']);
  const ep = await copyEpisode();
  await editBrief(ep, s => s.replace('Model: fact_card.md B1', 'Model: sim/doors.json'));
  const cp = await evaluateCheckpoint(ep, 'brief');
  assert.equal(cp.code, 'BRIEF_INCOMPLETE');
  assert.ok(cp.issues.some(i => i.id === 'concept_machine_model' && /sim\/doors.json/.test(i.detail)));
});

test('guess-before-reveal checks section and line order only when selected', async () => {
  const ep = await copyEpisode();
  await editBrief(ep, s => s.replace('- Techniques: concept-machine', '- Techniques: concept-machine, guess-before-reveal'));
  const r = await evaluateTechniques(ep);
  const ids = r.results.filter(x => !x.ok).map(x => x.id).sort();
  assert.ok(ids.includes('guess_before_reveal_section'));
  assert.ok(ids.includes('guess_before_reveal_order'));
  const briefOnly = await evaluateTechniques(ep, {stage: 'brief'});
  assert.ok(!briefOnly.results.some(x => x.id === 'guess_before_reveal_order'));
});
