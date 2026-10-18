import test from 'node:test';
import assert from 'node:assert/strict';
import {checkDocs, formatSte100} from '../studio/lint/ste100.mjs';

test('the project documentation passes the STE100 mechanical lint', async () => {
  const report = await checkDocs();
  assert.ok(report.ok, formatSte100(report));
});
