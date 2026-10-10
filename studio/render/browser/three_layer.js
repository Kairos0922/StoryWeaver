// Three.js layer. Transforms are a function of t (spin * t). The renderer is reused;
// it is not advanced by requestAnimationFrame or a clock.
(function (root) {
  'use strict';

  const cache = new WeakMap();

  function build(THREE, layer, w, h) {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      preserveDrawingBuffer: true,
    });
    renderer.setSize(w, h, false);
    renderer.setClearColor(0x000000, 0);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, w / h, 0.1, 80);
    const cam = layer.camera || {};
    const pos = cam.position || [0, 1.1, 4.2];
    const look = cam.look || [0, 0.4, 0];
    camera.position.set(pos[0], pos[1], pos[2]);
    camera.lookAt(look[0], look[1], look[2]);
    scene.add(new THREE.AmbientLight(0xffffff, 0.72));
    const key = new THREE.DirectionalLight(0xfff4e5, 1.15);
    key.position.set(2.4, 4.2, 3.1);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xc9d7e8, 0.35);
    fill.position.set(-3, 1.5, -2);
    scene.add(fill);
    const group = new THREE.Group();
    for (const obj of layer.objects || []) {
      let geo;
      if (obj.type === 'sphere') geo = new THREE.SphereGeometry(0.5, 40, 28);
      else if (obj.type === 'plane') geo = new THREE.PlaneGeometry(1, 1);
      else geo = new THREE.BoxGeometry(1, 1, 1);
      const mat = new THREE.MeshStandardMaterial({
        color: obj.color || '#d7c4a3',
        roughness: obj.roughness == null ? 0.42 : obj.roughness,
        metalness: obj.metalness == null ? 0.05 : obj.metalness,
      });
      const mesh = new THREE.Mesh(geo, mat);
      const p = obj.position || [0, 0, 0];
      const s = obj.scale || [1, 1, 1];
      mesh.position.set(p[0], p[1], p[2]);
      mesh.scale.set(s[0], s[1], s[2]);
      mesh.userData.base = obj.rotation || [0, 0, 0];
      mesh.userData.spin = obj.spin || 0;
      group.add(mesh);
    }
    scene.add(group);
    return {renderer, scene, camera, group, canvas};
  }

  function draw(ctx, layer, t, w, h) {
    const THREE = root.THREE;
    if (!THREE) throw new Error('This shot has a Three.js layer, but Three.js did not load.');
    let state = cache.get(layer);
    if (!state || state.canvas.width !== w || state.canvas.height !== h) {
      state = build(THREE, layer, w, h);
      cache.set(layer, state);
    }
    state.group.rotation.y = (layer.spin || 0) * t;
    for (const mesh of state.group.children) {
      const base = mesh.userData.base;
      mesh.rotation.set(base[0], base[1] + mesh.userData.spin * t, base[2]);
    }
    state.renderer.render(state.scene, state.camera);
    ctx.drawImage(state.canvas, 0, 0, w, h);
  }

  root.SWThree = {draw};
})(typeof globalThis !== 'undefined' ? globalThis : this);
