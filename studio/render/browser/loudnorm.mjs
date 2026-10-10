// ffmpeg loudnorm print_format=json can append progress text after the object.
export function parseLoudnormJson(text) {
  const start = text.indexOf('{');
  if (start < 0) throw new Error('loudnorm: no JSON object in ffmpeg output');
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (escape) escape = false;
      else if (ch === '\\') escape = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) return JSON.parse(text.slice(start, i + 1));
    }
  }
  throw new Error('loudnorm: unclosed JSON object in ffmpeg output');
}
