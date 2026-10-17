// Doubao / Volcengine speech synthesis, V3 HTTP unidirectional streaming.
//
//   endpoint  https://openspeech.bytedance.com/api/v3/tts/unidirectional
//             (the documented SSE variant is /unidirectional/sse; this adapter retries
//              that path on 404/405 so either URL works)
//   auth      X-Api-Key (new console: DOUBAO_TTS_API_KEY or VOLC_TTS_API_KEY)
//             or X-Api-App-Id + X-Api-Access-Key (legacy: VOLC_TTS_APP_ID/ACCESS_TOKEN)
//   resource  seed-tts-2.0, header X-Api-Resource-Id
//
// The adapter reads secrets from the environment only. It never logs headers or keys.
// It writes the audio file, appends a usage row, and caches by provider+voice+text+emotion+rate.
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {cacheKey} from '../interface.mjs';

export const DEFAULT_ENDPOINT = 'https://openspeech.bytedance.com/api/v3/tts/unidirectional';
export const DEFAULT_RESOURCE_ID = 'seed-tts-2.0';
export const DEFAULT_SPEAKER = 'zh_female_xiaohe_uranus_bigtts';

const EMOTIONS = new Map([
  ['calm', 'narrator'],
  ['serious', 'narrator'],
  ['warm', 'narrator'],
  ['curious', 'narrator'],
  ['narrator', 'narrator'],
  ['storytelling', 'storytelling'],
  ['happy', 'happy'],
  ['pleased', 'pleased'],
  ['sad', 'sad'],
  ['angry', 'angry'],
  ['surprise', 'surprise'],
  ['scare', 'scare'],
  ['hate', 'hate'],
  ['tear', 'tear'],
]);

function authFromEnv() {
  const apiKey = process.env.DOUBAO_TTS_API_KEY || process.env.VOLC_TTS_API_KEY || '';
  const appId = process.env.DOUBAO_TTS_APPID || process.env.VOLC_TTS_APP_ID || '';
  const token = process.env.DOUBAO_TTS_TOKEN || process.env.VOLC_TTS_ACCESS_TOKEN || '';
  if (apiKey) return {headers: {'X-Api-Key': apiKey}, mode: 'api-key'};
  if (appId && token) return {headers: {'X-Api-App-Id': appId, 'X-Api-Access-Key': token}, mode: 'app-id-token'};
  throw Object.assign(new Error(
    'Doubao TTS auth missing. Set DOUBAO_TTS_API_KEY or VOLC_TTS_API_KEY (new console), or VOLC_TTS_APP_ID + VOLC_TTS_ACCESS_TOKEN (legacy). Never put a key in a chat or a file.',
  ), {code: 'TTS_ENV'});
}

function speakerFor(job) {
  const requested = String(job?.voice || '').trim();
  const speaker = requested && requested !== 'dry-run'
    ? requested
    : process.env.DOUBAO_TTS_SPEAKER || DEFAULT_SPEAKER;
  if (!/_uranus_bigtts$/.test(speaker)) {
    throw Object.assign(new Error(
      `seed-tts-2.0 supports *_uranus_bigtts voices only; got ${speaker}. Set DOUBAO_TTS_SPEAKER or the line's voice.`,
    ), {code: 'TTS_VOICE'});
  }
  return speaker;
}

function emotionFor(value) {
  const key = String(value || '').trim().toLowerCase();
  return EMOTIONS.get(key) || '';
}

function requestBody({text, speaker, speechRate, emotion, emotionScale, loudnessRate, uid, format, sampleRate}) {
  const audioParams = {
    format: format || 'mp3',
    sample_rate: Number(sampleRate || 24000),
    speech_rate: Number.isFinite(Number(speechRate)) ? Number(speechRate) : 0,
    loudness_rate: Number.isFinite(Number(loudnessRate)) ? Number(loudnessRate) : 0,
  };
  if (emotion) audioParams.emotion = emotion;
  if (emotionScale != null) audioParams.emotion_scale = Number(emotionScale);
  return {
    user: {uid: uid || 'storyweaver'},
    req_params: {text, speaker, audio_params: audioParams},
  };
}

async function endpointCandidates() {
  const base = String(process.env.DOUBAO_TTS_ENDPOINT || DEFAULT_ENDPOINT).replace(/\/+$/, '');
  const list = [base];
  if (!base.endsWith('/sse')) list.push(`${base}/sse`);
  return list;
}

function parseSseLine(line, state) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('event:') || trimmed.startsWith(':')) return;
  const raw = trimmed.startsWith('data:') ? trimmed.slice(5).trim() : trimmed;
  if (!raw || raw === '[DONE]') return;
  let obj;
  try {
    obj = JSON.parse(raw);
  } catch {
    return;
  }
  const code = Number(obj.code ?? 0);
  if (code === 20000000) {
    state.usage = obj.usage || {};
    return;
  }
  if (code !== 0) {
    throw Object.assign(new Error(`Doubao TTS error code=${code}: ${String(obj.message || '').slice(0, 200)}`), {
      code: 'TTS_API',
      apiCode: code,
    });
  }
  if (obj.data) state.chunks.push(Buffer.from(obj.data, 'base64'));
}

async function readStream(response, state) {
  const decoder = new TextDecoder();
  let buffer = '';
  for await (const chunk of response.body) {
    buffer += decoder.decode(chunk, {stream: true});
    let index;
    while ((index = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, index);
      buffer = buffer.slice(index + 1);
      parseSseLine(line, state);
    }
  }
  buffer += decoder.decode();
  if (buffer.trim()) parseSseLine(buffer, state);
}

async function appendUsage(file, row) {
  await fs.mkdir(path.dirname(file), {recursive: true});
  await fs.appendFile(file, `${JSON.stringify(row)}\n`);
}

export function createAdapter() {
  return {
    name: 'doubao',
    async synthesize(job = {}) {
      const text = String(job.text || '');
      if (!text.trim()) throw Object.assign(new Error('Doubao TTS needs non-empty text'), {code: 'TTS_TEXT'});
      if (!job.outFile) throw Object.assign(new Error('Doubao TTS needs outFile'), {code: 'TTS_OUTPUT'});

      const auth = authFromEnv();
      const speaker = speakerFor(job);
      const emotion = emotionFor(job.emotion);
      const outFile = path.resolve(job.outFile);
      const cacheDir = job.cacheDir ? path.resolve(job.cacheDir) : path.join(path.dirname(outFile), '.tts-cache');
      const key = cacheKey({provider: 'doubao', voice: speaker, text, emotion, speechRate: job.speechRate ?? ''});
      const cacheFile = path.join(cacheDir, `${key}.mp3`);
      const usageFile = job.usageFile || path.join(path.dirname(outFile), 'usage.jsonl');
      const chars = [...text].length;

      await fs.mkdir(path.dirname(outFile), {recursive: true});
      try {
        await fs.access(cacheFile);
        await fs.copyFile(cacheFile, outFile);
        await appendUsage(usageFile, {
          at: new Date().toISOString(), provider: 'doubao', voice: speaker,
          chars, text_words: 0, retake: Boolean(job.retake), cached: true, file: path.basename(outFile),
        });
        return {file: outFile, bytes: (await fs.stat(outFile)).size, chars, text_words: 0, cached: true, voice: speaker, provider: 'doubao'};
      } catch {
        // cache miss
      }

      const body = requestBody({
        text, speaker, speechRate: job.speechRate, emotion,
        emotionScale: job.emotionScale, loudnessRate: job.loudnessRate,
        uid: job.uid, format: job.format || 'mp3', sampleRate: job.sampleRate || 24000,
      });
      const requestId = crypto.randomUUID();
      const state = {chunks: [], usage: {}};
      let response = null;
      let lastError = null;
      for (const url of await endpointCandidates()) {
        const headers = {
          'Content-Type': 'application/json',
          'X-Api-Resource-Id': process.env.DOUBAO_TTS_RESOURCE_ID || DEFAULT_RESOURCE_ID,
          'X-Api-Request-Id': requestId,
          'X-Control-Require-Usage-Tokens-Return': 'text_words',
          ...auth.headers,
        };
        response = await fetch(url, {method: 'POST', headers, body: JSON.stringify(body)});
        if (response.status === 404 || response.status === 405) {
          lastError = new Error(`Doubao TTS endpoint ${url} returned ${response.status}`);
          response = null;
          continue;
        }
        break;
      }
      if (!response) throw Object.assign(lastError || new Error('Doubao TTS endpoint unavailable'), {code: 'TTS_ENDPOINT'});
      if (!response.ok) {
        const detail = await response.text().catch(() => '');
        throw Object.assign(new Error(`Doubao TTS HTTP ${response.status}: ${detail.slice(0, 200)}`), {code: 'TTS_HTTP'});
      }
      await readStream(response, state);
      if (!state.chunks.length) {
        throw Object.assign(new Error('Doubao TTS returned no audio; check resource id and voice generation (seed-tts-2.0 needs *_uranus_bigtts).'), {code: 'TTS_EMPTY'});
      }
      const audio = Buffer.concat(state.chunks);
      await fs.mkdir(path.dirname(cacheFile), {recursive: true});
      await fs.writeFile(cacheFile, audio);
      await fs.writeFile(outFile, audio);
      const textWords = Number(state.usage?.text_words);
      await appendUsage(usageFile, {
        at: new Date().toISOString(), provider: 'doubao', voice: speaker,
        chars, text_words: Number.isFinite(textWords) ? textWords : null,
        retake: Boolean(job.retake), cached: false, file: path.basename(outFile),
      });
      return {
        file: outFile, bytes: audio.length, chars,
        text_words: Number.isFinite(textWords) ? textWords : null,
        cached: false, voice: speaker, provider: 'doubao',
      };
    },
  };
}
