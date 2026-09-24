import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {validateVideoSpec} from '../src/validate.js';
const spec=JSON.parse(await fs.readFile(new URL('../examples/hot-air-balloon.json',import.meta.url)));
test('example is valid',()=>assert.equal(validateVideoSpec(spec),true));
test('duplicate scene id rejected',()=>{const x=structuredClone(spec);x.scenes[1].id=x.scenes[0].id;assert.throws(()=>validateVideoSpec(x))});
test('bad final duration rejected',()=>{const x=structuredClone(spec);x.scenes.at(-1).end=11;assert.throws(()=>validateVideoSpec(x))});
