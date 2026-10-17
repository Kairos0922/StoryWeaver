import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {loadAdapter} from '../studio/tts/interface.mjs';

const audio = Buffer.from('ID3 mock audio bytes');
const requests = [];
let server;

test.before(async () => {
  server = http.createServer((req, res) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      requests.push({headers: req.headers, body: JSON.parse(body)});
      res.writeHead(200, {'Content-Type': 'text/event-stream'});
      res.write(`data: ${JSON.stringify({code: 0, message: '', data: audio.toString('base64')})}\n\n`);
      res.write(`data: ${JSON.stringify({code: 20000000, message: 'OK', usage: {text_words: 5}})}\n\n`);
      res.end();
    });
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  process.env.DOUBAO_TTS_ENDPOINT = `http://127.0.0.1:${server.address().port}/api/v3/tts/unidirectional`;
  process.env.VOLC_TTS_API_KEY = 'test-key';
  process.env.DOUBAO_TTS_SPEAKER = 'zh_female_xiaohe_uranus_bigtts';
});

test.after(async () => {
  await new Promise(resolve => server.close(resolve));
  delete process.env.DOUBAO_TTS_ENDPOINT;
  delete process.env.VOLC_TTS_API_KEY;
  delete process.env.DOUBAO_TTS_SPEAKER;
});

test('doubao adapter sends seed-tts-2.0 headers and parses SSE audio', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'sw-doubao-'));
  const outFile = path.join(dir, 'audio', 'line_01.mp3');
  const tts = await loadAdapter('doubao');
  const result = await tts.synthesize({
    text: '奶白汤，白的不是钙。',
    voice: 'zh_female_xiaohe_uranus_bigtts',
    emotion: 'calm',
    speechRate: -12,
    cacheDir: path.join(dir, 'cache'),
    outFile,
  });
  assert.equal(result.bytes, audio.length);
  assert.equal(result.cached, false);
  assert.equal(result.text_words, 5);
  assert.deepEqual(await fs.readFile(outFile), audio);

  assert.equal(requests.length, 1);
  const request = requests[0];
  assert.equal(request.headers['x-api-resource-id'], 'seed-tts-2.0');
  assert.equal(request.headers['x-api-key'], 'test-key');
  assert.equal(request.headers['x-control-require-usage-tokens-return'], 'text_words');
  assert.equal(request.body.req_params.text, '奶白汤，白的不是钙。');
  assert.equal(request.body.req_params.speaker, 'zh_female_xiaohe_uranus_bigtts');
  assert.equal(request.body.req_params.audio_params.format, 'mp3');
  assert.equal(request.body.req_params.audio_params.sample_rate, 24000);
  assert.equal(request.body.req_params.audio_params.speech_rate, -12);
  assert.equal(request.body.req_params.audio_params.emotion, 'narrator');

  const usage = (await fs.readFile(path.join(dir, 'audio', 'usage.jsonl'), 'utf8')).trim().split('\n').map(line => JSON.parse(line));
  assert.equal(usage.length, 1);
  assert.equal(usage[0].text_words, 5);
  assert.equal(usage[0].cached, false);
  assert.ok(!JSON.stringify(usage).includes('test-key'));
});

test('doubao adapter reuses the content cache without a second request', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'sw-doubao-cache-'));
  const outFile = path.join(dir, 'audio', 'line_01.mp3');
  const tts = await loadAdapter('doubao');
  const job = {
    text: '骨骼里的钙，很难溶进汤里。',
    voice: 'zh_female_xiaohe_uranus_bigtts',
    emotion: 'calm',
    speechRate: -12,
    cacheDir: path.join(dir, 'cache'),
    outFile,
  };
  await tts.synthesize(job);
  const before = requests.length;
  const second = await tts.synthesize({...job, outFile: path.join(dir, 'audio', 'line_02.mp3')});
  assert.equal(requests.length, before);
  assert.equal(second.cached, true);
});

test('doubao adapter fails closed without auth', async () => {
  const saved = process.env.VOLC_TTS_API_KEY;
  delete process.env.VOLC_TTS_API_KEY;
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'sw-doubao-noauth-'));
  const tts = await loadAdapter('doubao');
  await assert.rejects(
    () => tts.synthesize({
      text: '测试',
      voice: 'zh_female_xiaohe_uranus_bigtts',
      cacheDir: path.join(dir, 'cache'),
      outFile: path.join(dir, 'audio', 'line_01.mp3'),
    }),
    error => error.code === 'TTS_ENV',
  );
  process.env.VOLC_TTS_API_KEY = saved;
});
