import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {compileContentPlan} from '../src/compiler.js';
import {validateVideoSpec} from '../src/validate.js';

const root = path.resolve(import.meta.dirname, '..');
const plan = JSON.parse(await fs.readFile(path.join(root, 'experiments/t01-english-colors/content-plan.json'), 'utf8'));

test('T01 compiles to a valid 90-second VideoSpec', () => {
  const spec = compileContentPlan(plan);
  assert.equal(spec.width, 1280);
  assert.equal(spec.height, 720);
  assert.equal(spec.fps, 30);
  assert.equal(spec.duration, 90);
  assert.equal(validateVideoSpec(spec), true);
});

test('T01 is story-first, not lesson-card-first', () => {
  assert.equal(plan.scenes.length, 8);
  assert.deepEqual(plan.scenes.map(s => [s.start, s.end]), [
    [0,10],[10,22],[22,34],[34,46],[46,58],[58,70],[70,82],[82,90]
  ]);
  assert.ok(plan.scenes.some(s => s.beat === 'escalation'));
  assert.ok(plan.scenes.some(s => s.beat === 'reveal'));
  assert.equal(plan.scenes.at(-1).beat, 'payoff');
  assert.equal(plan.scenes.at(-1).id, 'play');
});

test('T01 uses only three target colors and embeds them in the story', () => {
  const text = JSON.stringify(plan).toLowerCase();
  for (const word of ['red', 'blue', 'yellow']) assert.ok(text.includes(word));
  for (const word of ['green', 'purple', 'orange']) assert.equal(text.includes(word), false);
  assert.match(plan.scenes.find(s => s.id === 'blue-box').purpose, /blue/i);
  assert.match(plan.scenes.find(s => s.id === 'yellow-umbrella').purpose, /yellow/i);
  assert.match(plan.scenes.find(s => s.id === 'car-reveal').purpose, /red/i);
});

test('T01 keeps Milo identity stable across every scene', () => {
  const characters = plan.scenes.flatMap(scene => scene.elements).filter(e => e.type === 'character');
  assert.ok(characters.length >= plan.scenes.length);
  assert.ok(characters.every(e => e.characterId === 'milo'));
});

test('T01 has no explicit teaching prompts or recall card', () => {
  const text = JSON.stringify(plan).toLowerCase();
  for (const phrase of ['say it with milo', 'can you remember', 'what color is the ball', 'your turn']) {
    assert.equal(text.includes(phrase), false);
  }
});

test('T01 uses the target sentence naturally inside the story', () => {
  const text = JSON.stringify(plan);
  assert.ok(text.includes("It's blue."));
  assert.ok(text.includes("It's yellow."));
  assert.ok(text.includes("It's red."));
  assert.ok(text.includes("My red car!"));
});

test('T01 ends with story payoff, not a vocabulary review screen', () => {
  const last = plan.scenes.at(-1);
  assert.equal(last.id, 'play');
  assert.match(last.purpose, /drives away happily/i);
  assert.equal(plan.captions.at(-1).text, 'Let\'s go!');
});
