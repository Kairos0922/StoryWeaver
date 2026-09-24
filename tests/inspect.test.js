import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectVideo} from '../src/inspect.js';

test('inspectVideo rejects a missing file',async()=>{
 await assert.rejects(()=>inspectVideo('/definitely/not/a/video.mp4'));
});
