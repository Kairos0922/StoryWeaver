import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {compileContentPlan} from '../src/compiler.js';
import {validateVideoSpec} from '../src/validate.js';

const root = path.resolve(import.meta.dirname, '..');
const plan = JSON.parse(await fs.readFile(path.join(root, 'experiments/t01-english-colors/content-plan.json'), 'utf8'));

test('T01 compiles to a valid VideoSpec', () => {
  const spec = compileContentPlan(plan);
  assert.equal(spec.width, 1280);
  assert.equal(spec.height, 720);
  assert.equal(spec.fps, 30);
  assert.equal(spec.duration, 90);
  assert.equal(validateVideoSpec(spec), true);
});

test('T01 teaches only three target color words', () => {
  const text = JSON.stringify(plan).toLowerCase();
  for (const word of ['red', 'blue', 'yellow']) assert.ok(text.includes(word));
  for (const word of ['green', 'purple', 'orange', 'black', 'white']) assert.equal(text.includes(word), false);
});

test('T01 keeps the recurring guide identity stable', () => {
  const characters = plan.scenes
    .flatMap(scene => scene.elements)
    .filter(element => element.type === 'character');
  assert.ok(characters.length >= plan.scenes.length);
  assert.ok(characters.every(character => character.characterId === 'milo'));
});

test('T01 has continuous beats and explicit learning progression', () => {
  assert.deepEqual(plan.beats.map(b => b.time), [0,8,18,28,38,48,58,68,80]);
  assert.equal(plan.scenes[0].beat, 'hook');
  assert.equal(plan.scenes.at(-1).beat, 'payoff');
  assert.ok(plan.scenes.filter(scene => scene.beat === 'reveal').length === 3);
  assert.ok(plan.scenes.filter(scene => scene.beat === 'explanation').length === 3);
  assert.equal(plan.scenes.at(-2).beat, 'proof');
});
