// WebGL2 post pass. Every pixel is a function of the source frame, the preset, and t.
// Grain uses a fixed hash of (seed, pixel, frame index). No unseeded generator and no wall clock.
(function (root) {
  'use strict';

  function clamp01(v) {
    return Math.min(1, Math.max(0, v));
  }

  // Same formula the composite shader uses, so a CPU check and a GPU frame agree on the grade.
  function gradePixel(rgb, preset, uv) {
    const lift = preset.lift || [0, 0, 0];
    const gamma = preset.gamma || [1, 1, 1];
    const gain = preset.gain || [1, 1, 1];
    const temp = preset.temperature || 0;
    let r = rgb[0] + temp;
    let g = rgb[1];
    let b = rgb[2] - temp;
    const curve = (v, i) => {
      const lifted = v + lift[i] * (1 - v);
      const curved = Math.pow(Math.max(0, lifted), 1 / Math.max(0.01, gamma[i]));
      return curved * gain[i];
    };
    r = curve(r, 0);
    g = curve(g, 1);
    b = curve(b, 2);
    const l = r * 0.2126 + g * 0.7152 + b * 0.0722;
    const sat = preset.saturation == null ? 1 : preset.saturation;
    r = l + (r - l) * sat;
    g = l + (g - l) * sat;
    b = l + (b - l) * sat;
    if (uv && preset.vignette) {
      const dx = uv[0] - 0.5;
      const dy = uv[1] - 0.5;
      const d = Math.sqrt(dx * dx + dy * dy);
      const vig = 1 - preset.vignette * Math.min(1, Math.max(0, (d - 0.2) / 0.7));
      r *= vig;
      g *= vig;
      b *= vig;
    }
    return [clamp01(r), clamp01(g), clamp01(b)];
  }

  function grainUnit(seed, x, y, frame) {
    const n = x * 127.1 + y * 311.7 + frame * 17.13 + Number(seed || 1);
    const s = Math.sin(n) * 43758.5453123;
    return (s - Math.floor(s)) * 2 - 1;
  }

  const VS = `#version 300 es
layout(location=0) in vec2 a_pos;
out vec2 v_uv;
void main() {
  v_uv = a_pos * 0.5 + 0.5;
  gl_Position = vec4(a_pos, 0.0, 1.0);
}`;

  const THRESHOLD = `#version 300 es
precision highp float;
uniform sampler2D u_tex;
uniform float u_threshold;
in vec2 v_uv;
out vec4 outColor;
void main() {
  vec3 c = texture(u_tex, v_uv).rgb;
  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
  float m = smoothstep(u_threshold, u_threshold + 0.18, l);
  outColor = vec4(c * m, 1.0);
}`;

  const BLUR = `#version 300 es
precision highp float;
uniform sampler2D u_tex;
uniform vec2 u_dir;
uniform vec2 u_texel;
in vec2 v_uv;
out vec4 outColor;
void main() {
  vec2 delta = u_dir * u_texel;
  vec3 c = texture(u_tex, v_uv).rgb * 0.227027;
  c += texture(u_tex, v_uv + delta * 1.384615).rgb * 0.316216;
  c += texture(u_tex, v_uv - delta * 1.384615).rgb * 0.316216;
  c += texture(u_tex, v_uv + delta * 3.230769).rgb * 0.070270;
  c += texture(u_tex, v_uv - delta * 3.230769).rgb * 0.070270;
  outColor = vec4(c, 1.0);
}`;

  const COMPOSITE = `#version 300 es
precision highp float;
uniform sampler2D u_scene;
uniform sampler2D u_bloomTex;
uniform vec3 u_lift;
uniform vec3 u_gamma;
uniform vec3 u_gain;
uniform float u_saturation;
uniform float u_temperature;
uniform float u_bloom;
uniform float u_grain;
uniform float u_vignette;
uniform float u_seed;
uniform float u_frame;
in vec2 v_uv;
out vec4 outColor;
void main() {
  vec3 c = texture(u_scene, v_uv).rgb + texture(u_bloomTex, v_uv).rgb * u_bloom;
  c.r += u_temperature;
  c.b -= u_temperature;
  c = c + u_lift * (1.0 - c);
  c = pow(max(c, vec3(0.0)), 1.0 / max(u_gamma, vec3(0.01))) * u_gain;
  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
  c = mix(vec3(l), c, u_saturation);
  float d = distance(v_uv, vec2(0.5));
  float vig = 1.0 - u_vignette * clamp((d - 0.2) / 0.7, 0.0, 1.0);
  c *= vig;
  float n = gl_FragCoord.x * 127.1 + gl_FragCoord.y * 311.7 + u_frame * 17.13 + u_seed;
  float g = fract(sin(n) * 43758.5453123) * 2.0 - 1.0;
  c += g * u_grain;
  outColor = vec4(clamp(c, 0.0, 1.0), 1.0);
}`;

  function compile(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      throw new Error(gl.getShaderInfoLog(shader) || 'shader compile failed');
    }
    return shader;
  }

  function program(gl, fragment) {
    const prog = gl.createProgram();
    gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VS));
    gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, fragment));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      throw new Error(gl.getProgramInfoLog(prog) || 'program link failed');
    }
    return prog;
  }

  function makeTarget(gl, w, h) {
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    const fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    if (status !== gl.FRAMEBUFFER_COMPLETE) throw new Error(`post framebuffer incomplete: ${status}`);
    return {tex, fbo, w, h};
  }

  function createProcessor(canvas, width, height) {
    const gl = canvas.getContext('webgl2', {
      alpha: false,
      antialias: false,
      preserveDrawingBuffer: true,
      premultipliedAlpha: false,
    });
    if (!gl) throw new Error('WebGL2 is required for the post pass. Headless Chromium needs a software GL backend.');
    const scene = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, scene);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    const halfW = Math.max(1, width >> 1);
    const halfH = Math.max(1, height >> 1);
    const bright = makeTarget(gl, halfW, halfH);
    const blur = makeTarget(gl, halfW, halfH);
    const threshold = program(gl, THRESHOLD);
    const blurProg = program(gl, BLUR);
    const composite = program(gl, COMPOSITE);
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);

    function draw(prog) {
      gl.useProgram(prog);
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    function apply(sourceCanvas, t, fps, preset) {
      const frame = Math.round(Number(t) * Number(fps || 30));
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.bindTexture(gl.TEXTURE_2D, scene);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, sourceCanvas);

      gl.bindFramebuffer(gl.FRAMEBUFFER, bright.fbo);
      gl.viewport(0, 0, bright.w, bright.h);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, scene);
      gl.useProgram(threshold);
      gl.uniform1i(gl.getUniformLocation(threshold, 'u_tex'), 0);
      gl.uniform1f(gl.getUniformLocation(threshold, 'u_threshold'), preset.bloomThreshold ?? 0.8);
      draw(threshold);

      const ping = [
        {from: bright, to: blur, dir: [1, 0]},
        {from: blur, to: bright, dir: [0, 1]},
      ];
      for (const pass of ping) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, pass.to.fbo);
        gl.viewport(0, 0, pass.to.w, pass.to.h);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, pass.from.tex);
        gl.useProgram(blurProg);
        gl.uniform1i(gl.getUniformLocation(blurProg, 'u_tex'), 0);
        gl.uniform2f(gl.getUniformLocation(blurProg, 'u_dir'), pass.dir[0], pass.dir[1]);
        gl.uniform2f(gl.getUniformLocation(blurProg, 'u_texel'), 1 / pass.from.w, 1 / pass.from.h);
        draw(blurProg);
      }

      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, width, height);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, scene);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, bright.tex);
      gl.useProgram(composite);
      const loc = name => gl.getUniformLocation(composite, name);
      gl.uniform1i(loc('u_scene'), 0);
      gl.uniform1i(loc('u_bloomTex'), 1);
      gl.uniform3fv(loc('u_lift'), preset.lift || [0, 0, 0]);
      gl.uniform3fv(loc('u_gamma'), preset.gamma || [1, 1, 1]);
      gl.uniform3fv(loc('u_gain'), preset.gain || [1, 1, 1]);
      gl.uniform1f(loc('u_saturation'), preset.saturation == null ? 1 : preset.saturation);
      gl.uniform1f(loc('u_temperature'), preset.temperature || 0);
      gl.uniform1f(loc('u_bloom'), preset.bloom || 0);
      gl.uniform1f(loc('u_grain'), preset.grain || 0);
      gl.uniform1f(loc('u_vignette'), preset.vignette || 0);
      gl.uniform1f(loc('u_seed'), Number(preset.seed || 1));
      gl.uniform1f(loc('u_frame'), frame);
      draw(composite);
      gl.flush();
    }

    return {apply, gl};
  }

  root.SWPost = {gradePixel, grainUnit, createProcessor};
})(typeof globalThis !== 'undefined' ? globalThis : this);
