import fs from 'node:fs/promises';
import path from 'node:path';
import {compileContentPlan} from '../../src/compiler.js';

const root = path.resolve(import.meta.dirname);
const plan = JSON.parse(await fs.readFile(path.join(root, 'content-plan.json'), 'utf8'));
const spec = compileContentPlan(plan);
await fs.writeFile(path.join(root, 'video-spec.json'), JSON.stringify(spec, null, 2) + '\n');
console.log('COMPILED', path.join(root, 'video-spec.json'));
