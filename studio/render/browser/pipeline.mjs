import path from 'node:path';
import {buildEpisode} from '../kit/canvas/build_episode.mjs';
import {renderShotFixture} from './shot_preview.mjs';
import {isShotFixture} from './validate_shot.mjs';

/**
 * The only render pipeline: Playwright captures seek(t) frames, ffmpeg encodes them.
 * A shot may stack Canvas 2D, SVG/DOM, and Three.js. Every frame then runs the WebGL post pass.
 */
export async function renderEpisode(episodeDir, options = {}) {
  const review = options.review || (options.mode === 'release' || options.mode === 'draft' ? options.mode : 'draft');
  const cut = options.cut || (options.mode === 'preview' || options.mode === 'hook' || options.mode === 'full' ? options.mode : 'preview');
  return buildEpisode(path.resolve(episodeDir), {
    ...options,
    review,
    mode: cut,
  });
}

export async function renderDirectory(dir, options = {}) {
  const resolved = path.resolve(dir);
  if (await isShotFixture(resolved)) return renderShotFixture(resolved, options);
  return renderEpisode(resolved, options);
}
