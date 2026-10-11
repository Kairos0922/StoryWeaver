import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));

test('package-lock.json version matches package.json', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  const lockPath = path.join(root, 'package-lock.json');
  assert.ok(fs.existsSync(lockPath), 'package-lock.json must be committed');
  const lock = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
  assert.equal(lock.version, pkg.version, 'lockfile root version');
  assert.equal(lock.packages?.['']?.version, pkg.version, 'lockfile packages[""].version');
  assert.equal(lock.name, pkg.name);
  assert.equal(lock.packages?.['']?.name, pkg.name);
});
